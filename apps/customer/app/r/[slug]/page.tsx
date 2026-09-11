"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchBootstrap } from "@/lib/api";
import { useDemandSocket } from "@/lib/useDemandSocket";
import { useCart } from "@/lib/useCart";
import { MenuItemCard } from "@/components/MenuItemCard";
import { MenuSkeleton } from "@/components/MenuSkeleton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { CartCta } from "@/components/CartCta";
import { Marquee } from "@/components/Marquee";
import { AmbientBackdrop } from "@/components/AmbientBackdrop";
import { Button } from "@repo/ui";

interface MealSlot { id: string; name: string; startTime: string; endTime: string; cutoffMinutes: number }
interface MenuItemT { id: string; name: string; description?: string; price: number; isAvailable: boolean; demandCount: number }
interface CategoryT { id: string; name: string; items: MenuItemT[] }
interface MenuData {
  restaurant: { id: string; name: string };
  categories: CategoryT[];
  categoriesBySlot: Record<string, CategoryT[]>;
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
  const [search, setSearch] = useState("");
  const cart = useCart(slug);

  useEffect(() => {
    fetchBootstrap(slug)
      .then((data) => {
        setMealSlots(data.mealSlots);
        setActiveSlotId(data.activeSlotId);
        setMenu({ restaurant: data.restaurant, categories: data.categories, categoriesBySlot: data.categoriesBySlot });
        localStorage.setItem(`mealSlot:${slug}`, data.activeSlotId);
      })
      .catch(() => setError("Couldn't load the menu. Try scanning the QR code again."));
  }, [slug]);

  const demand = useDemandSocket(menu?.restaurant.id);
  const devBypass = process.env.NEXT_PUBLIC_DEV_DISABLE_ORDER_RESTRICTIONS === "true";

  function selectSlot(slot: MealSlot) {
    setActiveSlotId(slot.id);
    if (isSlotOpen(slot) || devBypass) localStorage.setItem(`mealSlot:${slug}`, slot.id);
  }

  const trendingNames = useMemo(() => {
    if (!menu) return [];
    const all = menu.categories.flatMap((c) => c.items);
    return all
      .filter((i) => (demand[i.id] ?? i.demandCount) > 0)
      .map((i) => `${i.name} is trending`)
      .slice(0, 5);
  }, [menu, demand]);

  if (error) return <div className="mx-auto max-w-lg px-6 py-16 text-center text-chili-600">{error}</div>;
  if (!menu || !mealSlots.length) return <MenuSkeleton />;

  const bannerItems = trendingNames.length > 0
    ? trendingNames
    : ["Fresh, made-to-order meals", "Order ahead, skip the wait", "New menu items added regularly"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink-50 via-ink-50 to-turmeric-100/20">
      <div className="flex items-center justify-between border-b border-ink-100/10 bg-ink-900 px-6 py-3 text-ink-50">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
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
      </div>

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden bg-ink-900 px-6 pb-16 pt-14 text-ink-50"
      >
        <AmbientBackdrop />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, var(--color-turmeric-400), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, var(--color-chili-400), transparent 70%)" }} />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-turmeric-400">Order ahead</p>
          <h1 className="text-4xl font-display font-semibold sm:text-5xl">{menu.restaurant.name}</h1>
          <p className="mx-auto mt-3 max-w-md text-base text-ink-100/70">
            Fresh, made-to-order meals — ready the moment you arrive. No waiting in line.
          </p>
          <CartCta />
        </div>
      </motion.header>

      <Marquee items={bannerItems} />

      <main id="menu" className="mx-auto max-w-5xl px-6 pb-28 pt-8 scroll-mt-16">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the menu…"
          className="mb-8 w-full rounded-full border border-ink-100 bg-ink-50 px-4 py-2 text-sm placeholder:text-ink-400 focus:border-turmeric-400 focus:outline-none"
        />

        {/* Breakfast / Lunch / Dinner side-by-side on desktop, stacked on mobile -
            each column shows that slot's actual items via categoriesBySlot,
            not a shared list behind a tab switch. */}
        <div className="grid gap-8 md:grid-cols-3">
          {mealSlots.map((slot) => {
            const open = isSlotOpen(slot) || devBypass;
            const isActive = slot.id === activeSlotId;
            const categories = (menu.categoriesBySlot[slot.id] ?? [])
              .map((cat) => ({ ...cat, items: cat.items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())) }))
              .filter((cat) => cat.items.length > 0);

            return (
              <section key={slot.id} className={`rounded-card border p-4 ${isActive ? "border-turmeric-400" : "border-ink-100"}`}>
                <button onClick={() => selectSlot(slot)} className="mb-4 flex w-full items-center justify-between">
                  <span className="font-display text-lg font-semibold capitalize text-ink-900">{slot.name}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${open ? "bg-leaf-100 text-leaf-700" : "bg-ink-100 text-ink-400"}`}>
                    {open ? "Open now" : `${slot.startTime}–${slot.endTime}`}
                  </span>
                </button>

                {categories.length === 0 && <p className="text-sm text-ink-400">No items yet.</p>}

                <AnimatePresence>
                  {categories.map((category) => (
                    <div key={category.id} className="mb-4">
                      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">{category.name}</h3>
                      {category.items.map((item, i) => (
                        <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.03 }}>
                          <MenuItemCard
                            id={item.id}
                            name={item.name}
                            description={item.description}
                            price={item.price}
                            isAvailable={item.isAvailable && open}
                            demandCount={demand[item.id] ?? item.demandCount}
                            quantity={cart.lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0}
                            onAdd={() => {
                              selectSlot(slot);
                              cart.addItem({ menuItemId: item.id, name: item.name, price: item.price });
                            }}
                            onQuantityChange={(q) => cart.setQuantity(item.id, q)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
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
            <div className="mx-auto flex max-w-5xl items-center justify-between">
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
