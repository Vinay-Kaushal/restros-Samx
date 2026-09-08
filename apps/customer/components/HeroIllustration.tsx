"use client";

import { motion } from "framer-motion";

// A small original abstract mark - a bowl with rising steam - built from
// scratch in our own palette. Not a photo or a copied illustration; just
// enough visual interest to keep the hero from being pure text on a
// gradient. The steam wisps float gently via framer-motion.
export function HeroIllustration() {
  return (
    <div className="relative h-40 w-40 sm:h-48 sm:w-48">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <ellipse cx="100" cy="140" rx="70" ry="14" fill="#241A13" opacity="0.3" />
        <path
          d="M40 100 Q40 150 100 150 Q160 150 160 100 Z"
          fill="#E3A008"
        />
        <ellipse cx="100" cy="100" rx="60" ry="16" fill="#FBE8BE" />
        <ellipse cx="100" cy="100" rx="60" ry="16" fill="none" stroke="#B77D06" strokeWidth="2" />
      </svg>

      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute top-2 h-10 w-2 rounded-full bg-ink-50/40"
          style={{ left: `${72 + i * 24}px` }}
          animate={{ y: [0, -16, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
