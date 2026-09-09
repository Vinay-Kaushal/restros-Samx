import type { OrderStatus } from "@repo/types";

const STAGES: { key: OrderStatus; label: string; sub: string }[] = [
  { key: "RECEIVED", label: "Order Confirmed", sub: "Received by the kitchen" },
  { key: "PREPARING", label: "Preparing", sub: "Fresh spices, on the stove now" },
  { key: "READY", label: "Ready & Served", sub: "Heading your way" }
];
const ORDER: OrderStatus[] = ["RECEIVED", "PREPARING", "READY", "DELIVERED"];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER.indexOf(status);
  return (
    <div className="space-y-4 text-left">
      {STAGES.map((stage, i) => {
        const stageIndex = ORDER.indexOf(stage.key);
        const done = currentIndex > stageIndex || status === "DELIVERED";
        const active = currentIndex === stageIndex;
        return (
          <div key={stage.key} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                done || active ? "bg-turmeric-400 text-ink-900" : "bg-ink-100 text-ink-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <div>
              <p className={`text-sm font-medium ${active || done ? "text-ink-900" : "text-ink-400"}`}>{stage.label}</p>
              <p className="text-xs text-ink-400">{stage.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
