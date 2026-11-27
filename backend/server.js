/*
 * Digital Auto Shop — Multi-Vendor Backend API
 * Dependency-free Node.js server. Data persisted to data/store.json.
 * Run: node backend/server.js  (port 3000)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* Load backend/.env (gitignored) — real env vars always win */
(function loadEnv() {
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const mail = require("./mail");

const PORT = 3000;
const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

/* ---------------- Store ---------------- */

const COMMISSION_PCT = 8;          // platform commission on every sale
const PAYOUT_HOLD_DAYS = 3;        // seller payout released N days after delivery confirmation

/* Paynow Zimbabwe — credentials come from backend/.env in production */
const PAYNOW = {
  id: process.env.PAYNOW_ID || "",
  key: process.env.PAYNOW_KEY || "",
};
const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";
function paynowConfigured() {
  return !!(PAYNOW.id && PAYNOW.key);
}
const POP_DIR = path.join(DATA_DIR, "pops");
const BANK_DETAILS = {
  accountName: "Solabliss Zimbabwe Pvt Ltd",
  bank: "FBC Bank",
  branch: "FBC Center Branch",
  account: "6870465460146",
  currency: "USD",
};

const AUTH = {
  secret: process.env.AUTH_SECRET || "digital-auto-shop-dev-secret",
  adminUser: process.env.ADMIN_USER || "admin",
  adminPass: process.env.ADMIN_PASS || "admin123",
  vendorPass: process.env.VENDOR_PASS || "vendor123",
};

let db = { vendors: [], products: [], orders: [], settings: { commissionPct: COMMISSION_PCT } };

function load() {
  try {
    if (fs.existsSync(STORE_FILE)) db = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch (e) { console.error("store load failed:", e.message); }
}
function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(db, null, 2));
}
const uid = (p) => p + "_" + crypto.randomBytes(6).toString("hex");
const now = () => new Date().toISOString();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return salt + ":" + hash;
}
function checkPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash || hash.length !== 64) return false;
  const check = crypto.scryptSync(String(password), salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(check, "hex"), Buffer.from(hash, "hex"));
}
function publicCustomer(c) {
  return { id: c.id, name: c.name, email: c.email, phone: c.phone, createdAt: c.createdAt };
}
function publicOrder(o) {
  const copy = { ...o };
  delete copy.popPath;
  return copy;
}
function requestBase(req) {
  const env = process.env.PUBLIC_BASE_URL;
  if (env) return env.replace(/\/+$/, "");
  const origin = req.headers.origin;
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/+$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return host ? `http://${host}` : "http://localhost:8080";
}
function trackingOrder(o) {
  return {
    id: o.id,
    status: o.status,
    fulfillment: o.fulfillment,
    total: o.total,
    createdAt: o.createdAt,
    pickupCode: o.pickupCode || null,
    vendorContacts: o.vendorContacts || [],
    lines: (o.lines || []).map((l) => ({ name: l.name, qty: l.qty, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
    events: (o.events || []).map((e) => ({ at: e.at, status: e.status })),
  };
}
function vendorOrderView(o, vendorId) {
  const copy = publicOrder(o);
  copy.lines = (o.lines || []).filter((l) => l.vendorId === vendorId);
  copy.vendorSubtotal = Math.round(copy.lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  delete copy.email;
  delete copy.transactionRef;
  delete copy.customerId;
  delete copy.guest;
  return copy;
}
function adminOrderView(o) {
  return { ...publicOrder(o), hasPop: !!o.popPath, popName: o.popPath ? path.basename(o.popPath) : null };
}

/* ---------------- Seed ---------------- */

/* Catalogue mirror — keeps storefront product names purchasable.
   In production this comes from vendor inventory, not a static seed. */
const CATALOGUE = [
  // [name, price, stock, category, vendorName]
  ["Samsung Galaxy S24 Ultra 256GB", 1299, 14, "phones", "TechZone"],
  ["Anker 737 Power Bank 24,000mAh", 89, 32, "phones", "GadgetHub"],
  ["Michelin CrossClimate2 Tyres (Set of 4)", 640, 6, "parts", "AutoParts Co."],
  ["HP Spectre x360 14\" Touchscreen", 1499, 9, "laptops", "ComXpert"],
  ["iPhone 15 Pro Max 256GB", 1599, 11, "phones", "TechZone"],
  ["Google Pixel 8 Pro 128GB", 999, 17, "phones", "GadgetHub"],
  ["Sony WH-1000XM5 Headphones", 349, 24, "phones", "SoundWorld"],
  ["Apple Watch Series 9 GPS", 429, 13, "phones", "TechZone"],
  ["JBL Charge 5 Bluetooth Speaker", 129, 40, "phones", "SoundWorld"],
  ["GoPro Hero 12 Black", 399, 8, "phones", "GadgetHub"],
  ["UGREEN Nexode 100W GaN Charger", 59, 55, "phones", "GadgetHub"],
  ["Nintendo Switch OLED", 349, 21, "phones", "GameStop ZW"],
  ["Castrol Edge 5W-30 Engine Oil 5L", 42, 120, "parts", "AutoParts Co."],
  ["Bridgestone Turanza T005 Tyre", 145, 45, "parts", "TyreKing"],
  ["Willard Automotive Battery 12V 70Ah", 189, 18, "parts", "AutoParts Co."],
  ["Genuine Toyota Brake Pads (Front)", 68, 27, "parts", "OEM Direct"],
  ["Philips H7 Headlight Bulbs (Pair)", 24, 80, "parts", "AutoParts Co."],
  ["Rain-X Windshield Treatment 500ml", 18, 64, "parts", "CarCare Plus"],
  ["NGK Iridium Spark Plugs (Set of 4)", 56, 39, "parts", "OEM Direct"],
  ["Bosch Wiper Blades (Pair)", 29, 51, "parts", "CarCare Plus"],
  ["Lenovo ThinkPad X1 Carbon Gen 12", 1899, 7, "laptops", "ComXpert"],
  ["Dell XPS 15 OLED 3.8K", 2199, 5, "laptops", "ComXpert"],
  ["ASUS ROG Strix G16 Gaming", 1799, 10, "laptops", "GameStop ZW"],
  ["Acer Aspire 5 Student Edition", 649, 22, "laptops", "ComXpert"],
  ["MacBook Air M3 13\" 8GB/256GB", 1599, 12, "laptops", "TechZone"],
  ["Logitech MX Keys Keyboard", 99, 33, "laptops", "GadgetHub"],
  ["Logitech MX Master 3S Mouse", 89, 47, "laptops", "GadgetHub"],
  ["Samsung T7 Shield 2TB SSD", 149, 29, "laptops", "ComXpert"],
];

function seed() {
  if (db.vendors.length) return;
  const vendors = [
    { name: "TechZone", phone: "+263771000001", location: "Sam Levy's, Harare", categories: ["phones", "laptops"] },
    { name: "GadgetHub", phone: "+263771000002", location: "CBD, Harare", categories: ["phones"] },
    { name: "AutoParts Co.", phone: "+263771000003", location: "Msasa, Harare", categories: ["parts"] },
    { name: "ComXpert", phone: "+263771000004", location: "Borrowdale, Harare", categories: ["laptops"] },
    { name: "SoundWorld", phone: "+263771000005", location: "Avondale, Harare", categories: ["phones"] },
    { name: "TyreKing", phone: "+263771000006", location: "Msasa, Harare", categories: ["parts"] },
    { name: "OEM Direct", phone: "+263771000007", location: "Graniteside, Harare", categories: ["parts"] },
    { name: "CarCare Plus", phone: "+263771000008", location: "Hatfield, Harare", categories: ["parts"] },
    { name: "GameStop ZW", phone: "+263771000009", location: "Borrowdale, Harare", categories: ["phones", "laptops"] },
  ];
  vendors.forEach((v) => {
    db.vendors.push({ id: uid("ven"), ...v, payoutMethod: "ecocash", payoutPhone: v.phone, kycStatus: "verified", createdAt: now() });
  });
  const byName = Object.fromEntries(db.vendors.map((v) => [v.name, v.id]));
  CATALOGUE.forEach(([name, price, stock, category, vendorName]) => {
    db.products.push({
      id: uid("prd"), vendorId: byName[vendorName] || db.vendors[0].id,
      name, price, stock, category, active: true, createdAt: now(),
    });
  });
  save();
  console.log("Seeded", db.vendors.length, "vendors,", db.products.length, "products");
}

/* ---------------- HTTP helpers ---------------- */

function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}
function sendFile(res, filePath, name) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, { error: "File not found" });
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
      ".gif": "image/gif", ".pdf": "application/pdf", ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Content-Disposition": `inline; filename="${name}"`,
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  });
}
function body(req) {
  return new Promise((resolve) => {
    const MAX_BODY = 15 * 1024 * 1024; // PoP uploads are base64 data URLs
    let raw = "";
    let settled = false;
    const finish = (value) => { if (!settled) { settled = true; resolve(value); } };
    req.on("data", (c) => {
      if (settled) return;
      raw += c;
      if (raw.length > MAX_BODY) {
        req.destroy();
        finish({ __payloadTooLarge: true });
      }
    });
    req.on("end", () => {
      if (settled) return;
      try { finish(JSON.parse(raw || "{}")); } catch { finish({}); }
    });
  });
}
function route(pattern, method, handler) {
  return { pattern, method, handler };
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH.secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verifyToken(token) {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig) return null;
    const expect = crypto.createHmac("sha256", AUTH.secret).update(body).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expectBuf = Buffer.from(expect);
    if (sigBuf.length !== expectBuf.length || !crypto.timingSafeEqual(sigBuf, expectBuf)) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}
function tokenFrom(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? verifyToken(m[1]) : null;
}
function requireAuth(req, res, role) {
  const p = tokenFrom(req);
  if (!p || p.role !== role) { send(res, 401, { error: "Authentication required" }); return null; }
  return p;
}
function requireVendor(req, res, vendorId) {
  const p = requireAuth(req, res, "vendor");
  if (!p) return null;
  if (vendorId && p.vendorId !== vendorId) { send(res, 403, { error: "Forbidden" }); return null; }
  return p;
}

/* ---------------- Delivery fee engine ----------------
 * Dynamic pricing model. In production, plug in live InDrive/biker
 * quotes via their APIs; this is the fallback rate card.
 * Rates are per zone + per km, with weight/size surcharges.
 */
const DELIVERY_RATES = {
  zones: {
    "harare-cbd":      { base: 3,  perKm: 0.9 },
    "harare-suburbs":  { base: 4,  perKm: 1.1 },
    "bulawayo":        { base: 6,  perKm: 1.4 },
    "other-city":      { base: 10, perKm: 2.0 },
  },
  surcharges: { bulky: 5, fragile: 3, heavy: 8 },  // applied per order flags
  freeAbove: Number.POSITIVE_INFINITY,            // no free delivery
};

function deliveryFee({ zone = "harare-suburbs", km = 5, bulky = false, fragile = false, heavy = false, orderTotal = 0 }) {
  const z = DELIVERY_RATES.zones[zone] || DELIVERY_RATES.zones["harare-suburbs"];
  let fee = z.base + z.perKm * Math.max(1, km);
  if (bulky) fee += DELIVERY_RATES.surcharges.bulky;
  if (fragile) fee += DELIVERY_RATES.surcharges.fragile;
  if (heavy) fee += DELIVERY_RATES.surcharges.heavy;
  if (orderTotal >= DELIVERY_RATES.freeAbove) fee = 0;
  return { fee: Math.round(fee * 100) / 100, zone, freeDeliveryApplied: orderTotal >= DELIVERY_RATES.freeAbove };
}

/* ---------------- Order state machine ----------------
 * pending → paid_escrow → dispatched → delivered → completed → payout_released
 * Pickup+cash orders: pending → pickup_confirmed (requires platform code) → completed
 */

async function createOrder(req, res) {
  const b = await body(req);
  if (b.__payloadTooLarge) return send(res, 413, { error: "Request too large" });
  let { items = [], fulfillment = "delivery", deliveryAddress, deliveryZone, distanceKm, paymentMethod = "ecocash", buyerPhone, buyerName, transactionRef, email, pop } = b;
  if (!Array.isArray(items)) items = [];
  if (!["delivery", "pickup"].includes(fulfillment)) return send(res, 400, { error: "Invalid fulfilment method" });
  if (!["ecocash", "onemoney", "card", "bank_transfer", "cash_pickup"].includes(paymentMethod)) return send(res, 400, { error: "Invalid payment method" });
  const actor = tokenFrom(req);
  let customerId = null;
  if (actor && actor.role === "customer") {
    const customer = (db.customers || []).find((c) => c.id === actor.sub);
    if (customer) {
      customerId = customer.id;
      buyerName = buyerName || customer.name;
      buyerPhone = buyerPhone || customer.phone;
      email = email || customer.email;
    }
  }
  if (!items.length) return send(res, 400, { error: "Cart is empty" });
  if (!buyerPhone) return send(res, 400, { error: "buyerPhone required" });
  if (paymentMethod === "bank_transfer") {
    if (!transactionRef) return send(res, 400, { error: "Transaction reference is required for bank transfer" });
    if (!email) return send(res, 400, { error: "Email is required for bank transfer" });
    if (!pop) return send(res, 400, { error: "Proof of payment upload is required for bank transfer" });
    if (String(pop).length > 12 * 1024 * 1024) return send(res, 400, { error: "Proof of payment is too large" });
  }

  // validate stock & price server-side
  const lines = [];
  let subtotal = 0;
  for (const it of items) {
    const qty = Math.floor(Number(it && it.qty));
    const productRef = it && (it.productId || it.name);
    if (!productRef || !Number.isFinite(qty) || qty < 1) return send(res, 400, { error: "Each item needs a product and quantity" });
    const p = db.products.find((x) => x.id === productRef || x.name === productRef);
    if (!p || p.active === false) return send(res, 404, { error: `Product ${productRef} not found` });
    if (p.stock < qty) return send(res, 409, { error: `Insufficient stock for ${p.name}` });
    const lineTotal = p.price * qty;
    subtotal += lineTotal;
    lines.push({ productId: p.id, vendorId: p.vendorId, name: p.name, qty, unitPrice: p.price, lineTotal });
  }

  let fee = 0, feeInfo = null;
  if (fulfillment === "delivery") {
    feeInfo = deliveryFee({
      zone: deliveryZone, km: distanceKm || 5,
      bulky: b.bulky, fragile: b.fragile, heavy: b.heavy,
      orderTotal: subtotal,
    });
    fee = feeInfo.fee;
  }

  const commission = Math.round(subtotal * (db.settings.commissionPct / 100) * 100) / 100;
  const order = {
    id: uid("ord"),
    buyer: { name: buyerName || "Customer", phone: buyerPhone },
    fulfillment,
    deliveryAddress: fulfillment === "delivery" ? String(deliveryAddress || "") : null,
    deliveryZone: fulfillment === "delivery" ? deliveryZone || null : null,
    distanceKm: fulfillment === "delivery" ? Number(distanceKm) || null : null,
    lines,
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
    commission,
    paymentMethod,
    transactionRef: transactionRef || null,
    email: email || null,
    customerId,
    guest: !customerId,
    status: paymentMethod === "cash_pickup" && fulfillment === "pickup" ? "awaiting_pickup_payment" : "pending_payment",
    pickupCode: fulfillment === "pickup" ? String(Math.floor(100000 + Math.random() * 900000)) : null,
    vendorContacts: [],   // filled below for pickup orders
    createdAt: now(),
    events: [{ at: now(), status: "created" }],
  };

  // For pickup orders, expose vendor contact details to the buyer
  if (fulfillment === "pickup") {
    const vids = [...new Set(lines.map((l) => l.vendorId))];
    order.vendorContacts = vids.map((vid) => {
      const v = db.vendors.find((x) => x.id === vid);
      return v ? { vendorId: vid, name: v.name, phone: v.phone, location: v.location } : null;
    }).filter(Boolean);
  }

  for (const line of lines) {
    const p = db.products.find((x) => x.id === line.productId);
    if (p) p.stock -= line.qty;
  }

  // save proof-of-payment file for bank transfers
  if (pop) {
    const m = String(pop).match(/^data:(.*?);base64,(.*)$/s);
    if (m) {
      const ext = (m[1].split("/")[1] || "bin").split(";")[0].replace("jpeg", "jpg");
      fs.mkdirSync(POP_DIR, { recursive: true });
      order.popPath = path.join(POP_DIR, order.id + "." + ext);
      fs.writeFileSync(order.popPath, Buffer.from(m[2], "base64"));
    }
  }

  db.orders.push(order);
  save();
  send(res, 201, trackingOrder(order));
  queueOrderMail(order, "New order");
}

function transitionOrder(b, res, id) {
  const order = db.orders.find((o) => o.id === id);
  if (!order) return send(res, 404, { error: "Order not found" });
  const { to, actor } = b; // actor: buyer | vendor | admin
  const flow = {
    pending_payment: ["paid_escrow", "cancelled"],
    awaiting_pickup_payment: ["pickup_confirmed", "cancelled"],
    paid_escrow: ["dispatched", "cancelled"],
    pickup_confirmed: ["completed"],
    dispatched: ["delivered"],
    delivered: ["completed"],
    completed: ["payout_released"],
    payout_released: [],
    cancelled: [],
  };
  if (!flow[order.status] || !flow[order.status].includes(to)) {
    return send(res, 409, { error: `Cannot move ${order.status} → ${to}` });
  }
  // pickup cash requires the platform pickup code — seller cannot self-confirm
  if (to === "pickup_confirmed" && actor !== "admin" && b.pickupCode !== order.pickupCode) {
    return send(res, 403, { error: "Valid pickup code required (issued to buyer at checkout)" });
  }
  if (to === "cancelled") {
    for (const line of order.lines || []) {
      const p = db.products.find((x) => x.id === line.productId);
      if (p) p.stock += line.qty;
    }
  }
  order.status = to;
  order.events.push({ at: now(), status: to, actor: actor || "system" });
  if (to === "payout_released") order.payoutReleasedAt = now();
  save();
  send(res, 200, publicOrder(order));
  queueOrderMail(order, statusLabel(to));
}

/* ---------------- Routes ---------------- */

const routes = [
  route(/^\/api\/health$/, "GET", (req, res) => send(res, 200, { ok: true, vendors: db.vendors.length, products: db.products.length, orders: db.orders.length })),

  route(/^\/api\/auth\/login$/, "POST", async (req, res) => {
    const b = await body(req);
    if (b.role === "admin") {
      if (b.username === AUTH.adminUser && b.password === AUTH.adminPass) {
        return send(res, 200, { ok: true, role: "admin", user: b.username, token: signToken({ role: "admin", sub: b.username }) });
      }
      return send(res, 401, { error: "Invalid admin credentials" });
    }
    if (b.role === "vendor") {
      const v = db.vendors.find((x) => x.id === b.vendorId);
      if (!v) return send(res, 404, { error: "Vendor not found" });
      if (b.password !== AUTH.vendorPass) return send(res, 401, { error: "Invalid vendor password" });
      return send(res, 200, { ok: true, role: "vendor", vendorId: v.id, vendor: v, token: signToken({ role: "vendor", vendorId: v.id }) });
    }
    if (b.role === "customer") {
      const email = String(b.email || "").trim().toLowerCase();
      const customer = (db.customers || []).find((c) => c.email === email);
      if (!customer || !checkPassword(b.password || "", customer.passwordHash)) {
        return send(res, 401, { error: "Invalid email or password" });
      }
      return send(res, 200, {
        ok: true, role: "customer", token: signToken({ role: "customer", sub: customer.id }),
        ...publicCustomer(customer),
      });
    }
    send(res, 400, { error: "role must be admin, vendor, or customer" });
  }),

  route(/^\/api\/auth\/register$/, "POST", async (req, res) => {
    const b = await body(req);
    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim().toLowerCase();
    const phone = String(b.phone || "").trim();
    const password = String(b.password || "");
    if (!name || !email || !phone || !password) return send(res, 400, { error: "Name, email, phone and password are required" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "Enter a valid email address" });
    if (password.length < 6) return send(res, 400, { error: "Password must be at least 6 characters" });
    if (!Array.isArray(db.customers)) db.customers = [];
    if (db.customers.some((c) => c.email === email)) return send(res, 409, { error: "An account with that email already exists" });
    const customer = { id: uid("cus"), name, email, phone, passwordHash: hashPassword(password), createdAt: now() };
    db.customers.push(customer);
    save();
    send(res, 201, {
      ok: true, role: "customer", token: signToken({ role: "customer", sub: customer.id }),
      ...publicCustomer(customer),
    });
  }),

  route(/^\/api\/account\/me$/, "GET", (req, res) => {
    const actor = requireAuth(req, res, "customer");
    if (!actor) return;
    const customer = (db.customers || []).find((c) => c.id === actor.sub);
    if (!customer) return send(res, 401, { error: "Account not found" });
    send(res, 200, publicCustomer(customer));
  }),

  route(/^\/api\/account\/orders$/, "GET", (req, res) => {
    const actor = requireAuth(req, res, "customer");
    if (!actor) return;
    const customer = (db.customers || []).find((c) => c.id === actor.sub);
    if (!customer) return send(res, 401, { error: "Account not found" });
    const email = customer.email.toLowerCase();
    const phone = String(customer.phone || "").replace(/\s+/g, "");
    const list = (db.orders || []).filter((o) => {
      if (o.customerId === customer.id) return true;
      if (o.email && String(o.email).toLowerCase() === email) return true;
      const orderPhone = String(o.buyer && o.buyer.phone || "").replace(/\s+/g, "");
      return phone && orderPhone && orderPhone === phone;
    }).map(publicOrder);
    send(res, 200, list);
  }),

  route(/^\/api\/admin\/customers$/, "GET", (req, res) => {
    if (!requireAuth(req, res, "admin")) return;
    send(res, 200, (db.customers || []).map(publicCustomer));
  }),
  route(/^\/api\/admin\/orders\/([^/]+)\/pop$/, "GET", (req, res, m) => {
    if (!requireAuth(req, res, "admin")) return;
    const order = (db.orders || []).find((o) => o.id === m[1]);
    if (!order || !order.popPath) return send(res, 404, { error: "No proof of payment for this order" });
    const root = path.resolve(POP_DIR);
    const file = path.resolve(order.popPath);
    if (!file.startsWith(root + path.sep)) return send(res, 403, { error: "Forbidden" });
    sendFile(res, file, path.basename(file));
  }),

  // Vendors
  route(/^\/api\/vendors$/, "GET", (req, res) => send(res, 200, db.vendors)),
  route(/^\/api\/vendors$/, "POST", async (req, res) => {
    const b = await body(req);
    if (!b.name || !b.phone) return send(res, 400, { error: "name and phone required" });
    const v = { id: uid("ven"), kycStatus: "pending", payoutMethod: "ecocash", createdAt: now(), ...b };
    db.vendors.push(v); save();
    send(res, 201, v);
  }),

  // Products (public catalogue + vendor inventory)
  route(/^\/api\/products$/, "GET", (req, res) => {
    const url = new URL(req.url, "http://x");
    const cat = url.searchParams.get("category");
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const vendorId = url.searchParams.get("vendorId");
    let list = db.products.filter((p) => p.active !== false);
    if (cat) list = list.filter((p) => p.category === cat);
    if (vendorId) list = list.filter((p) => p.vendorId === vendorId);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    send(res, 200, list);
  }),
  route(/^\/api\/vendors\/([^/]+)\/products$/, "GET", (req, res, m) => {
    if (!requireVendor(req, res, m[1])) return;
    send(res, 200, db.products.filter((p) => p.vendorId === m[1]));
  }),
  route(/^\/api\/vendors\/([^/]+)\/products$/, "POST", async (req, res, m) => {
    if (!requireVendor(req, res, m[1])) return;
    const b = await body(req);
    if (!b.name || b.price == null) return send(res, 400, { error: "name and price required" });
    const p = {
      id: uid("prd"), vendorId: m[1], category: b.category || "general",
      stock: b.stock ?? 0, active: true, createdAt: now(), ...b,
    };
    db.products.push(p); save();
    send(res, 201, p);
  }),
  route(/^\/api\/products\/([^/]+)$/, "PATCH", async (req, res, m) => {
    const p = db.products.find((x) => x.id === m[1]);
    if (!p) return send(res, 404, { error: "Not found" });
    const a = requireAuth(req, res, "vendor");
    if (!a) return;
    if (a.vendorId !== p.vendorId) return send(res, 403, { error: "Forbidden" });
    const b = await body(req);
    Object.assign(p, b); save();
    send(res, 200, p);
  }),
  route(/^\/api\/vendors\/([^/]+)\/orders$/, "GET", (req, res, m) => {
    if (!requireVendor(req, res, m[1])) return;
    send(res, 200, (db.orders || [])
      .filter((o) => (o.lines || []).some((l) => l.vendorId === m[1]))
      .map((o) => vendorOrderView(o, m[1])));
  }),

  // Orders
  route(/^\/api\/orders$/, "POST", createOrder),
  route(/^\/api\/orders$/, "GET", (req, res) => {
    if (!requireAuth(req, res, "admin")) return;
    send(res, 200, (db.orders || []).map(adminOrderView));
  }),
  route(/^\/api\/orders\/lookup$/, "GET", (req, res) => {
    const url = new URL(req.url, "http://x");
    const ref = String(url.searchParams.get("ref") || "").trim();
    if (ref.length < 6) return send(res, 400, { error: "Enter your full order ID" });
    const all = db.orders || [];
    const order = all.find((o) => o.id === ref) || all.find((o) => o.id.endsWith(ref));
    if (!order) return send(res, 404, { error: "Order not found — check the ID." });
    send(res, 200, trackingOrder(order));
  }),
  route(/^\/api\/orders\/([^/]+)\/transition$/, "POST", async (req, res, m) => {
    const b = await body(req);
    const actor = b.actor || "buyer";
    if (actor === "admin") {
      if (!requireAuth(req, res, "admin")) return;
    } else if (actor === "vendor") {
      const a = requireAuth(req, res, "vendor");
      if (!a) return;
      const o = db.orders.find((x) => x.id === m[1]);
      if (!o || !o.lines.some((l) => l.vendorId === a.vendorId)) return send(res, 403, { error: "Forbidden" });
    } else {
      return send(res, 403, { error: "Authentication required" });
    }
    transitionOrder(b, res, m[1]);
  }),

  // Delivery fee quote
  route(/^\/api\/delivery-fee$/, "GET", (req, res) => {
    const url = new URL(req.url, "http://x");
    const q = Object.fromEntries(url.searchParams);
    send(res, 200, deliveryFee({
      zone: q.zone, km: +q.km || 5,
      bulky: q.bulky === "1", fragile: q.fragile === "1", heavy: q.heavy === "1",
      orderTotal: +q.orderTotal || 0,
    }));
  }),

  // Vendor payouts (commission already deducted at order level)
  route(/^\/api\/vendors\/([^/]+)\/payouts$/, "GET", (req, res, m) => {
    if (!requireVendor(req, res, m[1])) return;
    const vid = m[1];
    const vendorOrders = db.orders.filter((o) =>
      o.status === "payout_released" && o.lines.some((l) => l.vendorId === vid)
    );
    const gross = vendorOrders.reduce((s, o) => s + o.lines.filter((l) => l.vendorId === vid).reduce((a, l) => a + l.lineTotal, 0), 0);
    const commission = vendorOrders.reduce((s, o) => {
      const share = o.lines.filter((l) => l.vendorId === vid).reduce((a, l) => a + l.lineTotal, 0) / o.subtotal;
      return s + o.commission * share;
    }, 0);
    send(res, 200, {
      vendorId: vid,
      ordersCount: vendorOrders.length,
      gross: Math.round(gross * 100) / 100,
      commissionDeducted: Math.round(commission * 100) / 100,
      netPayable: Math.round((gross - commission) * 100) / 100,
    });
  }),

  // Bank transfer details (shown to buyer; PoP emailed/WhatsApp'd to us)
  route(/^\/api\/bank-details$/, "GET", (req, res) => send(res, 200, BANK_DETAILS)),

  // Paynow — initiate hosted checkout, returns redirect URL
  route(/^\/api\/paynow\/initiate$/, "POST", async (req, res) => {
    if (!paynowConfigured()) return send(res, 503, { error: "Paynow is not configured on the server" });
    const b = await body(req);
    const { amount, reference, description = "Digital Auto Shop order" } = b;
    if (!amount || !reference) return send(res, 400, { error: "amount and reference required" });
    const order = db.orders.find((o) => o.id === reference);
    if (!order) return send(res, 404, { error: "Order not found" });
    if (order.status !== "pending_payment") return send(res, 409, { error: "Order is not awaiting payment" });
    if (Math.abs(Number(amount) - Number(order.total)) > 0.01) return send(res, 400, { error: "Amount does not match the order total" });
    const base = requestBase(req);
    const params = {
      id: PAYNOW.id,
      reference: String(reference),
      amount: Number(amount).toFixed(2),
      additionalinfo: description,
      returnurl: `${base}/checkout.html?paid=1`,
      resulturl: `${base}/api/paynow/result`,
      status: "Message",
    };
    const hash = crypto.createHash("sha512").update(Object.values(params).join("") + PAYNOW.key).digest("hex").toUpperCase();
    try {
      const r = await fetch(PAYNOW_INITIATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ ...params, hash }),
      });
      const text = await r.text();
      const resp = Object.fromEntries(new URLSearchParams(text));
      if (resp.status !== "Ok" || !resp.browserurl) {
        return send(res, 502, { error: "Paynow initiation failed", detail: text });
      }
      send(res, 200, { redirectUrl: resp.browserurl, pollUrl: resp.pollurl, reference: params.reference });
    } catch (e) {
      send(res, 502, { error: "Paynow unreachable: " + e.message });
    }
  }),

  // Paynow result webhook — verify via poll URL, then escrow the order
  route(/^\/api\/paynow\/result$/, "POST", async (req, res) => {
    const b = await body(req);
    try {
      if (b.pollurl) {
        const poll = await (await fetch(b.pollurl)).text();
        const p = Object.fromEntries(new URLSearchParams(poll));
        if (p.status === "Paid") {
          const order = db.orders.find((o) => o.id === b.reference);
          markPaid(order, { paynowRef: b.paynowreference || null });
        }
      }
    } catch (e) { /* still ack Paynow */ }
    send(res, 200, { ok: true });
  }),
  route(/^\/api\/paynow\/result$/, "GET", async (req, res) => {
    const url = new URL(req.url, "http://x");
    await new Promise((resolve) => {
      const b = Object.fromEntries(url.searchParams);
      (async () => {
        try {
          if (b.pollurl) {
            const poll = await (await fetch(b.pollurl)).text();
            const p = Object.fromEntries(new URLSearchParams(poll));
            if (p.status === "Paid") {
              const order = db.orders.find((o) => o.id === b.reference);
              markPaid(order);
            }
          }
        } catch (e) {}
        resolve();
      })();
    });
    send(res, 200, { ok: true });
  }),

  // Point of Sale — immediate in-store sale, stock decremented, order completed
  route(/^\/api\/pos\/sale$/, "POST", async (req, res) => {
    const b = await body(req);
    const { vendorId, items = [], paymentMethod = "cash", buyerPhone, buyerName } = b;
    const a = requireAuth(req, res, "vendor");
    if (!a) return;
    if (a.vendorId !== vendorId) return send(res, 403, { error: "Forbidden" });
    const vendor = db.vendors.find((v) => v.id === vendorId);
    if (!vendor) return send(res, 404, { error: "Vendor not found" });
    if (!items.length) return send(res, 400, { error: "Cart is empty" });

    const lines = [];
    let subtotal = 0;
    for (const it of items) {
      const p = db.products.find((x) => x.id === it.productId || x.name === it.productId);
      if (!p) return send(res, 404, { error: `Product ${it.productId} not found` });
      if (p.vendorId !== vendorId) return send(res, 403, { error: `${p.name} is not in your inventory` });
      if (p.stock < it.qty) return send(res, 409, { error: `Insufficient stock for ${p.name}` });
      const lineTotal = p.price * it.qty;
      subtotal += lineTotal;
      lines.push({ productId: p.id, vendorId: p.vendorId, name: p.name, qty: it.qty, unitPrice: p.price, lineTotal });
    }

    const commission = Math.round(subtotal * (db.settings.commissionPct / 100) * 100) / 100;
    const order = {
      id: uid("pos"), pos: true,
      buyer: { name: buyerName || "Walk-in customer", phone: buyerPhone || vendor.phone },
      fulfillment: "pickup",
      lines, subtotal, deliveryFee: 0, total: subtotal, commission,
      paymentMethod,
      status: "completed",
      createdAt: now(),
      events: [
        { at: now(), status: "created", actor: "pos" },
        { at: now(), status: "completed", actor: "pos" },
      ],
    };
    for (const it of items) {
      const p = db.products.find((x) => x.id === it.productId || x.name === it.productId);
      p.stock -= it.qty;
    }
    db.orders.push(order);
    save();
    send(res, 201, order);
  }),

  // Admin: slides (mirrors localStorage for production)
  route(/^\/api\/admin\/slides$/, "GET", (req, res) => {
    if (!requireAuth(req, res, "admin")) return;
    send(res, 200, db.slides || []);
  }),
  route(/^\/api\/admin\/slides$/, "POST", async (req, res) => {
    if (!requireAuth(req, res, "admin")) return;
    const b = await body(req);
    db.slides = (b.slides || []).slice(0, 10);
    save();
    send(res, 200, { ok: true, count: db.slides.length });
  }),

  route(/^\/api\/contact$/, "POST", async (req, res) => {
    const b = await body(req);
    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim();
    const phone = String(b.phone || "").trim();
    const message = String(b.message || "").trim();
    if (!name || !message) return send(res, 400, { error: "Name and message are required" });
    if (name.length > 120 || phone.length > 40 || message.length > 4000) {
      return send(res, 400, { error: "That message is too long" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return send(res, 400, { error: "Enter a valid email address" });
    }
    if (!Array.isArray(db.messages)) db.messages = [];
    const msg = { id: uid("msg"), name, email, phone, message, createdAt: now() };
    db.messages.push(msg);
    save();
    let mailSent = false;
    try {
      const shopMail = await mail.send({
        to: mail.shopAddress(),
        replyTo: email,
        subject: "New website message from " + name,
        text: [
          "A message arrived from the Digital Auto Shop website.",
          "",
          "Name: " + name,
          "Email: " + (email || "—"),
          "Phone: " + (phone || "—"),
          "",
          message,
        ].join("\n"),
      });
      mailSent = !!(shopMail && shopMail.ok);
      if (email) {
        mail.send({
          to: email,
          subject: "We received your message — Digital Auto Shop",
          text: [
            "Hello " + name + ",",
            "",
            "Thanks for contacting Digital Auto Shop. We have your message and will reply shortly.",
            "",
            "24 Midlothian Avenue, Eastlea, Harare",
            "+263 77 390 9307",
            "info@globalspaceweb.co.zw",
          ].join("\n"),
        }).catch((e) => console.error("contact reply:", mail.redact(e.message)));
      }
    } catch (e) {
      console.error("contact mail:", mail.redact(e.message));
    }
    send(res, 201, { ok: true, id: msg.id, mailSent });
  }),

  route(/^\/api\/admin\/notifications$/, "GET", (req, res) => {
    if (!requireAuth(req, res, "admin")) return;
    const inbox = (db.inbox || []).map(({ uid, from, subject, date, text, receivedAt }) => ({ uid, from, subject, date, text, receivedAt }));
    const messages = (db.messages || []).map(({ id, name, email, phone, message, createdAt }) => ({ id, name, email, phone, message, createdAt }));
    send(res, 200, { configured: mail.configured(), inbox, messages });
  }),
];

const STATUS_LABELS = {
  pending_payment: "Waiting for payment",
  awaiting_pickup_payment: "Waiting for pickup payment",
  paid_escrow: "Payment received",
  dispatched: "Dispatched",
  delivered: "Delivered",
  pickup_confirmed: "Pickup confirmed",
  completed: "Completed",
  payout_released: "Payout released",
  cancelled: "Cancelled",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function orderMailText(order, headline, forCustomer) {
  const lines = (order.lines || []).map((l) => l.qty + " × " + l.name + " — $" + l.lineTotal);
  const rows = [
    headline,
    "",
    "Order: " + order.id,
    "Status: " + statusLabel(order.status),
    "Customer: " + (order.buyer && order.buyer.name || "Customer"),
    "Phone: " + (order.buyer && order.buyer.phone || "—"),
    "Email: " + (order.email || "—"),
    "Fulfilment: " + order.fulfillment,
    "Payment: " + order.paymentMethod,
  ];
  if (order.deliveryAddress) rows.push("Address: " + order.deliveryAddress);
  if (!forCustomer && order.transactionRef) rows.push("Transaction reference: " + order.transactionRef);
  if (order.pickupCode) rows.push("Pickup code: " + order.pickupCode);
  rows.push("", ...lines, "", "Total: $" + order.total, "", "Digital Auto Shop", "24 Midlothian Avenue, Eastlea, Harare", "+263 77 390 9307");
  return rows.join("\n");
}

function queueOrderMail(order, headline) {
  if (!order || order.pos) return;
  const shop = mail.shopAddress();
  if (shop) {
    mail.send({
      to: shop,
      replyTo: order.email,
      subject: headline + " " + order.id,
      text: orderMailText(order, headline, false),
    }).catch((e) => console.error("order mail:", mail.redact(e.message)));
  }
  if (order.email && mail.isEmail(order.email)) {
    mail.send({
      to: order.email,
      subject: headline + " — Digital Auto Shop",
      text: orderMailText(order, headline, true),
    }).catch((e) => console.error("customer mail:", mail.redact(e.message)));
  }
}

function markPaid(order, extra) {
  if (!order || order.status !== "pending_payment") return;
  order.status = "paid_escrow";
  if (extra) Object.assign(order, extra);
  order.events.push({ at: now(), status: "paid_escrow", actor: "paynow" });
  save();
  queueOrderMail(order, "Payment received");
}

let lastInboxError = "";
async function syncMailbox() {
  if (!mail.configured()) return;
  try {
    if (!Array.isArray(db.mailSeen)) {
      db.mailSeen = await mail.pullInbox(new Set(), { listOnly: true });
      save();
      lastInboxError = "";
      console.log("Mailbox connected.", db.mailSeen.length, "existing message(s) left in the inbox.");
      return;
    }
    const known = new Set(db.mailSeen);
    const found = await mail.pullInbox(known);
    lastInboxError = "";
    if (!found.length) return;
    db.mailSeen = db.mailSeen.concat(found.map((m) => m.uid));
    db.inbox = (db.inbox || []).concat(found.map((m) => ({ id: uid("in"), ...m })));
    if (db.inbox.length > 200) db.inbox = db.inbox.slice(-200);
    save();
    console.log("Mailbox received", found.length, "message(s)");
  } catch (e) {
    const msg = mail.redact(e.message);
    if (msg !== lastInboxError) {
      console.error("Mailbox receive failed:", msg);
      lastInboxError = msg;
    }
  }
}

load();
if (!Array.isArray(db.messages)) db.messages = [];
if (!Array.isArray(db.inbox)) db.inbox = [];
if (!Array.isArray(db.customers)) db.customers = [];
seed();

http.createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://x").pathname;
  for (const r of routes) {
    const m = pathname.match(r.pattern);
    if (m && req.method === r.method) return r.handler(req, res, m);
  }
  send(res, 404, { error: "Not found" });
}).listen(PORT, () => {
  console.log(`Vendor API on http://localhost:${PORT}`);
  if (mail.configured()) console.log("Mail notifications enabled for", mail.shopAddress());
  else console.error("Mail is not configured — add backend/.env");
  setTimeout(syncMailbox, 4000);
  setInterval(syncMailbox, 3 * 60 * 1000);
});
