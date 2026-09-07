const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchMenu(slug: string, mealSlotId?: string) {
  const url = new URL(`${API_BASE}/api/r/${slug}/menu`);
  if (mealSlotId) url.searchParams.set("mealSlotId", mealSlotId);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menu");
  return res.json();
}

// TODO: this just picks the first meal slot returned. Once there's a real
// need to distinguish breakfast/lunch/dinner by time of day, match against
// mealSlot.startTime/endTime here instead.
export async function fetchCurrentMealSlot(slug: string) {
  const res = await fetch(`${API_BASE}/api/r/${slug}/meal-slots`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load meal slots");
  const { mealSlots } = await res.json();
  return mealSlots[0] as { id: string; name: string } | undefined;
}

export async function submitOrder(slug: string, payload: unknown) {
  const res = await fetch(`${API_BASE}/api/r/${slug}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to place order");
  }
  return res.json();
}

export async function createPayment(slug: string, orderId: string) {
  const res = await fetch(`${API_BASE}/api/r/${slug}/orders/${orderId}/create-payment`, {
    method: "POST"
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to start payment");
  }
  return res.json();
}
