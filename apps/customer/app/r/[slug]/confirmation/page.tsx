"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrderTimeline } from "@/components/OrderTimeline";
import { TriviaWidget } from "@/components/TriviaWidget";
import type { Order, OrderStatus } from "@repo/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

export default function ConfirmationPage({ params }: { params: { slug: string } }) {
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

  const waitingForPayment = order?.status === "PENDING_PAYMENT";

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-display font-semibold text-ink-900">
          {waitingForPayment ? "Order placed" : "Order Confirmed!"}
        </h1>
        <p className="mb-8 text-ink-400">
          {waitingForPayment
            ? "We've got your order — this updates automatically the moment your payment is confirmed."
            : "Your feast is being prepared by our chefs."}
        </p>
      </div>

      {order && !waitingForPayment && order.status !== "CANCELLED" && (
        <div className="mb-8 rounded-card border border-ink-100 p-5">
          <p className="mb-4 text-sm font-medium text-ink-700">Preparation Status</p>
          <OrderTimeline status={order.status} />
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
