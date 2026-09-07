import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

// One queue for the recurring housekeeping jobs mentioned in the plan:
// closing meal slots at cutoff, and clearing stale demand state. The demand
// counters already self-expire via Redis TTL (see orders.ts), so this queue
// is mainly for anything that needs a DB write - notifications, reports, etc.
export const schedulerQueue = new Queue("scheduler", { connection });

export async function scheduleRecurringJobs() {
  await schedulerQueue.add(
    "check-meal-slot-cutoffs",
    {},
    { repeat: { every: 60_000 }, removeOnComplete: true, removeOnFail: true }
  );

  await schedulerQueue.add(
    "expire-stale-pending-payments",
    {},
    { repeat: { every: 60_000 }, removeOnComplete: true, removeOnFail: true }
  );
}
