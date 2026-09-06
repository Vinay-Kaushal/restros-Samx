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
paymentsRouter.post("/r/:slug/orders/:orderId/create-payment", async (req, res) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "PENDING_PAYMENT") {
    return res.status(409).json({ error: "This order isn't awaiting payment" });
  }

  const totalPaise = order.items.reduce(
    (sum, item) => sum + Math.round(Number(item.priceAtOrder) * item.quantity * 100),
    0
  );

  const razorpayOrder = await razorpay.orders.create({
    amount: totalPaise,
    currency: "INR",
    receipt: order.id,
    notes: { orderId: order.id, restaurantId: order.restaurantId }
  });

  res.json({
    razorpayOrderId: razorpayOrder.id,
    amount: totalPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID
  });
});

// POST /api/webhooks/razorpay
// This is the actual source of truth for "did the payment succeed" - not
// the frontend's checkout success callback, which can be spoofed, or lost
// if the customer closes the tab mid-payment (plan Section 8).
paymentsRouter.post("/webhooks/razorpay", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const rawBody = (req as any).rawBody as string | undefined;

  if (!signature || !rawBody || !verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = req.body;

  if (event.event === "payment.captured") {
    const razorpayOrderId = event.payload.payment.entity.order_id;
    const orderId = event.payload.payment.entity.notes?.orderId;
    if (!orderId) return res.status(400).json({ error: "Missing orderId in payment notes" });

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: "RECEIVED" },
      include: { items: true }
    });

    // Only now - once payment is genuinely confirmed - does this order
    // count toward the live demand ticker, matching the same rule the
    // pay-at-counter path already follows in orders.ts.
    for (const item of order.items) {
      const key = demandKey(order.restaurantId, order.mealSlotId, item.menuItemId);
      const count = await redis.incrby(key, item.quantity);
      await redis.expire(key, 60 * 60);
      broadcastToRestaurant(order.restaurantId, {
        type: "demand:update",
        restaurantId: order.restaurantId,
        mealSlotId: order.mealSlotId,
        menuItemId: item.menuItemId,
        count
      });
    }

    broadcastToRestaurant(order.restaurantId, { type: "order:new", restaurantId: order.restaurantId, order: order as any });
    broadcastToRestaurant(order.restaurantId, {
      type: "order:status_changed",
      restaurantId: order.restaurantId,
      orderId: order.id,
      status: "RECEIVED"
    });
  }

  if (event.event === "payment.failed") {
    const orderId = event.payload.payment.entity.notes?.orderId;
    if (orderId) {
      await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    }
  }

  res.json({ received: true });
});
