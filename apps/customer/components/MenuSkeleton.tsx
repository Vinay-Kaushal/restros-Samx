// Shown for the brief window between landing on the page and the menu data
// arriving - a shaped placeholder that mirrors the real layout reads as
// "this is loading" instead of a jarring blank screen + text, and avoids
// any layout shift once the real content swaps in.
export function MenuSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-ink-50">
      <div className="h-11 bg-ink-900" />
      <div className="h-40 bg-ink-900/90" />
      <div className="mx-auto max-w-3xl px-6 pt-6">
        <div className="mb-6 h-6 w-24 rounded-full bg-ink-100" />
        <div className="mb-2 h-5 w-20 rounded bg-ink-100" />
        <div className="grid gap-x-8 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between border-b border-ink-100 py-4">
              <div className="w-2/3">
                <div className="mb-2 h-4 w-3/4 rounded bg-ink-100" />
                <div className="h-3 w-1/2 rounded bg-ink-100" />
              </div>
              <div className="h-9 w-16 rounded-card bg-ink-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
