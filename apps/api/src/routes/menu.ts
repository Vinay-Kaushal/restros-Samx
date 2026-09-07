import { Router } from "express";
import { prisma } from "../lib/prisma";
import { redis, demandKey } from "../lib/redis";

export const menuRouter = Router();

// GET /api/r/:slug/meal-slots - lets the customer app resolve which meal
// slot is "current" instead of relying on a hardcoded placeholder.
menuRouter.get("/r/:slug/meal-slots", async (req, res) => {
  const { slug } = req.params;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const mealSlots = await prisma.mealSlot.findMany({ where: { restaurantId: restaurant.id } });
  res.json({ mealSlots });
});

// GET /api/r/:slug/menu?mealSlotId=xxx
// Returns categories + items, each item annotated with its current live
// demand count for the requested meal slot (Section 7 of the plan).
menuRouter.get("/r/:slug/menu", async (req, res) => {
  const { slug } = req.params;
  const { mealSlotId } = req.query;

  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
    include: { items: true }
  });

  const withDemand = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      items: await Promise.all(
        category.items.map(async (item) => {
          const count = mealSlotId
            ? Number((await redis.get(demandKey(restaurant.id, String(mealSlotId), item.id))) ?? 0)
            : 0;
          return { ...item, demandCount: count };
        })
      )
    }))
  );

  res.json({ restaurant, categories: withDemand });
});
