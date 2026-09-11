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
    <footer className="border-t border-ink-100">
      <section id="about" className="border-b border-ink-100 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-turmeric-600">About us</p>
          <h2 className="mb-3 text-2xl font-display font-semibold text-ink-900">{restaurantName}</h2>
          <p className="max-w-xl text-sm leading-relaxed text-ink-400">
            We cook fresh, made-to-order meals for breakfast, lunch, and dinner — no pre-made trays sitting under a
            heat lamp. Order ahead and it's ready exactly when you arrive.
          </p>
        </div>
      </section>

      <section id="help" className="border-b border-ink-100 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-turmeric-600">Help</p>
          <h2 className="mb-4 text-2xl font-display font-semibold text-ink-900">Frequently asked</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-ink-900">How far ahead do I need to order?</p>
              <p className="text-ink-400">At least an hour before the meal slot closes — you'll see the exact cutoff on the menu.</p>
            </div>
            <div>
              <p className="font-medium text-ink-900">Can I pay when I arrive?</p>
              <p className="text-ink-400">Yes — choose "Pay at counter" at checkout, or pay online if you'd rather have it settled ahead of time.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-turmeric-600">Contact</p>
          <h2 className="mb-3 text-2xl font-display font-semibold text-ink-900">Get in touch</h2>
          <div className="flex gap-8 text-sm text-ink-400">
            <span>Hours</span>
            <span>Location</span>
            <span>Phone</span>
          </div>
        </div>
      </section>

      <div className="border-t border-ink-100 px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5 text-xs text-ink-400">
            <span>Powered by</span>
            <Logo size={14} />
            <span className="font-medium text-ink-700">TheVisionForged</span>
          </div>
          <p className="text-xs text-ink-400">© {new Date().getFullYear()} {restaurantName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
