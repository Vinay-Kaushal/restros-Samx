"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/useCart";
import { submitOrder } from "@/lib/api";
import { Button } from "@repo/ui";

export default function CheckoutPage({ params }: { params: { slug: string; tableId: string } }) {
  const { slug, tableId } = params;
  const router = useRouter();
  const cart = useCart(slug);
  const [form, setForm] = useState({ customerName: "", phone: "", addressOrFlat: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const mealSlotId = localStorage.getItem(`mealSlot:${slug}`);
    if (!mealSlotId) {
      setError("Couldn't find the meal slot - go back to the menu and try again.");
      setSubmitting(false);
      return;
    }
    try {
      // paymentMethod hardcoded to COUNTER here - Phase 2 adds a choice
      // between this and ONLINE (Razorpay), see plan Section 8.
      await submitOrder(slug, {
        tableId,
        mealSlotId,
        paymentMethod: "COUNTER",
        ...form,
        items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity }))
      });
      cart.clear();
      router.push(`/r/${slug}/t/${tableId}/confirmation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Your details</h1>

      <ul className="mb-6 divide-y divide-ink-100 rounded-card border border-ink-100">
        {cart.lines.map((line) => (
          <li key={line.menuItemId} className="flex justify-between px-4 py-3 text-sm">
            <span>{line.quantity}× {line.name}</span>
            <span>₹{(line.price * line.quantity).toFixed(2)}</span>
          </li>
        ))}
        <li className="flex justify-between px-4 py-3 text-sm font-medium">
          <span>Total</span>
          <span>₹{cart.total.toFixed(2)}</span>
        </li>
      </ul>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          placeholder="Name"
          className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
        />
        <input
          required
          placeholder="Phone number"
          className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          required
          placeholder="Flat number / address"
          className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
          value={form.addressOrFlat}
          onChange={(e) => setForm({ ...form, addressOrFlat: e.target.value })}
        />

        {error && <p className="text-sm text-chili-600">{error}</p>}

        <Button type="submit" disabled={submitting || cart.lines.length === 0} className="w-full">
          {submitting ? "Placing order…" : "Place order"}
        </Button>
      </form>
    </main>
  );
}
