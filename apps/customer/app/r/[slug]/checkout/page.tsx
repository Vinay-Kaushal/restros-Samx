"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCart } from "@/lib/useCart";
import { submitOrder, createPayment, devConfirmPayment } from "@/lib/api";
import { Button } from "@repo/ui";

const TIP_OPTIONS = [20, 50, 100];

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const cart = useCart(slug);
  const [form, setForm] = useState({ customerName: "", phone: "", addressOrFlat: "" });
  const [paymentMethod, setPaymentMethod] = useState<"COUNTER" | "ONLINE">("ONLINE");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    setInstructions(sessionStorage.getItem(`instructions:${slug}`) ?? "");
  }, [slug]);

  const grandTotal = cart.total + tip;

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
        tipAmount: tip,
        specialInstructions: instructions || undefined,
        ...form,
        items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity }))
      });

      if (paymentMethod === "COUNTER") {
        cart.clear();
        router.push(`/r/${slug}/confirmation?orderId=${order.id}`);
        return;
      }

      const payment = await createPayment(slug, order.id);
      const razorpay = new (window as any).Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.razorpayOrderId,
        name: "Order payment",
        prefill: { name: form.customerName, contact: form.phone },
        handler: async () => {
          if (process.env.NEXT_PUBLIC_DEV_DISABLE_ORDER_RESTRICTIONS === "true") {
            await devConfirmPayment(slug, order.id);
          }
          cart.clear();
          router.push(`/r/${slug}/confirmation?orderId=${order.id}`);
        },
        modal: { ondismiss: () => setSubmitting(false) }
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8 pb-32">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h1 className="mb-6 text-2xl font-display font-semibold text-ink-900">Secure Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <input required placeholder="Name" className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
            value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input required placeholder="Phone number" className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input required placeholder="Flat number / address" className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
            value={form.addressOrFlat} onChange={(e) => setForm({ ...form, addressOrFlat: e.target.value })} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">Select payment method</p>
          <div className="space-y-2">
            {[
              { value: "ONLINE" as const, label: "Pay Online", sub: "UPI, Credit/Debit cards (via Razorpay)" },
              { value: "COUNTER" as const, label: "Pay at Counter", sub: "Cash, Card or UPI when it arrives" }
            ].map((opt) => (
              <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)}
                className={`flex w-full items-center justify-between rounded-card border px-4 py-3 text-left transition-colors ${
                  paymentMethod === opt.value ? "border-turmeric-400 bg-turmeric-100/50" : "border-ink-100"
                }`}>
                <span>
                  <span className="block text-sm font-medium text-ink-900">{opt.label}</span>
                  <span className="block text-xs text-ink-400">{opt.sub}</span>
                </span>
                <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  paymentMethod === opt.value ? "border-turmeric-400 bg-turmeric-400" : "border-ink-100"
                }`} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium text-ink-700">Support our kitchen staff</p>
            <span className="text-xs text-ink-400">100% goes to staff</span>
          </div>
          <div className="flex gap-2">
            {TIP_OPTIONS.map((amount) => (
              <button key={amount} type="button" onClick={() => { setTip(amount); setCustomTip(""); }}
                className={`flex-1 rounded-card border px-3 py-2 text-sm font-medium ${
                  tip === amount && !customTip ? "border-turmeric-400 bg-turmeric-100 text-turmeric-600" : "border-ink-100 text-ink-700"
                }`}>
                ₹{amount}
              </button>
            ))}
            <input value={customTip} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setCustomTip(v); setTip(Number(v) || 0); }}
              placeholder="Custom" className="w-20 rounded-card border border-ink-100 px-3 py-2 text-center text-sm" />
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-ink-700">Special instructions</p>
          <p className="rounded-card bg-ink-100 px-4 py-2.5 text-sm text-ink-700">{instructions || "None added"}</p>
        </div>

        <div className="space-y-1 border-t border-ink-100 pt-4 text-sm">
          <div className="flex justify-between text-ink-400"><span>Subtotal</span><span>₹{cart.total.toFixed(2)}</span></div>
          {tip > 0 && <div className="flex justify-between text-ink-400"><span>Support for staff</span><span>₹{tip.toFixed(2)}</span></div>}
          <div className="flex justify-between text-base font-semibold text-ink-900"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
        </div>

        {error && <p className="text-sm text-chili-600">{error}</p>}

        <Button type="submit" disabled={submitting || cart.lines.length === 0} className="w-full">
          {submitting ? "Placing order…" : `Confirm & Pay · ₹${grandTotal.toFixed(0)}`}
        </Button>
      </form>
    </main>
  );
}
