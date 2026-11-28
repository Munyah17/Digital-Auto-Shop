/*
 * Takealot crawler plugin — dependency-free.
 * Fetches category/listing pages, extracts products, converts currency,
 * applies markup, maps categories, and imports into the shop catalogue.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  targetVendorId: "",            // vendor that owns imported products
  baseUrl: "https://www.takealot.co.za",
  // Category/listing URLs to crawl (relative paths or absolute URLs)
  categoryUrls: [
    "/all-electronics",
    "/all-home-and-living",
    "/all-computers",
  ],
  // Currency conversion: source price * rate * (1 + markup%)
  currency: { from: "ZAR", to: "USD", rate: 0.054 },
  markupPct: 15,
  // Map Takealot category names/paths -> our shop categories
  // our categories: best | phones | parts | laptops | general
  categoryMap: {
    "electronics": "phones",
    "phones": "phones",
    "cellphones": "phones",
    "computers": "laptops",
    "laptops": "laptops",
    "home": "general",
    "home & living": "general",
    "automotive": "parts",
    "vehicle": "parts",
  },
  defaultCategory: "general",
  maxProducts: 50,               // cap per run
  requestDelayMs: 1500,          // be polite
  stock: 10,                     // default stock for imports
  dedupeByUrl: true,
  importImages: true,
};

function freshState() {
  return {
    running: false,
    startedAt: null,
    finishedAt: null,
    lastRun: null,
    imported: 0,
    skipped: 0,
    errors: [],
    log: [],
  };
}

/* ---------- HTML / JSON extraction ---------- */

function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function extractJsonLd(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const it of items) {
        if (it["@type"] === "ItemList" && Array.isArray(it.itemListElement)) {
          for (const el of it.itemListElement) {
            const p = el.item || el;
            if (p && (p.name || p.offers)) out.push(p);
          }
        } else if (it["@type"] === "Product") out.push(it);
      }
    } catch { /* skip malformed */ }
  }
  return out;
}

/* Recursively hunt for product-like objects inside __NEXT_DATA__ */
function huntProducts(node, found, depth) {
  if (!node || depth > 14 || found.length > 500) return;
  if (Array.isArray(node)) {
    for (const item of node) huntProducts(item, found, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const name = node.name || node.title || node.productName;
  const price = node.price ?? node.salePrice ?? node.currentPrice ??
    (node.offers && (node.offers.price ?? node.offers.lowPrice)) ??
    (node.pricing && node.pricing.price);
  const url = node.url || node.link || node.productUrl || node.href ||
    (node.offers && node.offers.url) ||
    (node.seo && node.seo.url);
  if (typeof name === "string" && name.length > 3 && price != null && !isNaN(Number(price))) {
    found.push({
      name: name.trim(),
      price: Number(price),
      url: typeof url === "string" ? url : "",
      image: node.image || node.imageUrl || node.thumbnail || (node.offers && node.offers.image) || "",
      category: node.category || node.categoryName || node.breadcrumb || "",
      description: node.description || "",
    });
    return; // don't descend into a matched product
  }
  for (const key of Object.keys(node)) {
    if (key === "props" || key === "pageProps" || key === "dehydratedState" || key === "queries" || Array.isArray(node[key]) || typeof node[key] === "object") {
      huntProducts(node[key], found, depth + 1);
    }
  }
}

function parseProducts(html, pageUrl) {
  const found = [];
  const next = extractNextData(html);
  if (next) huntProducts(next, found, 0);
  for (const p of extractJsonLd(html)) {
    const offers = p.offers || {};
    const price = p.offers && (p.offers.price ?? p.offers.lowPrice);
    found.push({
      name: String(p.name || "").trim(),
      price: Number(price ?? p.price ?? 0),
      url: p.url || "",
      image: Array.isArray(p.image) ? p.image[0] : (p.image || ""),
      category: "",
      description: p.description || "",
    });
  }
  // Fallback: loose regex for "name":"...","price":123 patterns in embedded JSON
  if (!found.length) {
    const re = /"name"\s*:\s*"([^"]{4,120})"[^{}]{0,400}?"price"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/g;
    let m;
    while ((m = re.exec(html)) && found.length < 200) {
      found.push({ name: m[1], price: Number(m[2]), url: "", image: "", category: "", description: "" });
    }
  }
  // Normalise URLs
  const base = new URL(pageUrl);
  for (const p of found) {
    if (p.url && !/^https?:/i.test(p.url)) p.url = new URL(p.url, base).href;
    if (p.image && !/^https?:/i.test(p.image)) p.image = new URL(p.image, base).href;
    if (!p.url) p.url = pageUrl;
  }
  return found;
}

/* ---------- Category mapping ---------- */

function mapCategory(raw, settings) {
  const map = settings.categoryMap || {};
  const text = String(raw || "").toLowerCase();
  for (const [key, target] of Object.entries(map)) {
    if (text.includes(key.toLowerCase())) return target;
  }
  return settings.defaultCategory || "general";
}

function convertPrice(zarPrice, settings) {
  const { rate } = settings.currency || {};
  const markup = (settings.markupPct ?? 0) / 100;
  const usd = Number(zarPrice) * Number(rate || 1) * (1 + markup);
  return Math.round(usd * 100) / 100;
}

/* ---------- Crawler ---------- */

async function fetchPage(url, delayMs) {
  if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a crawl. db = store object, settings = plugin settings, helpers = {uid, now, save}.
 * Mutates db.plugins.crawler.state for progress; returns final state.
 */
async function runCrawler(db, settings, helpers) {
  const { uid, now, save } = helpers;
  if (!db.plugins) db.plugins = {};
  if (!db.plugins.crawler) db.plugins.crawler = { settings: DEFAULT_SETTINGS, state: freshState() };
  const plugin = db.plugins.crawler;
  const state = plugin.state = freshState();
  state.running = true;
  state.startedAt = now();
  save();

  const log = (msg) => {
    state.log.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    if (state.log.length > 200) state.log.shift();
    save();
  };

  const urls = (settings.categoryUrls || [])
    .map((u) => /^https?:/i.test(u) ? u : new URL(u, settings.baseUrl).href)
    .slice(0, 10);

  if (!urls.length) {
    state.running = false; state.finishedAt = now();
    state.errors.push("No category URLs configured");
    save();
    return state;
  }
  if (!settings.targetVendorId || !db.vendors.some((v) => v.id === settings.targetVendorId)) {
    state.running = false; state.finishedAt = now();
    state.errors.push("targetVendorId is not a valid vendor");
    save();
    return state;
  }

  const seen = new Set(db.products.filter((p) => p.source === "crawler" && p.sourceUrl).map((p) => p.sourceUrl));
  let imported = 0, skipped = 0;

  for (const url of urls) {
    if (imported >= settings.maxProducts) break;
    try {
      log(`Fetching ${url}`);
      const html = await fetchPage(url, settings.requestDelayMs);
      const products = parseProducts(html, url);
      log(`  → ${products.length} candidates found`);

      for (const raw of products) {
        if (imported >= settings.maxProducts) break;
        if (!raw.name || !raw.price) { skipped++; continue; }
        if (settings.dedupeByUrl !== false && raw.url && seen.has(raw.url)) { skipped++; continue; }

        const price = convertPrice(raw.price, settings);
        if (!price || price <= 0) { skipped++; continue; }

        const product = {
          id: uid("prd"),
          vendorId: settings.targetVendorId,
          name: raw.name.slice(0, 160),
          price,
          category: mapCategory(raw.category || url, settings),
          stock: settings.stock ?? 10,
          active: true,
          createdAt: now(),
          source: "crawler",
          sourceUrl: raw.url || url,
          sourcePrice: raw.price,
          sourceCurrency: settings.currency?.from || "ZAR",
          image: settings.importImages ? raw.image : "",
          description: String(raw.description || "").slice(0, 500),
          rating: 0,
          reviews: 0,
        };
        db.products.push(product);
        if (raw.url) seen.add(raw.url);
        imported++;
        state.imported = imported;
        state.skipped = skipped;
        save();
      }
    } catch (e) {
      const msg = `Failed ${url}: ${e.message}`;
      state.errors.push(msg);
      log(msg);
    }
  }

  state.running = false;
  state.finishedAt = now();
  state.lastRun = { at: now(), imported, skipped, errors: state.errors.length };
  save();
  log(`Done — imported ${imported}, skipped ${skipped}`);
  return state;
}

module.exports = { DEFAULT_SETTINGS, freshState, runCrawler, parseProducts, convertPrice, mapCategory };
