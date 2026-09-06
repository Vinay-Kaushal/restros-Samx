import type { OrderStatus } from "@repo/types";

const LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  RECEIVED: "Received",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
};

const STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-ink-100 text-ink-700",
  RECEIVED: "bg-ink-100 text-ink-700",
  PREPARING: "bg-turmeric-100 text-turmeric-600",
  READY: "bg-leaf-100 text-leaf-700",
  DELIVERED: "bg-leaf-100 text-leaf-700",
  CANCELLED: "bg-chili-400/10 text-chili-600"
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
