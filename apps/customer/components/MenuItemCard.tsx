"use client";

import { motion } from "framer-motion";
import { Button } from "@repo/ui";
import { QuantityStepper } from "./QuantityStepper";

interface Props {
  id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  demandCount: number;
  quantity: number;
  onAdd: () => void;
  onQuantityChange: (q: number) => void;
}

export function MenuItemCard({ name, description, price, isAvailable, demandCount, quantity, onAdd, onQuantityChange }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 py-4 transition-colors hover:bg-ink-100/40">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-display font-medium text-ink-900">{name}</h3>
          {demandCount > 0 && (
            <span className="rounded-full bg-turmeric-100 px-2 py-0.5 text-[10px] font-medium text-turmeric-600">
              {demandCount} ordering now
            </span>
          )}
        </div>
        {description && <p className="mt-0.5 text-sm text-ink-400">{description}</p>}
        <span className="mt-2 block text-sm font-medium text-ink-700">₹{price}</span>
      </div>
      {quantity > 0 ? (
        <QuantityStepper quantity={quantity} onChange={onQuantityChange} />
      ) : (
        <motion.div whileTap={isAvailable ? { scale: 0.94 } : undefined}>
          <Button variant={isAvailable ? "primary" : "ghost"} disabled={!isAvailable} onClick={onAdd}>
            {isAvailable ? "Add" : "Sold out"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
