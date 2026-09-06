"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order, OrderStatus } from "@repo/types";
import { StatusPill, Button } from "@repo/ui";
import { fetchOrders, updateOrderStatus } from "@/lib/api";
import { useAdminSocket } from "@/lib/useAdminSocket";

// TODO: replace with the logged-in staff member's restaurant once admin auth
// is wired up. Read from an env var for now so this is runnable standalone.
const RESTAURANT_SLUG = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_SLUG ?? "demo-restaurant";

const STATUS_FILTERS: (OrderStatus | "ALL")[] = ["ALL", "RECEIVED", "PREPARING", "READY", "DELIVERED"];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEIVED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED"
};

export default function DashboardPage() {
  const [restaurantId, setRestaurantId] = useState<string>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");

  useEffect(() => {
    fetchOrders(RESTAURANT_SLUG).then((data) => {
      setRestaurantId(data.restaurant.id);
      setOrders(data.orders);
    });
  }, []);

  useAdminSocket(restaurantId, {
    onNewOrder: (order) => setOrders((prev) => [order, ...prev]),
    onStatusChanged: (orderId, status) =>
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
  });

  const visible = useMemo(
    () => (filter === "ALL" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  async function advance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await updateOrderStatus(RESTAURANT_SLUG, order.id, next);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-1 text-xl font-semibold text-ink-900">Live orders</h1>
      <p className="mb-6 text-sm text-ink-400">Updates as orders come in - no need to refresh.</p>

      <div className="mb-4 flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === s ? "bg-ink-900 text-ink-50" : "bg-ink-100 text-ink-700"
            }`}
          >
            {s === "ALL" ? "All" : s}
          </button>
        ))}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-ink-400">
            <th className="py-2 font-normal">Customer</th>
            <th className="py-2 font-normal">Items</th>
            <th className="py-2 font-normal">Location</th>
            <th className="py-2 font-normal">Status</th>
            <th className="py-2 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((order) => (
            <tr key={order.id} className="border-b border-ink-100">
              <td className="py-3">
                <div className="font-medium text-ink-900">{order.customerName}</div>
                <div className="text-ink-400">{order.phone}</div>
              </td>
              <td className="py-3 text-ink-700">
                {order.items.map((i) => `${i.quantity}×`).join(", ")}
              </td>
              <td className="py-3 text-ink-700">{order.addressOrFlat}</td>
              <td className="py-3">
                <StatusPill status={order.status} />
              </td>
              <td className="py-3 text-right">
                {NEXT_STATUS[order.status] && (
                  <Button variant="ghost" onClick={() => advance(order)}>
                    Mark {NEXT_STATUS[order.status]?.toLowerCase()}
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-ink-400">
                No orders here yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
