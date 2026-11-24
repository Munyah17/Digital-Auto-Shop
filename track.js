/* Order tracking — GET /api/orders then filter client-side (add auth later) */

const STEPS = [
  "pending_payment",
  "paid_escrow",
  "dispatched",
  "delivered",
  "completed",
  "payout_released",
];
const PICKUP_STEPS = ["awaiting_pickup_payment", "pickup_confirmed", "completed"];

const LABELS = {
  pending_payment: "Awaiting payment",
  awaiting_pickup_payment: "Awaiting pickup payment",
  paid_escrow: "Payment secured (escrow)",
  pickup_confirmed: "Pickup payment confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  completed: "Completed",
  payout_released: "Seller paid out",
  cancelled: "Cancelled",
  created: "Order placed",
};

const fmt = (n) => "$" + Number(n).toLocaleString();
const $ = (id) => document.getElementById(id);

$("trackForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("orderId").value.trim();
  const out = $("result");
  out.innerHTML = `<p style="color:var(--muted);margin-top:20px">Looking up order…</p>`;
  try {
    const orders = await (await fetch("/api/orders")).json();
    const o = orders.find((x) => x.id === id || x.id.endsWith(id));
    if (!o) throw new Error("Order not found — check the ID.");
    render(o, out);
  } catch (err) {
    out.innerHTML = `<p style="color:#b91c1c;margin-top:20px">${err.message}</p>`;
  }
});

function render(o, out) {
  const isPickup = o.fulfillment === "pickup";
  const flow = isPickup ? PICKUP_STEPS : STEPS;
  const idx = flow.indexOf(o.status);

  const stepsHtml = flow.map((s, i) => {
    const ev = o.events.find((e) => e.status === s);
    const state = o.status === "cancelled" ? "" : i < idx ? "done" : i === idx ? "current" : "";
    return `
      <div class="t-step ${state}">
        <div class="t-dot">${i < idx || (o.status !== "cancelled" && i <= idx) ? "✓" : i + 1}</div>
        <div>
          <div class="t-label">${LABELS[s] || s}</div>
          <div class="t-time">${ev ? new Date(ev.at).toLocaleString() : "Pending"}</div>
        </div>
      </div>`;
  }).join("");

  const cancelledHtml = o.status === "cancelled"
    ? `<div class="t-step current"><div class="t-dot" style="background:#fee2e2;color:#b91c1c">✕</div><div><div class="t-label">Order cancelled</div></div></div>`
    : "";

  const pickupHtml = o.pickupCode
    ? `<div class="pickup-code"><div style="font-size:.78rem;color:#92400e;font-weight:600">PICKUP CODE — show this to the seller</div><strong>${o.pickupCode}</strong></div>`
    : "";

  const vendorsHtml = (o.vendorContacts || []).map((v) =>
    `<div style="margin-top:8px"><strong>${v.name}</strong> — ${v.phone}<br/><span style="font-size:.8rem;color:var(--muted)">${v.location}</span></div>`
  ).join("");

  out.innerHTML = `
    <div class="order-meta">
      <div><span>Order</span><strong>${o.id}</strong></div>
      <div><span>Status</span><strong>${LABELS[o.status] || o.status}</strong></div>
      <div><span>Fulfilment</span><strong>${o.fulfillment === "pickup" ? "Pickup" : "Delivery"}</strong></div>
      <div><span>Total</span><strong>${fmt(o.total)}</strong></div>
    </div>
    ${pickupHtml}
    ${vendorsHtml}
    <div style="font-size:.85rem;margin-bottom:8px"><strong>Items</strong></div>
    ${o.lines.map((l) => `<div style="font-size:.85rem;padding:4px 0">${l.qty}× ${l.name} — ${fmt(l.lineTotal)}</div>`).join("")}
    <div class="timeline">${stepsHtml}${cancelledHtml}</div>`;
}
