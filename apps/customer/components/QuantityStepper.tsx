"use client";
import { motion } from "framer-motion";

export function QuantityStepper({ quantity, onChange }: { quantity: number; onChange: (q: number) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-ink-100 px-2 py-1">
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => onChange(quantity - 1)} className="h-6 w-6 rounded-full bg-ink-50 text-sm font-medium text-ink-700">
        −
      </motion.button>
      <span className="w-4 text-center text-sm font-medium text-ink-900">{quantity}</span>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => onChange(quantity + 1)} className="h-6 w-6 rounded-full bg-turmeric-400 text-sm font-medium text-ink-900">
        +
      </motion.button>
    </div>
  );
}
