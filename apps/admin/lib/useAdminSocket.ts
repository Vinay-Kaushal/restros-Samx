"use client";

import { useEffect } from "react";
import type { RealtimeEvent, Order, OrderStatus } from "@repo/types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

interface Handlers {
  onNewOrder: (order: Order) => void;
  onStatusChanged: (orderId: string, status: OrderStatus) => void;
}

// Same ws endpoint and restaurant-room concept the customer app uses
// (see apps/api/src/realtime/ws.ts) - the admin dashboard is just another
// listener in that same room.
export function useAdminSocket(restaurantId: string | undefined, handlers: Handlers) {
  useEffect(() => {
    if (!restaurantId) return;
    const socket = new WebSocket(`${WS_BASE}/ws?restaurantId=${restaurantId}`);

    socket.onmessage = (message) => {
      const event: RealtimeEvent = JSON.parse(message.data);
      if (event.type === "order:new") handlers.onNewOrder(event.order);
      if (event.type === "order:status_changed") handlers.onStatusChanged(event.orderId, event.status);
    };

    return () => socket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);
}
