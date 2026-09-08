import crypto from "crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { razorpay, verifyWebhookSignature } from "../lib/razorpay";
import { broadcastToRestaurant } from "../realtime/ws";
import { redis, demandKey } from "../lib/redis";

export const paymentsRouter = Router();

// POST /api/r/:slug/orders/:orderId/create-payment
// Called right after order creation when paymentMethod === "ONLINE". Creates
// the actual Razorpay order server-side (never trust a client-supplied
// amount) and hands back what the frontend needs to open the checkout widget.
paymentsRouter.post(
  "/r/:slug/orders/:orderId/create-payment",
  async (req, res) => {
    if (!razorpay) {
      return res.status(503).json({
        error: "Online payment isn't configured on this server yet",
      });
    }

    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    if (order.status !== "PENDING_PAYMENT") {
      return res.status(409).json({
        error: "This order isn't awaiting payment",
      });
    }

    const totalPaise = order.items.reduce(
      (sum, item) =>
        sum +
        Math.round(
          Number(item.priceAtOrder) *
            item.quantity *
            100,
        ),
      0,
    );

    // Check if this order already has an active payment
    const existingPayment = await prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: {
          in: ["CREATED", "AUTHORIZED"],
        },
      },
    });

    if (existingPayment) {
      return res.json({
        razorpayOrderId: existingPayment.providerOrderId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: order.id,
      notes: {
        orderId: order.id,
        restaurantId: order.restaurantId,
      },
    });

    // Save payment in database
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "RAZORPAY",
        status: "CREATED",
        providerOrderId: razorpayOrder.id,
        amount: totalPaise,
        currency: "INR",
      },
    });

    return res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: totalPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  },
);

// POST /api/r/:slug/orders/:orderId/verify-payment

paymentsRouter.post(
  "/r/:slug/orders/:orderId/verify-payment",
  async (req, res) => {
    const { orderId } = req.params;

    const {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

    if (
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return res.status(400).json({
        error: "Missing Razorpay payment verification fields",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: {
        orderId,
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        error: "Payment record not found",
      });
    }

    // Never trust the Razorpay order ID supplied by the browser.
    // Use the provider order ID stored in our database.
    if (payment.providerOrderId !== razorpayOrderId) {
      return res.status(400).json({
        error: "Razorpay order does not match this payment",
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(503).json({
        error: "Razorpay is not configured on this server",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${payment.providerOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(razorpaySignature, "utf8");

    if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
     return res.status(400).json({
     error: "Invalid payment signature",
     });
    }

    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        providerPaymentId: razorpayPaymentId,
        status: "AUTHORIZED",
      },
    });

    return res.json({
      verified: true,
    });
  },
);


// POST /api/webhooks/razorpay
// This is the actual source of truth for "did the payment succeed" - not
// the frontend's checkout success callback, which can be spoofed, or lost
// if the customer closes the tab mid-payment (plan Section 8).


paymentsRouter.post("/webhooks/razorpay", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as
      | string
      | undefined;

    const eventId = req.headers["x-razorpay-event-id"] as
      | string
      | undefined;

    const rawBody = (req as any).rawBody as string | undefined;

    // 1. Verify webhook signature
    if (
      !signature ||
      !rawBody ||
      !verifyWebhookSignature(rawBody, signature)
    ) {
      return res.status(400).json({
        error: "Invalid webhook signature",
      });
    }

    // 2. Razorpay event ID is required for idempotency
    if (!eventId) {
      return res.status(400).json({
        error: "Missing Razorpay event ID",
      });
    }

    const event = req.body;

    if (!event?.event) {
      return res.status(400).json({
        error: "Invalid webhook event",
      });
    }

    // 3. Ignore duplicate webhook deliveries
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: "RAZORPAY",
          eventId,
        },
      },
    });

    if (existingEvent) {
      return res.json({
        received: true,
        duplicate: true,
      });
    }

    // 4. Record the webhook event
    await prisma.webhookEvent.create({
      data: {
        provider: "RAZORPAY",
        eventId,
        eventType: event.event,
      },
    });

    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      await prisma.webhookEvent.update({
        where: {
          provider_eventId: {
            provider: "RAZORPAY",
            eventId,
          },
        },
        data: {
          processedAt: new Date(),
        },
      });

      return res.json({
        received: true,
      });
    }

    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({
        error: "Invalid Razorpay payment payload",
      });
    }

    // 5. Find OUR payment using Razorpay's order ID
    //    Do NOT use payment notes to identify the order.
    const payment = await prisma.payment.findUnique({
      where: {
        providerOrderId: razorpayOrderId,
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!payment) {
      await prisma.webhookEvent.update({
        where: {
          provider_eventId: {
            provider: "RAZORPAY",
            eventId,
          },
        },
        data: {
          processedAt: new Date(),
        },
      });

      return res.json({
        received: true,
      });
    }

    // 6. Verify amount and currency
    if (
      paymentEntity.amount !== payment.amount ||
      paymentEntity.currency !== payment.currency
    ) {
      return res.status(400).json({
        error: "Payment amount or currency mismatch",
      });
    }

    // 7. PAYMENT CAPTURED
    if (event.event === "payment.captured") {
      const order = await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            providerPaymentId: razorpayPaymentId,
            status: "CAPTURED",
          },
        });

        const updatedOrder = await tx.order.update({
          where: {
            id: payment.orderId,
          },
          data: {
            status: "RECEIVED",
          },
          include: {
            items: true,
          },
        });

        await tx.webhookEvent.update({
          where: {
            provider_eventId: {
              provider: "RAZORPAY",
              eventId,
            },
          },
          data: {
            processedAt: new Date(),
          },
        });

        return updatedOrder;
      });

      // 8. Update live demand
      for (const item of order.items) {
        const key = demandKey(
          order.restaurantId,
          order.mealSlotId,
          item.menuItemId,
        );

        const count = await redis.incrby(
          key,
          item.quantity,
        );

        await redis.expire(key, 60 * 60);

        broadcastToRestaurant(
          order.restaurantId,
          {
            type: "demand:update",
            restaurantId: order.restaurantId,
            mealSlotId: order.mealSlotId,
            menuItemId: item.menuItemId,
            count,
          },
        );
      }

      // 9. Tell admin/kitchen about the new paid order
      broadcastToRestaurant(
        order.restaurantId,
        {
          type: "order:new",
          restaurantId: order.restaurantId,
          order: order as any,
        },
      );

      broadcastToRestaurant(
        order.restaurantId,
        {
          type: "order:status_changed",
          restaurantId: order.restaurantId,
          orderId: order.id,
          status: "RECEIVED",
        },
      );
    }

    // 10. PAYMENT FAILED
    if (event.event === "payment.failed") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            providerPaymentId: razorpayPaymentId,
            status: "FAILED",
            failureCode:
              paymentEntity.error_code ?? null,
            failureDescription:
              paymentEntity.error_description ?? null,
          },
        });

        await tx.webhookEvent.update({
          where: {
            provider_eventId: {
              provider: "RAZORPAY",
              eventId,
            },
          },
          data: {
            processedAt: new Date(),
          },
        });
      });

      // IMPORTANT:
      // Do NOT cancel the order.
      // It stays PENDING_PAYMENT so the customer can retry.
    }

    // 11. Other Razorpay events
    if (
      event.event !== "payment.captured" &&
      event.event !== "payment.failed"
    ) {
      await prisma.webhookEvent.update({
        where: {
          provider_eventId: {
            provider: "RAZORPAY",
            eventId,
          },
        },
        data: {
          processedAt: new Date(),
        },
      });
    }

    return res.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error,
    );

    return res.status(500).json({
      error: "Webhook processing failed",
    });
  }
});
