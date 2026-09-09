import { motion } from "framer-motion";

// A simple original SVG mark for the hero - not a stock illustration or
// anyone else's artwork, just an abstract basket/bag shape in the brand
// palette, with a gentle floating animation so the hero doesn't feel static.
export function CartIllustration() {
  return (
    <motion.svg
      width="180"
      height="180"
      viewBox="0 0 200 200"
      fill="none"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="100" cy="100" r="95" fill="var(--color-turmeric-400)" fillOpacity="0.12" />
      <path
        d="M60 85 L70 60 M140 85 L130 60"
        stroke="var(--color-turmeric-400)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="50" y="85" width="100" height="70" rx="10" fill="var(--color-turmeric-400)" fillOpacity="0.9" />
      <path d="M50 105 H150" stroke="var(--color-ink-900)" strokeWidth="3" strokeOpacity="0.15" />
      <circle cx="75" cy="165" r="9" fill="var(--color-ink-900)" />
      <circle cx="125" cy="165" r="9" fill="var(--color-ink-900)" />
    </motion.svg>
  );
}
