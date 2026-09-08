
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { useCart } from "@/lib/useCart";
import { submitOrder, createPayment } from "@/lib/api";
import { Button } from "@repo/ui";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const router = useRouter();
  const cart = useCart(slug);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    addressOrFlat: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<
    "COUNTER" | "ONLINE"
  >("COUNTER");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    const mealSlotId = localStorage.getItem(`mealSlot:${slug}`);

    if (!mealSlotId) {
      setError(
        "Couldn't find the meal slot - go back to the menu and try again.",
      );
      setSubmitting(false);
      return;
    }

    try {
      const { order } = await submitOrder(slug, {
        mealSlotId,
        paymentMethod,
        ...form,
        items: cart.lines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
        })),
      });

      /*
       * COUNTER PAYMENT
       */
      if (paymentMethod === "COUNTER") {
        cart.clear();

        router.push(
          `/r/${slug}/confirmation?orderId=${order.id}`,
        );

        return;
      }

      /*
       * ONLINE PAYMENT
       *
       * The order is currently PENDING_PAYMENT.
       * Create the Razorpay order on our API.
       */
      const payment = await createPayment(slug, order.id);

      if (!payment?.razorpayOrderId) {
        throw new Error(
          "Could not create the Razorpay payment order.",
        );
      }

      if (!payment?.keyId) {
        throw new Error(
          "Razorpay key is missing from the server response.",
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay checkout has not loaded yet. Please try again.",
        );
      }

      const razorpay = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.razorpayOrderId,

        name: "Order payment",

        prefill: {
          name: form.customerName,
          contact: form.phone,
        },

        /*
         * Razorpay calls this after the customer
         * successfully completes payment.
         *
         * IMPORTANT:
         * We still verify the signature on our server.
         * We do NOT mark the order as paid from here.
         */
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const apiUrl =
              process.env.NEXT_PUBLIC_API_URL ??
              "http://localhost:4000/api";

            const verifyResponse = await fetch(
              `${apiUrl}/r/${slug}/orders/${order.id}/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  razorpayPaymentId:
                    response.razorpay_payment_id,

                  razorpayOrderId:
                    response.razorpay_order_id,

                  razorpaySignature:
                    response.razorpay_signature,
                }),
              },
            );

            const result = await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              !result.verified
            ) {
              throw new Error(
                result.error ??
                  "Payment verification failed.",
              );
            }

            /*
             * Payment signature is verified successfully.
             *
             * The webhook will ultimately move the order
             * from PENDING_PAYMENT -> RECEIVED after
             * Razorpay confirms payment.
             */
            cart.clear();

            router.push(
              `/r/${slug}/confirmation?orderId=${order.id}`,
            );
          } catch (verificationError) {
            console.error(
              "Payment verification failed:",
              verificationError,
            );

            setSubmitting(false);

            alert(
              verificationError instanceof Error
                ? verificationError.message
                : "Payment verification failed. Please try again.",
            );
          }
        },

        /*
         * Customer closed the Razorpay window.
         */
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
      });

      razorpay.open();
    } catch (err) {
      console.error("Order/payment error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );

      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <h1 className="mb-6 text-2xl font-semibold text-ink-900">
        Your details
      </h1>

      <ul className="mb-6 divide-y divide-ink-100 rounded-card border border-ink-100">
        {cart.lines.map((line) => (
          <li
            key={line.menuItemId}
            className="flex justify-between px-4 py-3 text-sm"
          >
            <span>
              {line.quantity}× {line.name}
            </span>

            <span>
              ₹{(line.price * line.quantity).toFixed(2)}
            </span>
          </li>
        ))}

        <li className="flex justify-between px-4 py-3 text-sm font-medium">
          <span>Total</span>

          <span>
            ₹{cart.total.toFixed(2)}
          </span>
        </li>
      </ul>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          required
          placeholder="Name"
          className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
          value={form.customerName}
          onChange={(e) =>
            setForm({
              ...form,
              customerName: e.target.value,
            })
          }
        />

        <input
          required
          placeholder="Phone number"
          className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
          value={form.phone}
          onChange={(e) =>
            setForm({
              ...form,
              phone: e.target.value,
            })
          }
        />

        <input
          required
          placeholder="Flat number / address"
          className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
          value={form.addressOrFlat}
          onChange={(e) =>
            setForm({
              ...form,
              addressOrFlat: e.target.value,
            })
          }
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setPaymentMethod("COUNTER")
            }
            className={`flex-1 rounded-card border px-4 py-2.5 text-sm font-medium ${
              paymentMethod === "COUNTER"
                ? "border-chili-400 bg-chili-400/10 text-chili-600"
                : "border-ink-100 text-ink-700"
            }`}
          >
            Pay at counter
          </button>

          <button
            type="button"
            onClick={() =>
              setPaymentMethod("ONLINE")
            }
            className={`flex-1 rounded-card border px-4 py-2.5 text-sm font-medium ${
              paymentMethod === "ONLINE"
                ? "border-chili-400 bg-chili-400/10 text-chili-600"
                : "border-ink-100 text-ink-700"
            }`}
          >
            Pay online
          </button>
        </div>

        {error && (
          <p className="text-sm text-chili-600">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={
            submitting ||
            cart.lines.length === 0
          }
          className="w-full"
        >
          {submitting
            ? "Placing order…"
            : paymentMethod === "ONLINE"
              ? "Continue to payment"
              : "Place order"}
        </Button>
      </form>
    </main>
  );
}

