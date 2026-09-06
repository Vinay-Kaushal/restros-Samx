import { Worker } from "bullmq";
import { prisma } from "../lib/prisma";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

// Run this as a separate process: `bun run worker`
// (kept separate from the API process so a slow job never blocks a request)
new Worker(
  "scheduler",
  async (job) => {
    if (job.name === "check-meal-slot-cutoffs") {
      // Placeholder: this is where you'd flip a "closed" flag, send a
      // "kitchen is now prepping lunch" notification to admins, etc.
      // Left intentionally minimal here since the actual ordering cutoff is
      // already enforced server-side per-request in orders.ts - this job is
      // for side effects, not the source of truth on whether ordering is open.
      const restaurants = await prisma.restaurant.findMany({ select: { id: true } });
      console.log(`[scheduler] checked cutoffs for ${restaurants.length} restaurant(s)`);
    }
  },
  { connection }
);

console.log("Worker started, listening for scheduled jobs...");
