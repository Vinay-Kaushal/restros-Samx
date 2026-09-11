"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Order, OrderStatus } from "@repo/types";
import { StatusPill, Button } from "@repo/ui";
import { fetchOrders, updateOrderStatus } from "@/lib/api";
import { useAdminSocket } from "@/lib/useAdminSocket";

// TODO: replace with the logged-in staff member's restaurant once admin auth
// is wired up. Read from an env var for now so this is runnable standalone.
const RESTAURANT_SLUG = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_SLUG ?? "demo-restaurant";

const STATUS_FILTERS: (OrderStatus | "ALL")[] = ["ALL", "PENDING_PAYMENT", "RECEIVED", "PREPARING", "READY", "DELIVERED"];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEIVED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED"
};

export default function DashboardPage() {
  const [restaurantId, setRestaurantId] = useState<string>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [toast, setToast] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetchOrders(RESTAURANT_SLUG).then((data) => {
      setRestaurantId(data.restaurant.id);
      setOrders(data.orders);
    });
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function playChime() {
    // A short synthesized beep - no audio file to host, works the moment
    // the page has had one user interaction (browser autoplay rules).
    try {
      audioCtxRef.current ??= new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Ignore - some browsers block audio before any user gesture at all.
    }
  }

  useAdminSocket(restaurantId, {
    onNewOrder: (order) => {
      setOrders((prev) => [order, ...prev]);
      playChime();
      setToast(`New order from ${order.customerName}`);
      setTimeout(() => setToast(null), 5000);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("New order", { body: `${order.customerName} just placed an order` });
      }
    },
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
      {toast && (
        <div className="fixed right-6 top-6 rounded-card bg-ink-900 px-4 py-3 text-sm text-ink-50 shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-ink-900">Live orders</h1>
          <p className="text-sm text-ink-400">Updates as orders come in - no need to refresh.</p>
        </div>
        <a href="/dashboard/stats" className="text-sm font-medium text-chili-600">
          View stats →
        </a>
      </div>
      <div className="mb-2">
        <a href="/dashboard/menu" className="text-sm font-medium text-chili-600">Manage menu →</a>
      </div>

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
            <th className="py-2 font-normal">Total</th>
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
                {order.specialInstructions && (
                  <div className="mt-1 text-xs italic text-chili-600">"{order.specialInstructions}"</div>
                )}
              </td>
              <td className="py-3 text-ink-700">
                {order.items.map((i) => `${i.quantity}× ${i.menuItem?.name ?? "Item"}`).join(", ")}
              </td>
              <td className="py-3 font-medium text-ink-900">
                ₹{order.items.reduce((sum, i) => sum + Number(i.priceAtOrder) * i.quantity, 0).toFixed(0)}
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
