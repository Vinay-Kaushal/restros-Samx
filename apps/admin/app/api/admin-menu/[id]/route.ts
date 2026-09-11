import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SLUG = process.env.NEXT_PUBLIC_DEMO_RESTAURANT_SLUG ?? "demo-restaurant";

function isAuthed() {
  return cookies().get("admin_auth")?.value === "true";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await req.json();
  const res = await fetch(`${API_BASE}/api/r/${SLUG}/admin/menu-items/${params.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" },
    body: JSON.stringify(body)
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const res = await fetch(`${API_BASE}/api/r/${SLUG}/admin/menu-items/${params.id}`, {
    method: "DELETE",
    headers: { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" }
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
