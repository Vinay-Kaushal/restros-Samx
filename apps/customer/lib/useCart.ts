"use client";

import { useCallback, useEffect, useState } from "react";

export interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

// localStorage-backed so the cart survives the menu -> checkout navigation
// without needing a server round-trip or a global provider for this MVP.
export function useCart(restaurantSlug: string) {
  const storageKey = `cart:${restaurantSlug}`;
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) setLines(JSON.parse(raw));
  }, [storageKey]);

  const persist = useCallback(
    (next: CartLine[]) => {
      setLines(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey]
  );

  const addItem = useCallback(
    (item: { menuItemId: string; name: string; price: number }) => {
      const existing = lines.find((l) => l.menuItemId === item.menuItemId);
      if (existing) {
        persist(lines.map((l) => (l.menuItemId === item.menuItemId ? { ...l, quantity: l.quantity + 1 } : l)));
      } else {
        persist([...lines, { ...item, quantity: 1 }]);
      }
    },
    [lines, persist]
  );

  const removeItem = useCallback(
    (menuItemId: string) => persist(lines.filter((l) => l.menuItemId !== menuItemId)),
    [lines, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return { lines, addItem, removeItem, clear, total };
}
