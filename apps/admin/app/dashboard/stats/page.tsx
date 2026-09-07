"use client";

import { useEffect, useState } from "react";
import { fetchStats } from "@/lib/api";

const RESTAURANT_SLUG = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_SLUG ?? "demo-restaurant";

interface Stats {
  totalOrders: number;
  ordersByStatus: { status: string; count: number }[];
  topItems: { name: string; quantity: number }[];
  revenue: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats(RESTAURANT_SLUG).then(setStats);
  }, []);

  if (!stats) return <div className="mx-auto max-w-5xl px-6 py-8 text-ink-400">Loading…</div>;

  const maxQty = Math.max(...stats.topItems.map((i) => i.quantity), 1);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Stats & reports</h1>
        <a href="/dashboard" className="text-sm font-medium text-chili-600">
          ← Back to live orders
        </a>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-card border border-ink-100 p-4">
          <p className="text-xs text-ink-400">Total orders</p>
          <p className="text-2xl font-semibold text-ink-900">{stats.totalOrders}</p>
        </div>
        <div className="rounded-card border border-ink-100 p-4">
          <p className="text-xs text-ink-400">Revenue</p>
          <p className="text-2xl font-semibold text-ink-900">₹{Number(stats.revenue).toFixed(0)}</p>
        </div>
        {stats.ordersByStatus.map((s) => (
          <div key={s.status} className="rounded-card border border-ink-100 p-4">
            <p className="text-xs text-ink-400">{s.status}</p>
            <p className="text-2xl font-semibold text-ink-900">{s.count}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-medium text-ink-700">Most ordered items</h2>
      <div className="space-y-2">
        {stats.topItems.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-ink-700">{item.name}</span>
            <div className="h-2 flex-1 rounded-full bg-ink-100">
              <div
                className="h-2 rounded-full bg-turmeric-400"
                style={{ width: `${(item.quantity / maxQty) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-sm text-ink-400">{item.quantity}</span>
          </div>
        ))}
        {stats.topItems.length === 0 && <p className="text-sm text-ink-400">No orders yet.</p>}
      </div>
    </main>
  );
}
