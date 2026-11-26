/* Super Admin — hero slide manager (localStorage-backed, API-ready) */

const SLIDES_KEY = "das_slides_v1";
const MAX_SLIDES = 10;
const AUTH_KEY = "das_admin_auth";

function getToken() { try { return JSON.parse(localStorage.getItem(AUTH_KEY))?.token || ""; } catch { return ""; } }
function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }
function setAuth(data) { localStorage.setItem(AUTH_KEY, JSON.stringify({ token: data.token, user: data.user, at: Date.now() })); }
function clearAuth() { localStorage.removeItem(AUTH_KEY); }

const DEFAULT_SLIDES = [
  { active: true, banner: "gradient-blue", eyebrow: "Zimbabwe's Most Trusted Tech & Auto Store", title: "Everything your car, phone & work needs.", titleAccent: "phone & work", subtitle: "Phones, gadgets, genuine vehicle parts and laptops — all under one roof, delivered fast across Zimbabwe.", ctaText: "Shop Now", ctaLink: "shop.html", cta2Text: "Talk to an Expert", cta2Link: "#cta" },
  { active: true, banner: "gradient-cyan", eyebrow: "New Arrivals", title: "iPhone 15 Pro Max now in stock.", titleAccent: "iPhone 15 Pro Max", subtitle: "Latest flagship with trade-in offers and 0% EcoCash instalments available.", ctaText: "Shop Phones", ctaLink: "shop.html?category=phones-gadgets", cta2Text: "See Deals", cta2Link: "shop.html" },
  { active: true, banner: "gradient-indigo", eyebrow: "Auto Season", title: "Genuine parts, fitted while you wait.", titleAccent: "genuine parts", subtitle: "OEM brake pads, batteries, tyres and fluids for Toyota, Nissan, Ford & Isuzu — free fitting included.", ctaText: "Shop Parts", ctaLink: "shop.html?category=vehicle-parts", cta2Text: "Book Fitting", cta2Link: "#cta" },
];

const GRADIENT_LABELS = {
  "gradient-blue": "Blue",
  "gradient-cyan": "Cyan",
  "gradient-indigo": "Indigo",
  "gradient-sky": "Sky",
};

function load() {
  try {
    const raw = localStorage.getItem(SLIDES_KEY);
    if (!raw) return DEFAULT_SLIDES.map((s) => ({ ...s }));
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.slice(0, MAX_SLIDES) : DEFAULT_SLIDES.map((s) => ({ ...s }));
  } catch {
    return DEFAULT_SLIDES.map((s) => ({ ...s }));
  }
}

let slides = load();
const listEl = document.getElementById("slideList");
const toast = document.getElementById("toast");
let toastTimer;

async function apiSlides() {
  try {
    const res = await fetch("/api/admin/slides", { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch { return null; }
}

async function persist() {
  localStorage.setItem(SLIDES_KEY, JSON.stringify(slides.slice(0, MAX_SLIDES)));
  // best-effort sync to backend (works when API is running)
  try {
    await fetch("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ slides: slides.slice(0, MAX_SLIDES) }),
    });
  } catch { /* offline — localStorage is the fallback */ }
  toast.textContent = "Saved ✓";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function bannerPreview(banner) {
  if (!banner) return `<div class="banner-preview">No banner — slide hidden</div>`;
  if (banner.startsWith("http")) {
    return `<div class="banner-preview"><img src="${banner}" alt="" onerror="this.parentElement.textContent='Image failed to load'"/></div>`;
  }
  const gradients = {
    "gradient-blue": "linear-gradient(120deg,#0e2a6e,#1d5bf0)",
    "gradient-cyan": "linear-gradient(120deg,#083344,#0ea5e9)",
    "gradient-indigo": "linear-gradient(120deg,#1e1b4b,#4f46e5)",
    "gradient-sky": "linear-gradient(120deg,#0c4a6e,#38bdf8)",
  };
  const g = gradients[banner] || gradients["gradient-blue"];
  return `<div class="banner-preview" style="background:${g};color:#fff;font-weight:600">${GRADIENT_LABELS[banner] || banner} gradient</div>`;
}

function render() {
  listEl.innerHTML = slides.map((s, i) => `
    <div class="slide-card ${s.active && s.banner ? "" : "disabled"}">
      <div class="slide-top">
        <span class="slide-num">Slide ${i + 1}</span>
        <div style="display:flex;align-items:center;gap:14px">
          <span class="slide-status ${s.active && s.banner ? "on" : "off"}">${s.active && s.banner ? "Live" : "Hidden"}</span>
          <button class="toggle ${s.active ? "on" : ""}" data-i="${i}" data-field="active" aria-label="Toggle slide"></button>
        </div>
      </div>

      <div class="field">
        <label>Banner (image URL or gradient preset)</label>
        <input type="text" data-i="${i}" data-field="banner" value="${s.banner || ""}" placeholder="https://…/banner.jpg  or  gradient-blue" list="gradients"/>
        <datalist id="gradients">
          <option value="gradient-blue"></option>
          <option value="gradient-cyan"></option>
          <option value="gradient-indigo"></option>
          <option value="gradient-sky"></option>
        </datalist>
      </div>

      <div class="field">
        <label>Eyebrow / tag</label>
        <input type="text" data-i="${i}" data-field="eyebrow" value="${s.eyebrow || ""}" placeholder="e.g. New Arrivals"/>
      </div>

      <div class="field">
        <label>Title</label>
        <input type="text" data-i="${i}" data-field="title" value="${s.title || ""}" placeholder="Headline text"/>
      </div>

      <div class="field">
        <label>Accent phrase (highlighted)</label>
        <input type="text" data-i="${i}" data-field="titleAccent" value="${s.titleAccent || ""}" placeholder="Part of title to highlight"/>
      </div>

      <div class="field" style="grid-column:1/-1">
        <label>Subtitle</label>
        <textarea rows="2" data-i="${i}" data-field="subtitle" placeholder="Supporting text">${s.subtitle || ""}</textarea>
      </div>

      <div class="field-row">
        <div class="field">
          <label>Primary CTA text</label>
          <input type="text" data-i="${i}" data-field="ctaText" value="${s.ctaText || ""}"/>
        </div>
        <div class="field">
          <label>Primary CTA link</label>
          <input type="text" data-i="${i}" data-field="ctaLink" value="${s.ctaLink || ""}"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Secondary CTA text</label>
          <input type="text" data-i="${i}" data-field="cta2Text" value="${s.cta2Text || ""}"/>
        </div>
        <div class="field">
          <label>Secondary CTA link</label>
          <input type="text" data-i="${i}" data-field="cta2Link" value="${s.cta2Link || ""}"/>
        </div>
      </div>

      ${bannerPreview(s.banner)}
    </div>`).join("");

  document.getElementById("addSlide").disabled = slides.length >= MAX_SLIDES;
  document.getElementById("addSlide").textContent =
    slides.length >= MAX_SLIDES ? "Max 10 slides reached" : "+ Add slide (max 10)";
}

/* Toggle active */
listEl.addEventListener("click", (e) => {
  const t = e.target.closest(".toggle");
  if (!t) return;
  slides[+t.dataset.i].active = !slides[+t.dataset.i].active;
  persist(); render();
});

/* Field edits */
listEl.addEventListener("input", (e) => {
  const el = e.target.closest("[data-field]");
  if (!el || el.classList.contains("toggle")) return;
  const { i, field } = el.dataset;
  slides[+i][field] = el.value;
  persist();
  // live-update preview/status without full re-render on every keystroke
  if (field === "banner") {
    const card = el.closest(".slide-card");
    const prev = card.querySelector(".banner-preview");
    if (prev) prev.outerHTML = bannerPreview(el.value);
    card.classList.toggle("disabled", !(slides[+i].active && el.value));
  }
});

/* Add slide */
document.getElementById("addSlide").addEventListener("click", () => {
  if (slides.length >= MAX_SLIDES) return;
  slides.push({
    active: false, banner: "", eyebrow: "", title: "New slide title",
    titleAccent: "", subtitle: "", ctaText: "Shop Now", ctaLink: "shop.html",
    cta2Text: "", cta2Link: "",
  });
  persist(); render();
});

/* Reset */
document.getElementById("resetDefaults").addEventListener("click", () => {
  slides = DEFAULT_SLIDES.map((s) => ({ ...s }));
  persist(); render();
});

async function init() {
  const remote = await apiSlides();
  if (remote && remote.length) slides = remote.slice(0, MAX_SLIDES);
  render();
}

const loginCard = document.getElementById("loginCard");
const adminPanel = document.getElementById("adminPanel");
const loginError = document.getElementById("loginError");

function showLogin(msg) {
  loginCard.classList.remove("hidden");
  adminPanel.classList.add("hidden");
  loginError.textContent = msg || "";
}
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

async function loadMailbox() {
  const status = document.getElementById("mailStatus");
  const list = document.getElementById("mailList");
  if (!status || !list) return;
  try {
    const res = await fetch("/api/admin/notifications", { headers: authHeaders() });
    if (res.status === 401) return;
    if (!res.ok) throw new Error("unavailable");
    const data = await res.json();
    const rows = [
      ...(data.inbox || []).map((m) => ({ when: m.receivedAt || m.date, title: m.subject || "Mailbox message", meta: m.from || "", body: m.text || "" })),
      ...(data.messages || []).map((m) => ({ when: m.createdAt, title: "Website: " + (m.name || "Message"), meta: [m.email, m.phone].filter(Boolean).join(" · "), body: m.message || "" })),
    ].sort((a, b) => String(b.when || "").localeCompare(String(a.when || "")));
    status.textContent = data.configured
      ? (rows.length ? "Automatic mail is on. Newest notifications are listed here." : "Automatic mail is on. No notifications yet.")
      : "Mail server is not configured on this machine.";
    list.innerHTML = rows.slice(0, 30).map((row) =>
      `<article style="padding:10px 0;border-top:1px solid var(--line)">
        <strong>${escapeHtml(row.title)}</strong>
        <div style="color:var(--muted);font-size:.78rem">${escapeHtml(row.meta)} · ${escapeHtml(row.when || "")}</div>
        <p style="margin-top:4px;white-space:pre-wrap">${escapeHtml(String(row.body).slice(0, 500))}</p>
      </article>`
    ).join("");
  } catch {
    status.textContent = "Mailbox could not be loaded.";
  }
}

const STATUS_OPTIONS = ["pending_payment", "paid_escrow", "dispatched", "delivered", "completed", "cancelled", "awaiting_pickup_payment", "pickup_confirmed", "payout_released"];

function money(n) { return "$" + Number(n || 0).toLocaleString(); }

document.querySelectorAll("#adminTabs .portal-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#adminTabs .portal-tab").forEach((item) => item.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll("#adminPanel [data-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.panel !== btn.dataset.tab);
    });
    if (btn.dataset.tab === "mail") loadMailbox();
  });
});

document.getElementById("adminLogout").addEventListener("click", () => {
  clearAuth();
  location.reload();
});

async function loadPortal() {
  const headers = authHeaders();
  const [ordersRes, customersRes, vendorsRes] = await Promise.all([
    fetch("/api/orders", { headers }),
    fetch("/api/admin/customers", { headers }),
    fetch("/api/vendors"),
  ]);
  const orders = ordersRes.ok ? await ordersRes.json() : [];
  const customers = customersRes.ok ? await customersRes.json() : [];
  const vendors = vendorsRes.ok ? await vendorsRes.json() : [];
  const open = orders.filter((o) => !["completed", "payout_released", "cancelled"].includes(o.status)).length;
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total || 0), 0);
  document.getElementById("overviewStats").innerHTML = [
    ["Orders", orders.length],
    ["Open", open],
    ["Revenue", money(revenue)],
    ["Customers", customers.length],
    ["Vendors", vendors.length],
  ].map(([label, value]) => `<div class="portal-stat"><span>${label}</span><strong>${value}</strong></div>`).join("");

  document.getElementById("adminOrders").innerHTML = orders.length ? orders.slice().reverse().map((order) => `
    <article class="order-card">
      <div class="order-card-top">
        <div>
          <h3>${escapeHtml(order.id)}</h3>
          <div class="order-meta-line">${escapeHtml(order.buyer && order.buyer.name)} · ${escapeHtml(order.buyer && order.buyer.phone)} · ${order.guest ? "Guest" : "Account"}</div>
          <div class="order-meta-line">${escapeHtml(order.fulfillment || "")} · ${escapeHtml(order.paymentMethod || "")} · ${money(order.total)}${order.transactionRef ? " · Ref " + escapeHtml(order.transactionRef) : ""}</div>
          ${order.deliveryAddress ? `<div class="order-meta-line">Deliver to: ${escapeHtml(order.deliveryAddress)}</div>` : ""}
        </div>
        <span class="pill ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span>
      </div>
      <ul class="order-lines">${(order.lines || []).map((line) => `<li>${line.qty} × ${escapeHtml(line.name)}</li>`).join("")}</ul>
      <div class="order-total">${money(order.total)}</div>
      <div class="order-actions">
        <select data-status="${escapeHtml(order.id)}">${STATUS_OPTIONS.map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select>
        ${order.hasPop ? `<button class="btn btn-line" type="button" data-pop="${escapeHtml(order.id)}">View PoP</button>` : ""}
        <button class="btn btn-solid" type="button" data-update="${escapeHtml(order.id)}">Update</button>
      </div>
    </article>`).join("") : `<div class="order-card"><p>No orders yet.</p></div>`;

  document.getElementById("adminCustomers").innerHTML = customers.length ? customers.map((customer) => `
    <article class="order-card">
      <h3>${escapeHtml(customer.name)}</h3>
      <div class="order-meta-line">${escapeHtml(customer.email)} · ${escapeHtml(customer.phone)}</div>
    </article>`).join("") : `<div class="order-card"><p>No customer accounts yet.</p></div>`;

  document.getElementById("adminVendors").innerHTML = vendors.map((vendor) => `
    <article class="order-card">
      <h3>${escapeHtml(vendor.name)}</h3>
      <div class="order-meta-line">${escapeHtml(vendor.phone || "")} · ${escapeHtml(vendor.location || "")} · ${escapeHtml(vendor.kycStatus || "")}</div>
    </article>`).join("");
}

document.getElementById("adminOrders").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-update]");
  if (!button) return;
  const id = button.dataset.update;
  const to = document.querySelector(`[data-status="${id}"]`).value;
  button.disabled = true;
  try {
    const res = await fetch("/api/orders/" + encodeURIComponent(id) + "/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ to, actor: "admin" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not update");
    await loadPortal();
  } catch (err) {
    button.disabled = false;
    alert(err.message);
  }
});

document.getElementById("adminOrders").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-pop]");
  if (!button) return;
  button.disabled = true;
  try {
    const res = await fetch("/api/admin/orders/" + encodeURIComponent(button.dataset.pop) + "/pop", { headers: authHeaders() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Could not open proof of payment");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
  }
});

function enterPanel() {
  loginCard.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  init();
  loadMailbox();
  loadPortal().catch(() => {});
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  loginError.textContent = "";
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "admin",
        username: document.getElementById("adminUser").value.trim(),
        password: document.getElementById("adminPass").value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Login failed");
    setAuth(data);
    enterPanel();
  } catch (err) { showLogin(err.message); }
});

async function boot() {
  if (!getToken()) return showLogin();
  try {
    const res = await fetch("/api/admin/slides", { headers: authHeaders() });
    if (res.status === 401) { clearAuth(); return showLogin("Session expired — sign in again"); }
  } catch { /* API offline — local editing still works after login */ }
  enterPanel();
}
boot();
