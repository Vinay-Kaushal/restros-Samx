# Restaurant pre-order SaaS — starter scaffold

This is the working scaffold for the architecture in `restaurant-preorder-saas-plan.md`.
It implements the real core of the system end to end — QR landing → menu with
live demand → checkout → admin live dashboard — using the confirmed stack:

- **apps/customer** — Next.js customer ordering PWA (Tailwind)
- **apps/admin** — Next.js kitchen/staff dashboard
- **apps/api** — Bun + Express API, `ws` real-time layer, BullMQ scheduler
- **packages/types** — shared TypeScript types (used by all three apps)
- **packages/ui** — shared React components (Button, DemandBadge, StatusPill)
- **packages/config** — shared Tailwind design tokens

## What's implemented vs. stubbed

**Implemented:**
- Monorepo wiring (Turborepo workspaces)
- Prisma schema matching the data model in the plan
- Order creation with server-side meal-slot cutoff validation
- The live demand feature: Redis counters + pub/sub → WebSocket → both the
  customer menu badge and the admin feed update in real time
- Admin dashboard: live order feed, status filters, advance-status action
- Design tokens intentionally chosen for a food app, not a generic dashboard
  template (see `packages/config/tailwind.preset.js`)

**Stubbed / left for you to fill in (called out with `TODO` comments in code):**
- Auth (both customer OTP and admin login)
- Razorpay integration (Section 8 of the plan) — the `paymentMethod` field
  and `PENDING_PAYMENT` status already exist in the schema/API, ready for it
- Meal-slot picker on the customer side (currently a placeholder `"current"` ID)
- RLS policies in Supabase (see the caveat comment at the top of `schema.prisma`
  — this needs a real decision on how the Prisma connection respects RLS)
- The Waiting Lounge game layer (Section 11) — the WebSocket room concept it
  would reuse is already in place in `apps/api/src/realtime/ws.ts`

## Getting started

```bash
# 1. Install dependencies (Bun for the API, npm/pnpm/bun for the rest — pick one and be consistent)
bun install       # or: npm install / pnpm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
# fill in DATABASE_URL (Supabase) and REDIS_URL (Upstash or local Redis)

# 3. Run migrations
npm run db:migrate

# 4. Seed at least one restaurant, meal slot, table, and menu item so the
#    customer app has something to render (a seed script isn't included yet —
#    use `prisma studio` or write a quick seed.ts)
npm run db:studio

# 5. Run everything
npm run dev
# customer app -> http://localhost:3000
# admin app    -> http://localhost:3001
# api          -> http://localhost:4000
```

To try the flow: visit `http://localhost:3000/r/{your-restaurant-slug}/t/{table-id}`
(the URL a QR code would encode), add items, and check out. Open the admin
dashboard in another tab to watch the order arrive live.

## Suggested next steps, in order

1. Write a Prisma seed script so there's real data to develop against.
2. Decide the RLS connection strategy (see the schema.prisma comment) before
   building more on top of it — this gets harder to retrofit later.
3. Add the meal-slot picker and wire the placeholder `"current"` slot ID to
   the actual current slot from `GET /api/r/:slug/meal-slots` (route not yet
   built).
4. Add customer phone OTP verification before order submission.
5. Razorpay integration per Section 8 of the plan.
