import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/requireAdmin";

export const adminMenuRouter = Router();
adminMenuRouter.use(requireAdmin);

// GET full menu management view - every item regardless of availability,
// with its meal-slot assignments, for the admin's menu editor.
adminMenuRouter.get("/r/:slug/admin/menu", async (req, res) => {
  const { slug } = req.params;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const [categories, mealSlots] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: "asc" },
      include: { items: { include: { mealSlots: true } } }
    }),
    prisma.mealSlot.findMany({ where: { restaurantId: restaurant.id } })
  ]);

  res.json({ restaurant, categories, mealSlots });
});

adminMenuRouter.post("/r/:slug/admin/categories", async (req, res) => {
  const { slug } = req.params;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const category = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name, sortOrder: 0 }
  });
  res.status(201).json({ category });
});

adminMenuRouter.post("/r/:slug/admin/menu-items", async (req, res) => {
  const { categoryId, name, description, price, imageUrl, mealSlotIds } = req.body;
  if (!categoryId || !name || price == null) {
    return res.status(400).json({ error: "categoryId, name, and price are required" });
  }

  const item = await prisma.menuItem.create({
    data: {
      categoryId,
      name,
      description,
      price,
      imageUrl,
      mealSlots: mealSlotIds?.length ? { connect: mealSlotIds.map((id: string) => ({ id })) } : undefined
    },
    include: { mealSlots: true }
  });
  res.status(201).json({ item });
});

adminMenuRouter.patch("/r/:slug/admin/menu-items/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, price, isAvailable, imageUrl, mealSlotIds } = req.body;

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(isAvailable !== undefined ? { isAvailable } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(mealSlotIds !== undefined ? { mealSlots: { set: mealSlotIds.map((slotId: string) => ({ id: slotId })) } } : {})
    },
    include: { mealSlots: true }
  });
  res.json({ item });
});

adminMenuRouter.delete("/r/:slug/admin/menu-items/:id", async (req, res) => {
  const { id } = req.params;
  await prisma.menuItem.delete({ where: { id } });
  res.json({ ok: true });
});
