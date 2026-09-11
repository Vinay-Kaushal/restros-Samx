"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui";

interface MealSlot { id: string; name: string }
interface MenuItem {
  id: string; categoryId: string; name: string; description?: string;
  price: number; isAvailable: boolean; mealSlots: MealSlot[];
}
interface Category { id: string; name: string; items: MenuItem[] }

export default function MenuManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [newItem, setNewItem] = useState({ categoryId: "", name: "", description: "", price: "", mealSlotIds: [] as string[] });
  const [newCategoryName, setNewCategoryName] = useState("");

  function load() {
    fetch("/api/admin-menu").then((r) => r.json()).then((data) => {
      setCategories(data.categories ?? []);
      setMealSlots(data.mealSlots ?? []);
      if (!newItem.categoryId && data.categories?.[0]) {
        setNewItem((prev) => ({ ...prev, categoryId: data.categories[0].id }));
      }
    });
  }
  useEffect(load, []);

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    await fetch("/api/admin-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _kind: "category", name: newCategoryName })
    });
    setNewCategoryName("");
    load();
  }

  async function addItem() {
    if (!newItem.name || !newItem.price || !newItem.categoryId) return;
    await fetch("/api/admin-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newItem, price: Number(newItem.price) })
    });
    setNewItem({ categoryId: newItem.categoryId, name: "", description: "", price: "", mealSlotIds: [] });
    load();
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch(`/api/admin-menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable })
    });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Remove this item from the menu?")) return;
    await fetch(`/api/admin-menu/${id}`, { method: "DELETE" });
    load();
  }

  function toggleSlotOnNewItem(slotId: string) {
    setNewItem((prev) => ({
      ...prev,
      mealSlotIds: prev.mealSlotIds.includes(slotId)
        ? prev.mealSlotIds.filter((id) => id !== slotId)
        : [...prev.mealSlotIds, slotId]
    }));
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Menu management</h1>
        <a href="/dashboard" className="text-sm font-medium text-chili-600">← Back to live orders</a>
      </div>

      {categories.map((category) => (
        <section key={category.id} className="mb-8">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-400">{category.name}</h2>
          <div className="divide-y divide-ink-100 rounded-card border border-ink-100">
            {category.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{item.name} · ₹{Number(item.price)}</p>
                  <p className="text-xs text-ink-400">
                    {item.mealSlots.length > 0 ? item.mealSlots.map((s) => s.name).join(", ") : "All meal slots"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${item.isAvailable ? "bg-leaf-100 text-leaf-700" : "bg-ink-100 text-ink-400"}`}
                  >
                    {item.isAvailable ? "Available" : "Sold out"}
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="text-xs text-chili-600">Remove</button>
                </div>
              </div>
            ))}
            {category.items.length === 0 && <p className="px-4 py-3 text-sm text-ink-400">No items yet.</p>}
          </div>
        </section>
      ))}

      <section className="mb-8 rounded-card border border-ink-100 p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-700">Add a new item</h2>
        <div className="space-y-3">
          <select
            value={newItem.categoryId}
            onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
            className="w-full rounded-card border border-ink-100 px-3 py-2 text-sm"
          >
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-full rounded-card border border-ink-100 px-3 py-2 text-sm" />
          <input placeholder="Description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="w-full rounded-card border border-ink-100 px-3 py-2 text-sm" />
          <input placeholder="Price (₹)" type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            className="w-full rounded-card border border-ink-100 px-3 py-2 text-sm" />
          <div>
            <p className="mb-1 text-xs text-ink-400">Available in (leave blank for all slots)</p>
            <div className="flex gap-2">
              {mealSlots.map((slot) => (
                <button key={slot.id} type="button" onClick={() => toggleSlotOnNewItem(slot.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    newItem.mealSlotIds.includes(slot.id) ? "bg-turmeric-400 text-ink-900" : "bg-ink-100 text-ink-400"
                  }`}>
                  {slot.name}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={addItem}>Add item</Button>
        </div>
      </section>

      <section className="rounded-card border border-ink-100 p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-700">Add a category</h2>
        <div className="flex gap-2">
          <input placeholder="e.g. Desserts" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1 rounded-card border border-ink-100 px-3 py-2 text-sm" />
          <Button onClick={addCategory}>Add</Button>
        </div>
      </section>
    </main>
  );
}
