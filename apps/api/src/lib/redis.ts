import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// ioredis requires *separate* connections for normal commands vs. pub/sub -
// a connection in subscribe mode can't run other commands.
export const redis = new Redis(REDIS_URL);
export const redisSub = new Redis(REDIS_URL);
export const redisPub = new Redis(REDIS_URL);

export function demandKey(restaurantId: string, mealSlotId: string, menuItemId: string) {
  return `demand:${restaurantId}:${mealSlotId}:${menuItemId}`;
}

export function ordersChannel(restaurantId: string) {
  return `orders:${restaurantId}`;
}
