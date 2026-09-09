"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchBootstrap, fetchMenu } from "@/lib/api";
import { useDemandSocket } from "@/lib/useDemandSocket";
import { useCart } from "@/lib/useCart";
import { MenuItemCard } from "@/components/MenuItemCard";
import { MenuSkeleton } from "@/components/MenuSkeleton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { CartCta } from "@/components/CartCta";
import { Button } from "@repo/ui";

interface MealSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  cutoffMinutes: number;
}

interface MenuData {
  restaurant: { id: string; name: string };
  categories: {
    id: string;
    name: string;
    items: { id: string; name: string; description?: string; price: number; isAvailable: boolean; demandCount: number }[];
  }[];
}

function timeToMinutes(t: string) {
  const parts = t.split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

function isSlotOpen(slot: MealSlot) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime) - slot.cutoffMinutes;
  return nowMinutes >= start && nowMinutes < end;
}

export default function MenuPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string>();
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cart = useCart(slug);
  const [search, setSearch] = useState("");

  // Single request on first load - restaurant, meal slots, and the current
  // slot's menu all arrive together instead of two sequential round trips.
  useEffect(() => {
    fetchBootstrap(slug)
      .then((data) => {
        setMealSlots(data.mealSlots);
        setActiveSlotId(data.activeSlotId);
        setMenu({ restaurant: data.restaurant, categories: data.categories });
        localStorage.setItem(`mealSlot:${slug}`, data.activeSlotId);
      })
      .catch(() => setError("Couldn't load the menu. Try scanning the QR code again."));
  }, [slug]);

  const demand = useDemandSocket(menu?.restaurant.id);

  function selectSlot(slot: MealSlot) {
    setActiveSlotId(slot.id);
    if (isSlotOpen(slot)) localStorage.setItem(`mealSlot:${slug}`, slot.id);
    fetchMenu(slug, slot.id).then((data) => setMenu((prev) => (prev ? { ...prev, categories: data.categories } : prev)));
  }

  if (error) return <div className="mx-auto max-w-lg px-6 py-16 text-center text-chili-600">{error}</div>;
  if (!menu || !mealSlots.length) return <MenuSkeleton />;

  const activeSlot = mealSlots.find((s) => s.id === activeSlotId)!;
  // DEV-ONLY escape hatch: NEXT_PUBLIC_DEV_DISABLE_ORDER_RESTRICTIONS lets you
  // test checkout without fighting real-world meal-slot timing or stock
  // toggles while building. Must be unset (or false) before any real
  // deployment - the backend has its own matching guard on the cutoff check,
  // but "item marked sold out" is a real business toggle the backend always
  // still enforces regardless of this flag, so don't rely on this alone.
  const devBypass = process.env.NEXT_PUBLIC_DEV_DISABLE_ORDER_RESTRICTIONS === "true";
  const activeSlotOpen = devBypass || isSlotOpen(activeSlot);
  const allSoldOut = menu.categories.every((c) => c.items.every((i) => !i.isAvailable));

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Thin top nav - logo left, anchor links right that scroll straight
          down to their matching section in the footer. */}
      <div className="flex items-center justify-between border-b border-ink-100/10 bg-ink-900 px-6 py-3 text-ink-50">
        <div className="flex items-center gap-2">
          <Logo size={18} />
          <span className="text-sm font-medium tracking-wide">TheVisionForged</span>
        </div>
        <nav className="flex gap-5 text-xs text-ink-100/70">
          <a href="#about" className="transition-colors hover:text-ink-50">About Us</a>
          <a href="#help" className="transition-colors hover:text-ink-50">Help</a>
          <a href="#contact" className="transition-colors hover:text-ink-50">Contact</a>
        </nav>
      </div>

      {/* Full-bleed hero - fills the viewport width instead of being boxed
          into the same narrow column as the menu list below it. */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden bg-ink-900 px-6 pb-16 pt-14 text-ink-50"
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-turmeric-400), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-chili-400), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-turmeric-400">Order ahead</p>
          <h1 className="text-4xl font-display font-semibold sm:text-5xl">{menu.restaurant.name}</h1>
          <p className="mt-3 text-base text-ink-100/70">
            Fresh, made-to-order meals — ready the moment you arrive. No waiting in line.
          </p>
          <CartCta />
        </div>
      </motion.header>

      {/* Content sits in a wider column than before, with the meal-slot tabs
          and menu grid actually using the extra space on tablet/desktop. */}
      <main id="menu" className="mx-auto max-w-3xl px-6 pb-28 pt-6 scroll-mt-16">
        <nav className="sticky top-0 z-10 -mx-6 mb-6 flex gap-2 border-b border-ink-100 bg-ink-50/95 px-6 py-3 backdrop-blur">
          {mealSlots.map((slot) => {
            const open = isSlotOpen(slot);
            const active = slot.id === activeSlotId;
            return (
              <button
                key={slot.id}
                onClick={() => selectSlot(slot)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                  active
                    ? "bg-ink-900 text-ink-50"
                    : open
                    ? "bg-turmeric-100 text-turmeric-600"
                    : "bg-ink-100 text-ink-400"
                }`}
              >
                {slot.name}
                {!open && " · closed"}
              </button>
            );
          })}
        </nav>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the menu…"
          className="mb-4 w-full rounded-full border border-ink-100 bg-ink-50 px-4 py-2 text-sm placeholder:text-ink-400 focus:border-turmeric-400 focus:outline-none"
        />

        {!activeSlotOpen && (
          <p className="mb-6 rounded-card bg-ink-100 px-4 py-3 text-sm text-ink-700">
            {activeSlot.name} ordering runs {activeSlot.startTime}–{activeSlot.endTime}. You can browse the menu now,
            but ordering isn't open for this slot yet.
          </p>
        )}
        {activeSlotOpen && allSoldOut && (
          <p className="mb-6 rounded-card bg-ink-100 px-4 py-3 text-sm text-ink-700">
            Everything's sold out right now — check back closer to the next meal slot.
          </p>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={activeSlotId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            {menu.categories
              .map((category) => ({
                ...category,
                items: category.items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
              }))
              .filter((category) => category.items.length > 0)
              .map((category) => (
              <section key={category.id} className="mb-8">
                <h2 className="mb-2 text-xl font-display font-medium text-ink-700">{category.name}</h2>
                <div className="grid gap-x-8 sm:grid-cols-2">
                  {category.items.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                    >
                      <MenuItemCard
                        id={item.id}
                        name={item.name}
                        description={item.description}
                        price={item.price}
                        isAvailable={item.isAvailable && activeSlotOpen}
                        demandCount={demand[item.id] ?? item.demandCount}
                        quantity={cart.lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0}
                        onAdd={() => cart.addItem({ menuItemId: item.id, name: item.name, price: item.price })}
                        onQuantityChange={(q) => cart.setQuantity(item.id, q)}
                      />
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer restaurantName={menu.restaurant.name} />

      <AnimatePresence>
        {cart.lines.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 border-t border-ink-100 bg-ink-50 p-4"
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between">
              <div>
                <p className="text-sm text-ink-400">{cart.lines.length} item(s)</p>
                <p className="text-base font-medium text-ink-900">₹{cart.total.toFixed(2)}</p>
              </div>
              <Button onClick={() => router.push(`/r/${slug}/cart`)}>Review order</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
