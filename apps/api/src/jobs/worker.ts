import { Worker } from "bullmq";
import { prisma } from "../lib/prisma";
import { broadcastToRestaurant } from "../realtime/ws";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

const STALE_PAYMENT_MINUTES = 15;

// Run this as a separate process: `bun run worker`
// (kept separate from the API process so a slow job never blocks a request)
new Worker(
  "scheduler",
  async (job) => {
    if (job.name === "check-meal-slot-cutoffs") {
      const restaurants = await prisma.restaurant.findMany({ select: { id: true } });
      console.log(`[scheduler] checked cutoffs for ${restaurants.length} restaurant(s)`);
    }

    if (job.name === "expire-stale-pending-payments") {
      // Ghost order fix: a customer who opens the Razorpay popup and then
      // closes the tab (or the payment just times out) leaves an order
      // stuck in PENDING_PAYMENT forever otherwise - cluttering the admin
      // view and the database permanently. Auto-cancel anything that's
      // been waiting too long.
      const cutoff = new Date(Date.now() - STALE_PAYMENT_MINUTES * 60_000);
      const stale = await prisma.order.findMany({
        where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } }
      });

      for (const order of stale) {
        await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
        broadcastToRestaurant(order.restaurantId, {
          type: "order:status_changed",
          restaurantId: order.restaurantId,
          orderId: order.id,
          status: "CANCELLED"
        });
      }

      if (stale.length > 0) console.log(`[scheduler] expired ${stale.length} stale pending-payment order(s)`);
    }
  },
  { connection }
);

console.log("Worker started, listening for scheduled jobs...");
