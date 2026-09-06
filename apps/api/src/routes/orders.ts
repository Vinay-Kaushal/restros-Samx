import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { redis, demandKey } from "../lib/redis";
import { broadcastToRestaurant } from "../realtime/ws";
import type { NewOrderEvent, DemandUpdateEvent } from "@repo/types";

export const ordersRouter = Router();

// GET /api/r/:slug/orders - initial state for the admin live dashboard.
// The dashboard loads this once on mount, then relies on the WebSocket
// (order:new / order:status_changed) to stay current after that.
ordersRouter.get("/r/:slug/orders", async (req, res) => {
  const { slug } = req.params;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { menuItem: true } } },
    take: 100
  });

  res.json({ restaurant, orders });
});

// PATCH /api/r/:slug/orders/:orderId/status - staff moving an order through
// received -> preparing -> ready -> delivered.
ordersRouter.patch("/r/:slug/orders/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const statusSchema = z.enum(["RECEIVED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]);
  const parsed = statusSchema.safeParse(req.body?.status);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status" });

  const order = await prisma.order.update({ where: { id: orderId }, data: { status: parsed.data } });

  broadcastToRestaurant(order.restaurantId, {
    type: "order:status_changed",
    restaurantId: order.restaurantId,
    orderId: order.id,
    status: order.status as any
  });

  res.json({ order });
});

const createOrderSchema = z.object({
  tableId: z.string(),
  mealSlotId: z.string(),
  customerName: z.string().min(1),
  phone: z.string().min(6),
  addressOrFlat: z.string().min(1),
  paymentMethod: z.enum(["COUNTER", "ONLINE"]),
  items: z.array(z.object({ menuItemId: z.string(), quantity: z.number().int().positive() })).min(1)
});

// One hour in seconds - how long a demand counter stays "live" before it
// expires. Keeps the badge meaningful ("in the last hour") without needing
// the BullMQ reset job to run for this specific piece of state.
const DEMAND_TTL_SECONDS = 60 * 60;

ordersRouter.post("/r/:slug/orders", async (req, res) => {
  const { slug } = req.params;
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const mealSlot = await prisma.mealSlot.findFirst({
    where: { id: parsed.data.mealSlotId, restaurantId: restaurant.id }
  });
  if (!mealSlot) return res.status(404).json({ error: "Meal slot not found" });

  // Server-side cutoff check - never trust the client's clock (plan Section 3).
  if (isPastCutoff(mealSlot)) {
    return res.status(409).json({ error: "Ordering has closed for this meal slot" });
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.menuItemId) } }
  });
  if (menuItems.length !== parsed.data.items.length) {
    return res.status(400).json({ error: "One or more items are invalid" });
  }

  const status = parsed.data.paymentMethod === "ONLINE" ? "PENDING_PAYMENT" : "RECEIVED";

  const order = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      mealSlotId: mealSlot.id,
      tableId: parsed.data.tableId,
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      addressOrFlat: parsed.data.addressOrFlat,
      paymentMethod: parsed.data.paymentMethod,
      status,
      items: {
        create: parsed.data.items.map((item) => {
          const menuItem = menuItems.find((m) => m.id === item.menuItemId)!;
          return { menuItemId: item.menuItemId, quantity: item.quantity, priceAtOrder: menuItem.price };
        })
      }
    },
    include: { items: true }
  });

  // Only increment the live demand counters once the order is actually
  // confirmed, not for PENDING_PAYMENT orders that might never complete
  // (see Section 8 - Razorpay webhook is the source of truth for those).
  if (status === "RECEIVED") {
    await incrementDemand(restaurant.id, mealSlot.id, parsed.data.items);
  }

  const newOrderEvent: NewOrderEvent = { type: "order:new", restaurantId: restaurant.id, order: order as any };
  broadcastToRestaurant(restaurant.id, newOrderEvent);

  res.status(201).json({ order });
});

async function incrementDemand(
  restaurantId: string,
  mealSlotId: string,
  items: { menuItemId: string; quantity: number }[]
) {
  for (const item of items) {
    const key = demandKey(restaurantId, mealSlotId, item.menuItemId);
    const count = await redis.incrby(key, item.quantity);
    await redis.expire(key, DEMAND_TTL_SECONDS);

    const event: DemandUpdateEvent = {
      type: "demand:update",
      restaurantId,
      mealSlotId,
      menuItemId: item.menuItemId,
      count
    };
    broadcastToRestaurant(restaurantId, event);
  }
}

function isPastCutoff(mealSlot: { endTime: string; cutoffMinutes: number }): boolean {
  const now = new Date();
  const [endHour, endMinute] = mealSlot.endTime.split(":").map(Number);
  const slotEnd = new Date(now);
  slotEnd.setHours(endHour, endMinute, 0, 0);
  const cutoff = new Date(slotEnd.getTime() - mealSlot.cutoffMinutes * 60_000);
  return now > cutoff;
}
