import { Router } from "express";
import { prisma } from "../lib/prisma";
import { redis, demandKey } from "../lib/redis";

export const menuRouter = Router();

// GET /api/r/:slug/bootstrap - combines restaurant + meal slots + the
// resolved current-slot menu into a single response. The page used to fire
// two sequential requests (meal-slots, then menu once that resolved) before
// showing anything - this cuts that to one round trip, which is where most
// of the perceived slowness on first load was actually coming from.
menuRouter.get("/r/:slug/bootstrap", async (req, res) => {
  const { slug } = req.params;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const rawMealSlots = await prisma.mealSlot.findMany({ where: { restaurantId: restaurant.id } });
  // Defends against duplicate rows (e.g. a second "lunch" created by hand in
  // Prisma Studio during testing) in addition to giving a stable, predictable
  // left-to-right column order for the landing page.
  const SLOT_ORDER = ["breakfast", "lunch", "dinner"];
  const seenNames = new Set<string>();
  const mealSlots = [...rawMealSlots]
    .sort((a, b) => SLOT_ORDER.indexOf(a.name) - SLOT_ORDER.indexOf(b.name))
    .filter((slot) => (seenNames.has(slot.name) ? false : (seenNames.add(slot.name), true)));
  if (mealSlots.length === 0) return res.status(404).json({ error: "No meal slots configured" });

  function timeToMinutes(t: string) {
    const parts = t.split(":").map(Number);
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  }
  function isSlotOpen(slot: (typeof mealSlots)[number]) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime) - slot.cutoffMinutes;
    return nowMinutes >= start && nowMinutes < end;
  }

  const activeSlot = mealSlots.find(isSlotOpen) ?? mealSlots[0];
  if (!activeSlot) return res.status(404).json({ error: "No meal slots configured" });

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: "asc" },
    include: { items: { where: { isAvailable: true }, include: { mealSlots: true } } }
  });

  // An item with no meal-slot assignment at all is treated as available in
  // every slot (safe default for existing items created before this
  // relation existed) - only items an admin has explicitly scoped to
  // specific slots get filtered out of the others.
  const filterForSlot = (items: (typeof categories)[number]["items"]) =>
    items.filter((item) => item.mealSlots.length === 0 || item.mealSlots.some((s) => s.id === activeSlot.id));

  const withDemand = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      items: await Promise.all(
        filterForSlot(category.items).map(async (item) => {
          const count = Number((await redis.get(demandKey(restaurant.id, activeSlot.id, item.id))) ?? 0);
          return { ...item, demandCount: count };
        })
      )
    }))
  );

  // All three slots' menus, pre-filtered, in one response - used by the
  // landing page's side-by-side breakfast/lunch/dinner layout so it doesn't
  // need three separate round trips.
  const bySlot: Record<string, typeof withDemand> = {};
  for (const slot of mealSlots) {
    bySlot[slot.id] = await Promise.all(
      categories.map(async (category) => ({
        ...category,
        items: await Promise.all(
          filterForSlot(category.items).map(async (item) => {
            const count = Number((await redis.get(demandKey(restaurant.id, slot.id, item.id))) ?? 0);
            return { ...item, demandCount: count };
          })
        )
      }))
    );
  }

  res.json({ restaurant, mealSlots, activeSlotId: activeSlot.id, categories: withDemand, categoriesBySlot: bySlot });
});

// GET /api/r/:slug/meal-slots - lets the customer app resolve which meal
// slot is "current" instead of relying on a hardcoded placeholder.
menuRouter.get("/r/:slug/meal-slots", async (req, res) => {
  const { slug } = req.params;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const rawMealSlots = await prisma.mealSlot.findMany({ where: { restaurantId: restaurant.id } });
  // Defends against duplicate rows (e.g. a second "lunch" created by hand in
  // Prisma Studio during testing) in addition to giving a stable, predictable
  // left-to-right column order for the landing page.
  const SLOT_ORDER = ["breakfast", "lunch", "dinner"];
  const seenNames = new Set<string>();
  const mealSlots = [...rawMealSlots]
    .sort((a, b) => SLOT_ORDER.indexOf(a.name) - SLOT_ORDER.indexOf(b.name))
    .filter((slot) => (seenNames.has(slot.name) ? false : (seenNames.add(slot.name), true)));
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
    include: { items: { where: { isAvailable: true }, include: { mealSlots: true } } }
  });

  const filterForSlot = (items: (typeof categories)[number]["items"]) =>
    mealSlotId
      ? items.filter((item) => item.mealSlots.length === 0 || item.mealSlots.some((s) => s.id === String(mealSlotId)))
      : items;

  const withDemand = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      items: await Promise.all(
        filterForSlot(category.items).map(async (item) => {
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
