import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SLUG = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_SLUG ?? "demo-restaurant";

// Server-side proxy: the browser calls THIS route (protected by the same
// admin_auth cookie every other dashboard page uses), and this route - which
// runs on the server, never in the browser - attaches ADMIN_API_SECRET when
// forwarding to the backend. The secret itself is never sent to the client.
function isAuthed() {
  return cookies().get("admin_auth")?.value === "true";
}

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const res = await fetch(`${API_BASE}/api/r/${SLUG}/admin/menu`, {
    headers: { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" },
    cache: "no-store"
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await req.json();
  const path = body._kind === "category" ? "categories" : "menu-items";
  const res = await fetch(`${API_BASE}/api/r/${SLUG}/admin/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" },
    body: JSON.stringify(body)
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
