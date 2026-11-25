/* Seller Dashboard — talks to /api (backend/server.js) */

const API = "/api";
const LS_VENDOR = "das_vendor_id";

const $ = (id) => document.getElementById(id);
const toast = $("toast");
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

let vendor = null;
let products = [];
let orders = [];

/* ---------- Auth ---------- */
async function initLogin() {
  try {
    const vendors = await api("/vendors");
    $("vendorSelect").innerHTML =
      `<option value="">Select your shop…</option>` +
      vendors.map((v) => `<option value="${v.id}">${v.name} — ${v.location || ""}</option>`).join("");
  } catch {
    $("vendorSelect").innerHTML = `<option value="">API offline — start backend/server.js</option>`;
  }

  const saved = localStorage.getItem(LS_VENDOR);
  if (saved) {
    $("vendorSelect").value = saved;
    login(saved);
  }
}

$("loginBtn").addEventListener("click", () => {
  const id = $("vendorSelect").value;
  if (id) login(id);
});

$("registerToggle").addEventListener("click", (e) => {
  e.preventDefault();
  $("registerForm").classList.toggle("hidden");
});

$("regBtn").addEventListener("click", async () => {
  try {
    const v = await api("/vendors", {
      method: "POST",
      body: { name: $("regName").value, phone: $("regPhone").value, location: $("regLocation").value },
    });
    showToast("Account created — logging in");
    login(v.id);
  } catch (err) { showToast(err.message); }
});

async function login(id) {
  try {
    const vendors = await api("/vendors");
    vendor = vendors.find((v) => v.id === id);
    if (!vendor) throw new Error("Vendor not found");
    localStorage.setItem(LS_VENDOR, id);
    $("loginCard").classList.add("hidden");
    $("dash").classList.remove("hidden");
    $("vendorName").textContent = vendor.name;
    $("vendorMeta").textContent = `${vendor.location || ""} • ${vendor.phone} • KYC: ${vendor.kycStatus}`;
    await refresh();
  } catch (err) { showToast(err.message); }
}

$("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(LS_VENDOR);
  location.reload();
});

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    ["inventory", "pos", "orders", "payouts"].forEach((k) =>
      $("tab-" + k).classList.toggle("hidden", k !== t.dataset.tab)
    );
  })
);

/* ---------- Data ---------- */
async function refresh() {
  const [prods, ords, payout] = await Promise.all([
    api(`/vendors/${vendor.id}/products`),
    api("/orders"),
    api(`/vendors/${vendor.id}/payouts`).catch(() => null),
  ]);
  products = prods;
  orders = ords.filter((o) => o.lines.some((l) => l.vendorId === vendor.id));
  renderStats(payout);
  renderProducts();
  renderOrders();
  renderPayouts(payout);
  renderPosProducts();
  renderPosCart();
}

function renderStats(payout) {
  const active = products.filter((p) => p.active !== false).length;
  const lowStock = products.filter((p) => p.stock <= 5).length;
  const openOrders = orders.filter((o) => !["completed", "payout_released", "cancelled"].includes(o.status)).length;
  $("statGrid").innerHTML = [
    ["Products", products.length],
    ["Active listings", active],
    ["Low stock (≤5)", lowStock],
    ["Open orders", openOrders],
    ["Net payable", payout ? fmt(payout.netPayable) : "—"],
  ].map(([l, v]) => `<div class="stat-card"><span>${l}</span><strong>${v}</strong></div>`).join("");
}

/* ---------- Inventory ---------- */
$("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api(`/vendors/${vendor.id}/products`, {
      method: "POST",
      body: {
        name: $("pName").value, category: $("pCat").value,
        price: +$("pPrice").value, stock: +$("pStock").value,
      },
    });
    e.target.reset();
    showToast("Product added");
    refresh();
  } catch (err) { showToast(err.message); }
});

function renderProducts() {
  $("productRows").innerHTML = products.map((p) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.category}</td>
      <td>${fmt(p.price)}</td>
      <td>
        <input type="number" value="${p.stock}" min="0" data-id="${p.id}" class="stock-input"
          style="width:70px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;font-family:inherit"/>
      </td>
      <td><span class="pill ${p.stock > 0 ? "paid_escrow" : "cancelled"}">${p.stock > 0 ? "In stock" : "Out"}</span></td>
      <td><button class="btn btn-danger btn-sm" data-del="${p.id}">Delete</button></td>
    </tr>`).join("") || `<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:24px">No products yet — add your first above.</td></tr>`;
}

$("productRows").addEventListener("change", async (e) => {
  const inp = e.target.closest(".stock-input");
  if (!inp) return;
  try {
    await api(`/products/${inp.dataset.id}`, { method: "PATCH", body: { stock: +inp.value } });
    showToast("Stock updated");
    refresh();
  } catch (err) { showToast(err.message); }
});

$("productRows").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-del]");
  if (!btn) return;
  try {
    await api(`/products/${btn.dataset.del}`, { method: "PATCH", body: { active: false } });
    showToast("Product removed");
    refresh();
  } catch (err) { showToast(err.message); }
});

/* ---------- Orders ---------- */
const NEXT_ACTION = {
  paid_escrow: { to: "dispatched", label: "Mark dispatched" },
  pickup_confirmed: { to: "completed", label: "Confirm handover" },
  dispatched: { to: "delivered", label: "Mark delivered" },
};

function renderOrders() {
  $("orderRows").innerHTML = orders.map((o) => {
    const items = o.lines.filter((l) => l.vendorId === vendor.id);
    const action = NEXT_ACTION[o.status];
    return `
    <tr>
      <td><strong>${o.id}</strong><br/><span style="font-size:.74rem;color:var(--muted)">${o.createdAt.slice(0, 10)}</span></td>
      <td>${o.buyer.name}<br/><span style="font-size:.74rem;color:var(--muted)">${o.buyer.phone}</span></td>
      <td>${items.map((l) => `${l.qty}× ${l.name}`).join("<br/>")}</td>
      <td>${fmt(items.reduce((s, l) => s + l.lineTotal, 0))}</td>
      <td>${o.fulfillment}</td>
      <td><span class="pill ${o.status}">${o.status.replace(/_/g, " ")}</span></td>
      <td>${action ? `<button class="btn btn-primary btn-sm" data-order="${o.id}" data-to="${action.to}">${action.label}</button>` : "—"}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" style="color:var(--muted);text-align:center;padding:24px">No orders yet.</td></tr>`;
}

$("orderRows").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-order]");
  if (!btn) return;
  try {
    await api(`/orders/${btn.dataset.order}/transition`, {
      method: "POST",
      body: { to: btn.dataset.to, actor: "vendor" },
    });
    showToast("Order updated");
    refresh();
  } catch (err) { showToast(err.message); }
});

/* ---------- Point of Sale ---------- */
let posCart = [];

function renderPosProducts() {
  const sel = $("posProduct");
  const active = products.filter((p) => p.active !== false && p.stock > 0);
  sel.innerHTML = active.map((p) =>
    `<option value="${p.id}">${p.name} — ${fmt(p.price)} (${p.stock} in stock)</option>`
  ).join("") || `<option value="">No products in stock</option>`;
}

function renderPosCart() {
  const wrap = $("posCart");
  if (!posCart.length) {
    wrap.innerHTML = `<span style="color:var(--muted)">No items yet — pick a product and tap "Add to sale".</span>`;
  } else {
    wrap.innerHTML = posCart.map((c, i) => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)">
        <span>${c.qty}× ${c.name}</span>
        <span>${fmt(c.price * c.qty)} <button type="button" data-posdel="${i}" style="border:none;background:none;color:#b91c1c;cursor:pointer;font-weight:700">✕</button></span>
      </div>`).join("");
  }
  const total = posCart.reduce((s, c) => s + c.price * c.qty, 0);
  $("posTotal").textContent = fmt(total);
  $("posComplete").disabled = !posCart.length;
}

$("posAdd").addEventListener("click", () => {
  const id = $("posProduct").value;
  const p = products.find((x) => x.id === id);
  const qty = Math.max(1, +$("posQty").value || 1);
  if (!p) { showToast("Select a product"); return; }
  const existing = posCart.find((c) => c.name === p.name);
  if (existing) existing.qty += qty;
  else posCart.push({ productId: p.id, name: p.name, price: p.price, qty });
  renderPosCart();
});

$("posCart").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-posdel]");
  if (!btn) return;
  posCart.splice(+btn.dataset.posdel, 1);
  renderPosCart();
});

$("posComplete").addEventListener("click", async () => {
  if (!posCart.length) return;
  try {
    const order = await api("/pos/sale", {
      method: "POST",
      body: {
        vendorId: vendor.id,
        items: posCart.map((c) => ({ productId: c.productId, qty: c.qty })),
        paymentMethod: $("posPay").value,
        buyerPhone: $("posPhone").value.trim() || undefined,
      },
    });
    $("posReceipt").classList.remove("hidden");
    $("posReceipt").innerHTML = `
      <strong>Sale complete — ${order.id}</strong><br/>
      ${order.lines.map((l) => `${l.qty}× ${l.name}`).join("<br/>")}
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">
        Total: <strong>${fmt(order.total)}</strong> • Commission: ${fmt(order.commission)} • Net: ${fmt(order.total - order.commission)}
      </div>`;
    posCart = [];
    renderPosCart();
    showToast("Sale recorded");
    refresh();
  } catch (err) { showToast(err.message); }
});

/* ---------- Payouts ---------- */
function renderPayouts(p) {
  if (!p) { $("payoutStats").innerHTML = ""; return; }
  $("payoutStats").innerHTML = [
    ["Released orders", p.ordersCount],
    ["Gross sales", fmt(p.gross)],
    ["Commission (8%)", "−" + fmt(p.commissionDeducted)],
    ["Net payable", fmt(p.netPayable)],
  ].map(([l, v]) => `<div class="stat-card"><span>${l}</span><strong>${v}</strong></div>`).join("");
}

const fmt = (n) => "$" + Number(n).toLocaleString();

initLogin();
