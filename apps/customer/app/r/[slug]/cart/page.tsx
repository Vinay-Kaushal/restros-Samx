"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { QuantityStepper } from "@/components/QuantityStepper";
import { Button } from "@repo/ui";

export default function CartPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const cart = useCart(slug);
  const [instructions, setInstructions] = useState("");

  function proceed() {
    if (instructions.trim()) sessionStorage.setItem(`instructions:${slug}`, instructions.trim());
    router.push(`/r/${slug}/checkout`);
  }

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="mb-2 text-2xl font-semibold text-ink-900">Your cart is empty</h1>
        <p className="mb-6 text-ink-400">Add something from the menu to get started.</p>
        <Button onClick={() => router.push(`/r/${slug}`)}>Back to menu</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8 pb-40">
      <h1 className="mb-6 text-2xl font-display font-semibold text-ink-900">Your Feast Awaits</h1>

      <ul className="mb-6 divide-y divide-ink-100 rounded-card border border-ink-100">
        {cart.lines.map((line) => (
          <li key={line.menuItemId} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900">{line.name}</p>
              <p className="text-sm text-ink-400">₹{line.price}</p>
            </div>
            <QuantityStepper quantity={line.quantity} onChange={(q) => cart.setQuantity(line.menuItemId, q)} />
          </li>
        ))}
      </ul>

      <button onClick={() => router.push(`/r/${slug}`)} className="mb-6 text-sm font-medium text-chili-600">
        + Add more items
      </button>

      <label className="mb-1 block text-sm font-medium text-ink-700">Special instructions</label>
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Any allergies or food preferences?"
        rows={2}
        maxLength={500}
        className="mb-6 w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm placeholder:text-ink-400 focus:border-turmeric-400 focus:outline-none"
      />

      <div className="mb-6 flex justify-between text-base font-medium text-ink-900">
        <span>Subtotal</span>
        <span>₹{cart.total.toFixed(2)}</span>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-ink-100 bg-ink-50 p-4">
        <div className="mx-auto max-w-lg">
          <Button onClick={proceed} className="w-full">
            Proceed to checkout · ₹{cart.total.toFixed(2)}
          </Button>
        </div>
      </div>
    </main>
  );
}
