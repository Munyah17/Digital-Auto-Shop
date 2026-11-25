/*
 * Digital Auto Shop — Multi-Vendor Backend API
 * Dependency-free Node.js server. Data persisted to data/store.json.
 * Run: node backend/server.js  (port 3000)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 3000;
const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

/* ---------------- Store ---------------- */

const COMMISSION_PCT = 8;          // platform commission on every sale
const PAYOUT_HOLD_DAYS = 3;        // seller payout released N days after delivery confirmation

/* Paynow Zimbabwe — override via env vars in production */
const PAYNOW = {
  id: process.env.PAYNOW_ID || "24720",
  key: process.env.PAYNOW_KEY || "d40d9ce1-9737-4b2d-bc2b-bef0770c8744",
};
const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";
const POP_DIR = path.join(DATA_DIR, "pops");
const BANK_DETAILS = {
  accountName: "Solabliss Zimbabwe Pvt Ltd",
  bank: "FBC Bank",
  branch: "FBC Center Branch",
  account: "6870465460146",
  currency: "USD",
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
function body(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
  });
}
function route(pattern, method, handler) {
  return { pattern, method, handler };
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

function createOrder(b, res) {
  const { items = [], fulfillment = "delivery", deliveryAddress, deliveryZone, distanceKm, paymentMethod = "ecocash", buyerPhone, buyerName, transactionRef, email, pop } = b;
  if (!items.length) return send(res, 400, { error: "Cart is empty" });
  if (!buyerPhone) return send(res, 400, { error: "buyerPhone required" });
  if (paymentMethod === "bank_transfer") {
    if (!transactionRef) return send(res, 400, { error: "Transaction reference is required for bank transfer" });
    if (!email) return send(res, 400, { error: "Email is required for bank transfer" });
    if (!pop) return send(res, 400, { error: "Proof of payment upload is required for bank transfer" });
  }

  // validate stock & price server-side
  const lines = [];
  let subtotal = 0;
  for (const it of items) {
    const p = db.products.find((x) => x.id === it.productId || x.name === it.productId);
    if (!p) return send(res, 404, { error: `Product ${it.productId} not found` });
    if (p.stock < it.qty) return send(res, 409, { error: `Insufficient stock for ${p.name}` });
    const lineTotal = p.price * it.qty;
    subtotal += lineTotal;
    lines.push({ productId: p.id, vendorId: p.vendorId, name: p.name, qty: it.qty, unitPrice: p.price, lineTotal });
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
    lines,
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
    commission,
    paymentMethod,
    transactionRef: transactionRef || null,
    email: email || null,
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

  // decrement stock
  for (const it of items) {
    const p = db.products.find((x) => x.id === it.productId);
    p.stock -= it.qty;
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
  send(res, 201, order);
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
  order.status = to;
  order.events.push({ at: now(), status: to, actor: actor || "system" });
  if (to === "payout_released") order.payoutReleasedAt = now();
  save();
  send(res, 200, order);
}

/* ---------------- Routes ---------------- */

const routes = [
  route(/^\/api\/health$/, "GET", (req, res) => send(res, 200, { ok: true, vendors: db.vendors.length, products: db.products.length, orders: db.orders.length })),

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
    send(res, 200, db.products.filter((p) => p.vendorId === m[1]));
  }),
  route(/^\/api\/vendors\/([^/]+)\/products$/, "POST", async (req, res, m) => {
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
    const b = await body(req);
    Object.assign(p, b); save();
    send(res, 200, p);
  }),

  // Orders
  route(/^\/api\/orders$/, "POST", createOrder),
  route(/^\/api\/orders$/, "GET", (req, res) => send(res, 200, db.orders)),
  route(/^\/api\/orders\/([^/]+)\/transition$/, "POST", async (req, res, m) => {
    transitionOrder(await body(req), res, m[1]);
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
    const b = await body(req);
    const { amount, reference, description = "Digital Auto Shop order" } = b;
    if (!amount || !reference) return send(res, 400, { error: "amount and reference required" });
    const params = {
      id: PAYNOW.id,
      reference: String(reference),
      amount: Number(amount).toFixed(2),
      additionalinfo: description,
      returnurl: "http://localhost:8080/checkout.html?paid=1",
      resulturl: "http://localhost:3000/api/paynow/result",
      status: "Message",
    };
    const hash = crypto.createHash("sha512").update(Object.values(params).join("")).digest("hex");
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
          if (order && order.status === "pending_payment") {
            order.status = "paid_escrow";
            order.paynowRef = b.paynowreference || null;
            order.events.push({ at: now(), status: "paid_escrow", actor: "paynow" });
            save();
          }
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
              if (order && order.status === "pending_payment") {
                order.status = "paid_escrow";
                order.events.push({ at: now(), status: "paid_escrow", actor: "paynow" });
                save();
              }
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
  route(/^\/api\/admin\/slides$/, "GET", (req, res) => send(res, 200, db.slides || [])),
  route(/^\/api\/admin\/slides$/, "POST", async (req, res) => {
    const b = await body(req);
    db.slides = (b.slides || []).slice(0, 10);
    save();
    send(res, 200, { ok: true, count: db.slides.length });
  }),
];

load();
seed();

http.createServer(async (req, res) => {
  for (const r of routes) {
    const m = req.url.match(r.pattern);
    if (m && req.method === r.method) return r.handler(req, res, m);
  }
  send(res, 404, { error: "Not found" });
}).listen(PORT, () => console.log(`Vendor API on http://localhost:${PORT}`));
