"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCart } from "@/lib/useCart";
import { submitOrder, createPayment } from "@/lib/api";
import { Button } from "@repo/ui";

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const cart = useCart(slug);
  const [form, setForm] = useState({ customerName: "", phone: "", addressOrFlat: "" });
  const [paymentMethod, setPaymentMethod] = useState<"COUNTER" | "ONLINE">("COUNTER");
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
      const { order } = await submitOrder(slug, {
        mealSlotId,
        paymentMethod,
        ...form,
        items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity }))
      });

      if (paymentMethod === "COUNTER") {
        cart.clear();
        router.push(`/r/${slug}/confirmation?orderId=${order.id}`);
        return;
      }

      // ONLINE: the order now exists in PENDING_PAYMENT state. Create the
      // actual Razorpay order and open the checkout widget - the order only
      // moves to RECEIVED once the webhook confirms payment (see plan
      // Section 8), never from this client-side callback alone.
      const payment = await createPayment(slug, order.id);
      const razorpay = new (window as any).Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.razorpayOrderId,
        name: "Order payment",
        prefill: { name: form.customerName, contact: form.phone },
        
        handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
        }) => {
        try {
         const verifyResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/r/${slug}/orders/${order.id}/verify-payment`,
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        }),
       },
      );

      const result = await verifyResponse.json();

      if (!verifyResponse.ok || !result.verified) {
      throw new Error(result.error ?? "Payment verification failed");
      }

      clearCart();
      router.push(`/r/${slug}/confirmation?orderId=${order.id}`);
      } catch (error) {
      console.error("Payment verification failed:", error);

      alert(
      error instanceof Error
        ? error.message
        : "Payment verification failed. Please try again.",
      );
      }
       },
        modal: {
          ondismiss: () => setSubmitting(false)
        }
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("COUNTER")}
            className={`flex-1 rounded-card border px-4 py-2.5 text-sm font-medium ${
              paymentMethod === "COUNTER" ? "border-chili-400 bg-chili-400/10 text-chili-600" : "border-ink-100 text-ink-700"
            }`}
          >
            Pay at counter
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("ONLINE")}
            className={`flex-1 rounded-card border px-4 py-2.5 text-sm font-medium ${
              paymentMethod === "ONLINE" ? "border-chili-400 bg-chili-400/10 text-chili-600" : "border-ink-100 text-ink-700"
            }`}
          >
            Pay online
          </button>
        </div>

        {error && <p className="text-sm text-chili-600">{error}</p>}

        <Button type="submit" disabled={submitting || cart.lines.length === 0} className="w-full">
          {submitting ? "Placing order…" : paymentMethod === "ONLINE" ? "Continue to payment" : "Place order"}
        </Button>
      </form>
    </main>
  );
}
