// The platform's own brand mark - shown small, in the footer, as
// "Powered by TheVisionForged" - the way Shopify/Squarespace-style SaaS
// products credit themselves on every storefront they power. Each
// restaurant's own name/branding stays the star of the actual page; this
// stays deliberately understated.
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 21 L16 9 L21 21 M13.2 16.5 H18.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
