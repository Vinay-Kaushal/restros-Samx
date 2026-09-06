"use client";

import { useEffect, useState } from "react";
import type { DemandUpdateEvent, RealtimeEvent } from "@repo/types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

// Keeps a live map of menuItemId -> demand count for the current restaurant,
// updated in place as `demand:update` events arrive. This is what makes the
// badge on each menu item change without a page refresh (plan Section 7).
export function useDemandSocket(restaurantId: string | undefined) {
  const [demand, setDemand] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!restaurantId) return;
    const socket = new WebSocket(`${WS_BASE}/ws?restaurantId=${restaurantId}`);

    socket.onmessage = (message) => {
      const event: RealtimeEvent = JSON.parse(message.data);
      if (event.type === "demand:update") {
        const demandEvent = event as DemandUpdateEvent;
        setDemand((prev) => ({ ...prev, [demandEvent.menuItemId]: demandEvent.count }));
      }
    };

    return () => socket.close();
  }, [restaurantId]);

  return demand;
}
