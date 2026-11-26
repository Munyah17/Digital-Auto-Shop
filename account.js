const customer = getCustomer();
if (!customer || !customer.token) location.replace("login.html?next=account.html");

const LABELS = {
  pending_payment: "Awaiting payment",
  awaiting_pickup_payment: "Awaiting pickup payment",
  paid_escrow: "Payment received",
  pickup_confirmed: "Pickup confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  completed: "Completed",
  payout_released: "Closed",
  cancelled: "Cancelled",
};
const fmt = (n) => "$" + Number(n || 0).toLocaleString();

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

document.getElementById("signOut").addEventListener("click", () => {
  clearCustomer();
  location.href = "login.html";
});

function orderCard(order) {
  const lines = (order.lines || []).map((line) => `<li>${line.qty} × ${escapeHtml(line.name)}</li>`).join("");
  const when = order.createdAt ? new Date(order.createdAt).toLocaleString() : "";
  return `<article class="order-card">
    <div class="order-card-top">
      <div>
        <h3>${escapeHtml(order.id)}</h3>
        <div class="order-meta-line">${escapeHtml(when)} · ${escapeHtml(order.paymentMethod || "")} · ${order.fulfillment === "pickup" ? "Pickup" : "Delivery"}</div>
      </div>
      <span class="pill ${escapeHtml(order.status)}">${escapeHtml(LABELS[order.status] || order.status)}</span>
    </div>
    <ul class="order-lines">${lines}</ul>
    <div class="order-total">${fmt(order.total)}</div>
    ${order.pickupCode ? `<div class="order-meta-line">Pickup code: ${escapeHtml(order.pickupCode)}</div>` : ""}
    <div class="order-meta-line"><a href="track.html">Track this order</a></div>
  </article>`;
}

async function loadAccount() {
  const res = await fetch("/api/account/orders", { headers: customerHeaders() });
  if (res.status === 401) {
    clearCustomer();
    location.replace("login.html?next=account.html");
    return;
  }
  const orders = await res.json();
  const me = await (await fetch("/api/account/me", { headers: customerHeaders() })).json();
  document.getElementById("acctName").textContent = me.name || "Your account";
  document.getElementById("acctMeta").textContent = [me.email, me.phone].filter(Boolean).join(" · ");
  const spent = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total || 0), 0);
  const open = orders.filter((o) => !["completed", "payout_released", "cancelled"].includes(o.status)).length;
  document.getElementById("acctStats").innerHTML = [
    ["Orders", orders.length],
    ["Open", open],
    ["Spent", fmt(spent)],
  ].map(([label, value]) => `<div class="portal-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");
  const list = document.getElementById("orderList");
  list.innerHTML = orders.length
    ? orders.slice().reverse().map(orderCard).join("")
    : `<div class="order-card"><h3>No orders yet</h3><p class="order-meta-line">When you check out, your orders and payments show up here. Guest checkout still works.</p><p style="margin-top:10px"><a class="btn btn-solid" href="shop.html">Browse the shop</a></p></div>`;
}

loadAccount().catch(() => {
  document.getElementById("orderList").innerHTML = `<div class="order-card"><p>Could not load your orders. Check that the shop API is running.</p></div>`;
});
