import { Router } from "express";
import { prisma } from "../lib/prisma";

export const statsRouter = Router();

// GET /api/r/:slug/stats - admin-only aggregate view. Deliberately kept to
// simple groupBy queries rather than a separate analytics pipeline - fine
// at single-restaurant scale, worth revisiting if/when this needs to serve
// many restaurants' dashboards at once.
statsRouter.get("/r/:slug/stats", async (req, res) => {
  const { slug } = req.params;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const [totalOrders, ordersByStatus, topItemsRaw, revenueResult] = await Promise.all([
    prisma.order.count({ where: { restaurantId: restaurant.id } }),
    prisma.order.groupBy({
      by: ["status"],
      where: { restaurantId: restaurant.id },
      _count: { status: true }
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: { order: { restaurantId: restaurant.id } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    }),
    prisma.orderItem.aggregate({
      where: { order: { restaurantId: restaurant.id, status: { in: ["RECEIVED", "PREPARING", "READY", "DELIVERED"] } } },
      _sum: { priceAtOrder: true }
    })
  ]);

  const itemIds = topItemsRaw.map((i) => i.menuItemId);
  const items = await prisma.menuItem.findMany({ where: { id: { in: itemIds } } });
  const topItems = topItemsRaw.map((row) => ({
    name: items.find((i) => i.id === row.menuItemId)?.name ?? "Unknown item",
    quantity: row._sum.quantity ?? 0
  }));

  res.json({
    totalOrders,
    ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count.status })),
    topItems,
    revenue: revenueResult._sum.priceAtOrder ?? 0
  });
});
