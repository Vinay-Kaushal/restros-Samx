import { Logo } from "./Logo";

interface Props {
  restaurantName: string;
}

// Standard SaaS-storefront footer pattern: the restaurant's own identity up
// top (this is THEIR page, not ours), the platform credit kept small and
// last. Contact/social links are placeholders - the Restaurant model doesn't
// carry phone/address/socials yet, so these render generically until a real
// client asks for them to be wired to actual data.
export function Footer({ restaurantName }: Props) {
  return (
    <footer className="border-t border-ink-100 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col justify-between gap-8 sm:flex-row">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">{restaurantName}</p>
          <p className="mt-1 text-sm text-ink-400">Fresh, made-to-order, ready when you arrive.</p>
        </div>

        <div className="flex gap-6 text-sm text-ink-400">
          <span>Contact</span>
          <span>Hours</span>
          <span>Location</span>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl border-t border-ink-100 pt-6">
        <div className="flex items-center gap-1.5 text-xs text-ink-400">
          <span>Powered by</span>
          <Logo size={14} />
          <span className="font-medium text-ink-700">TheVisionForged</span>
        </div>
        <p className="mt-1 text-xs text-ink-400">© {new Date().getFullYear()} {restaurantName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
