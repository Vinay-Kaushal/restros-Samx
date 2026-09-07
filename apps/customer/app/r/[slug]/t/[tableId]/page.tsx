"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMenu, fetchCurrentMealSlot } from "@/lib/api";
import { useDemandSocket } from "@/lib/useDemandSocket";
import { useCart } from "@/lib/useCart";
import { MenuItemCard } from "@/components/MenuItemCard";
import { Button } from "@repo/ui";

interface MenuData {
  restaurant: { id: string; name: string };
  categories: {
    id: string;
    name: string;
    items: { id: string; name: string; description?: string; price: number; isAvailable: boolean; demandCount: number }[];
  }[];
}

export default function MenuPage({ params }: { params: { slug: string; tableId: string } }) {
  const { slug, tableId } = params;
  const router = useRouter();
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [mealSlotId, setMealSlotId] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const cart = useCart(slug);

  useEffect(() => {
    fetchCurrentMealSlot(slug)
      .then((slot) => {
        if (!slot) throw new Error("No meal slot configured");
        setMealSlotId(slot.id);
        // Checkout needs this too - stashed alongside the cart since they're
        // on separate routes. See lib/useCart.ts for the same pattern.
        localStorage.setItem(`mealSlot:${slug}`, slot.id);
        return fetchMenu(slug, slot.id);
      })
      .then(setMenu)
      .catch(() => setError("Couldn't load the menu. Try scanning the QR code again."));
  }, [slug]);

  const demand = useDemandSocket(menu?.restaurant.id);

  if (error) return <div className="mx-auto max-w-lg px-6 py-16 text-center text-chili-600">{error}</div>;
  if (!menu) return <div className="mx-auto max-w-lg px-6 py-16 text-center text-ink-400">Loading menu…</div>;

  const allSoldOut = menu.categories.every((c) => c.items.every((i) => !i.isAvailable));

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-sm text-ink-400">{tableId}</p>
        <h1 className="text-2xl font-semibold text-ink-900">{menu.restaurant.name}</h1>
      </header>

      {allSoldOut && (
        <p className="mb-6 rounded-card bg-ink-100 px-4 py-3 text-sm text-ink-700">
          Everything's sold out right now — check back closer to the next meal slot.
        </p>
      )}

      {menu.categories.map((category) => (
        <section key={category.id} className="mb-6">
          <h2 className="mb-1 text-lg font-medium text-ink-700">{category.name}</h2>
          {category.items.map((item) => (
            <MenuItemCard
              key={item.id}
              id={item.id}
              name={item.name}
              description={item.description}
              price={item.price}
              isAvailable={item.isAvailable}
              demandCount={demand[item.id] ?? item.demandCount}
              onAdd={() => cart.addItem({ menuItemId: item.id, name: item.name, price: item.price })}
            />
          ))}
        </section>
      ))}

      {cart.lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-ink-100 bg-ink-50 p-4">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">{cart.lines.length} item(s)</p>
              <p className="text-base font-medium text-ink-900">₹{cart.total.toFixed(2)}</p>
            </div>
            <Button onClick={() => router.push(`/r/${slug}/t/${tableId}/checkout`)}>Review order</Button>
          </div>
        </div>
      )}
    </main>
  );
}
