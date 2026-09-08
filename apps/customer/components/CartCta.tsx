"use client";

import { motion } from "framer-motion";

// The hero's one job: get someone to actually look at the menu. Styled like
// a tappable order card rather than a plain text button - the cart glyph
// plus the two-line copy is what the Dribbble-style reference was doing
// (a card-shaped call to action, not a link in a sentence).
export function CartCta() {
  function scrollToMenu() {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <motion.button
      onClick={scrollToMenu}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="group relative mx-auto mt-8 flex items-center gap-4 rounded-card bg-turmeric-400 px-6 py-4 text-left shadow-lg shadow-turmeric-600/20"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-turmeric-400">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink-900">Order your meal now</span>
        <span className="block text-xs text-ink-900/70">Breakfast, lunch & dinner — see what's on today</span>
      </span>
    </motion.button>
  );
}
