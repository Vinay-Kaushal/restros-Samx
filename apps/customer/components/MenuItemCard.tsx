"use client";

import { DemandBadge, Button } from "@repo/ui";

interface Props {
  id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  demandCount: number;
  onAdd: () => void;
}

export function MenuItemCard({ name, description, price, isAvailable, demandCount, onAdd }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 py-4">
      <div className="min-w-0">
        <h3 className="text-base font-display font-medium text-ink-900">{name}</h3>
        {description && <p className="mt-0.5 text-sm text-ink-400">{description}</p>}
        <div className="mt-2 flex items-center gap-3">
          <span className="text-sm font-medium text-ink-700">₹{price}</span>
          <DemandBadge count={demandCount} />
        </div>
      </div>
      <Button variant={isAvailable ? "primary" : "ghost"} disabled={!isAvailable} onClick={onAdd}>
        {isAvailable ? "Add" : "Sold out"}
      </Button>
    </div>
  );
}
