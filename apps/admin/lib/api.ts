const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchOrders(slug: string) {
  const res = await fetch(`${API_BASE}/api/r/${slug}/orders`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
}

export async function updateOrderStatus(slug: string, orderId: string, status: string) {
  const res = await fetch(`${API_BASE}/api/r/${slug}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error("Failed to update order");
  return res.json();
}
