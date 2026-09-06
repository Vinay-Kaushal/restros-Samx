"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusPill } from "@repo/ui";
import { TriviaWidget } from "@/components/TriviaWidget";
import type { Order, OrderStatus } from "@repo/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

export default function ConfirmationPage({ params }: { params: { slug: string; tableId: string } }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetch(`${API_BASE}/api/r/${params.slug}/orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => setOrder(data.order));
  }, [orderId, params.slug]);

  useEffect(() => {
    if (!order) return;
    const ws = new WebSocket(`${WS_BASE}/ws?restaurantId=${order.restaurantId}`);
    ws.onmessage = (message) => {
      const event = JSON.parse(message.data);
      if (event.type === "order:status_changed" && event.orderId === order.id) {
        setOrder((prev) => (prev ? { ...prev, status: event.status as OrderStatus } : prev));
      }
    };
    return () => ws.close();
  }, [order?.id, order?.restaurantId]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-ink-900">
        {order?.status === "PENDING_PAYMENT" ? "Waiting for payment…" : "Order placed"}
      </h1>
      <p className="mb-4 text-ink-400">
        {order?.status === "PENDING_PAYMENT"
          ? "This updates automatically once payment is confirmed."
          : "The kitchen has your order. This updates automatically as it's prepared."}
      </p>

      {order && (
        <div className="mb-2 flex justify-center">
          <StatusPill status={order.status} />
        </div>
      )}

      {order && order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" && (
        <TriviaWidget
          restaurantId={order.restaurantId}
          mealSlotId={order.mealSlotId}
          playerName={order.customerName}
        />
      )}
    </main>
  );
}
