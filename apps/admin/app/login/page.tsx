"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Login failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-xl font-semibold text-ink-900">Staff login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          required
          autoFocus
          placeholder="Password"
          className="w-full rounded-card border border-ink-100 px-4 py-2.5 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-chili-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Checking…" : "Log in"}
        </Button>
      </form>
    </main>
  );
}
