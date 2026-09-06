export default function ConfirmationPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-ink-900">Order placed</h1>
      <p className="text-ink-400">
        The kitchen has your order. You'll be notified when it's ready.
      </p>
      {/* Waiting Lounge (plan Section 11) mounts here in Phase 3 - a room
          keyed by restaurantId + mealSlotId, reusing the ws connection this
          page already has access to via useDemandSocket. */}
    </main>
  );
}
