/* Customer Dashboard — CoolAdmin UI, backed by /api/account/* */

const customer = getCustomer();
if (!customer || !customer.token) location.replace("login.html?next=dashboard.html");

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
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let orders = [];

async function api(path) {
  const res = await fetch("/api" + path, { headers: customerHeaders() });
  if (res.status === 401) { clearCustomer(); location.replace("login.html?next=dashboard.html"); throw new Error("auth"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function statusPill(status) {
  return `<span class="badge rounded-pill ${status === "cancelled" ? "bg-danger" : status === "completed" || status === "payout_released" ? "bg-success" : status === "pending_payment" || status === "awaiting_pickup_payment" ? "bg-warning text-dark" : "bg-primary"}">${esc(LABELS[status] || status)}</span>`;
}

function orderRow(o, { compact = false } = {}) {
  const when = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—";
  const items = (o.lines || []).map((l) => `${l.qty}× ${esc(l.name)}`).join(", ") || "—";
  const track = `<a class="m-btn m-btn--ghost btn-sm" href="track.html">Track</a>`;
  if (compact) {
    return `<tr><td><code>${esc(o.id)}</code></td><td>${esc(when)}</td><td class="num">${fmt(o.total)}</td><td>${statusPill(o.status)}</td><td>${track}</td></tr>`;
  }
  return `<tr>
    <td><code>${esc(o.id)}</code></td><td>${esc(when)}</td>
    <td style="max-width:280px">${items}</td>
    <td>${o.fulfillment === "pickup" ? "Pickup" : "Delivery"}</td>
    <td>${esc(o.paymentMethod || "—")}</td>
    <td class="num">${fmt(o.total)}</td>
    <td>${statusPill(o.status)}</td><td>${track}</td>
  </tr>`;
}

function renderStats() {
  const open = orders.filter((o) => !["completed", "payout_released", "cancelled"].includes(o.status)).length;
  const spent = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total || 0), 0);
  const pending = orders.filter((o) => ["pending_payment", "awaiting_pickup_payment"].includes(o.status)).length;
  document.getElementById("statOrders").textContent = orders.length;
  document.getElementById("statOpen").textContent = open;
  document.getElementById("statSpent").textContent = fmt(spent);
  document.getElementById("statPending").textContent = pending;
}

function renderOrders() {
  const recent = document.getElementById("recentOrdersBody");
  const all = document.getElementById("ordersBody");
  const sorted = orders.slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  recent.innerHTML = sorted.length
    ? sorted.slice(0, 5).map((o) => orderRow(o, { compact: true })).join("")
    : `<tr><td colspan="5" class="text-center text-muted py-4">No orders yet — <a href="shop.html">start shopping</a></td></tr>`;
  all.innerHTML = sorted.length
    ? sorted.map((o) => orderRow(o)).join("")
    : `<tr><td colspan="8" class="text-center text-muted py-4">No orders yet — <a href="shop.html">start shopping</a></td></tr>`;
}

function renderProfile(me) {
  const name = me.name || customer.name || "Customer";
  const email = me.email || customer.email || "";
  const phone = me.phone || customer.phone || "—";
  const since = me.createdAt ? new Date(me.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—";
  for (const id of ["acctName", "acctName2", "profName", "profName2"]) {
    const el = document.getElementById(id); if (el) el.textContent = name;
  }
  for (const id of ["acctEmail", "profEmail", "profEmail2"]) {
    const el = document.getElementById(id); if (el) el.textContent = email;
  }
  for (const id of ["profPhone", "profPhone2"]) {
    const el = document.getElementById(id); if (el) el.textContent = phone;
  }
  const sinceEl = document.getElementById("profSince"); if (sinceEl) sinceEl.textContent = since;
  const idEl = document.getElementById("profId"); if (idEl) idEl.textContent = me.id || customer.id || "—";
  const wl = document.getElementById("welcomeLine");
  if (wl) wl.innerHTML = `Welcome back, <strong>${esc(name)}</strong> — here&rsquo;s your account at a glance.`;
}

/* ---------- Panel switching ---------- */
function showPanel(name) {
  document.querySelectorAll(".dash-panel").forEach((p) => p.classList.add("d-none"));
  const panel = document.getElementById("panel-" + name);
  if (panel) panel.classList.remove("d-none");
  document.querySelectorAll("[data-panel-link]").forEach((a) => {
    const li = a.closest("li");
    if (li) li.classList.toggle("active", a.dataset.panelLink === name);
  });
}
document.querySelectorAll("[data-panel-link]").forEach((a) => {
  a.addEventListener("click", (e) => { e.preventDefault(); showPanel(a.dataset.panelLink); });
});

/* ---------- Logout ---------- */
function logout() { clearCustomer(); location.href = "index.html"; }
["sidebarLogout", "mobileLogout", "headerLogout", "logoutBtn2"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", (e) => { e.preventDefault(); logout(); });
});

/* ---------- Init ---------- */
(async function init() {
  try {
    const [me, list] = await Promise.all([api("/account/me"), api("/account/orders")]);
    orders = Array.isArray(list) ? list : [];
    renderProfile(me);
    renderStats();
    renderOrders();
  } catch (e) {
    if (e.message !== "auth") {
      document.getElementById("recentOrdersBody").innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Could not load orders — is the backend running?</td></tr>`;
    }
  }
})();
