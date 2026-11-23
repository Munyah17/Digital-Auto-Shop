"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STATUSES: Record<string, string[]> = {
  pending:          ["awaiting_payment", "cancelled", "failed"],
  awaiting_payment: ["paid", "cancelled", "failed"],
  paid:             ["processing", "refunded", "cancelled"],
  processing:       ["shipped", "cancelled", "refunded"],
  shipped:          ["delivered", "cancelled"],
  delivered:        ["refunded"],
  cancelled:        [],
  refunded:         [],
  failed:           ["awaiting_payment"],
};

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const options = NEXT_STATUSES[status] ?? [];
  if (options.length === 0) return null;

  async function update(next: string) {
    if (!next) return;
    setSaving(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      defaultValue=""
      disabled={saving}
      onChange={(e) => update(e.target.value)}
      className="bg-obsidian-800 border border-obsidian-700 rounded-lg px-2 py-1.5 text-xs text-obsidian-300 hover:border-gold-500/50 focus:outline-none focus:border-gold-500 disabled:opacity-50 capitalize cursor-pointer"
    >
      <option value="" disabled>
        {saving ? "Saving…" : "Move to…"}
      </option>
      {options.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
