/* Shared product catalogue + SVG line icons (no emojis) */

const ICONS = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  watch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="14" r="3.5"/><path d="M12 6.5h.01"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/></svg>',
  gamepad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v4M5 13h4"/><circle cx="16" cy="12" r="1"/><circle cx="18.5" cy="10.5" r="1"/></svg>',
  plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v5M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0V7z"/><path d="M12 17v5"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15l1.5-5A2 2 0 0 1 7.4 8.5h9.2a2 2 0 0 1 1.9 1.5L20 15"/><rect x="3" y="15" width="18" height="4" rx="1"/><circle cx="7.5" cy="19" r="1.8"/><circle cx="16.5" cy="19" r="1.8"/></svg>',
  oil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v4l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 16l-5-9V3"/><path d="M7.5 14h9"/></svg>',
  tire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
  battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="17" height="9" rx="2"/><path d="M22 11v3M6 11v3M10 11v3"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>',
  wiper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21l1-12h12l1 12"/><path d="M12 9V4"/><path d="M4 13c3-2 13-2 16 0"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
  keyboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/></svg>',
  mouse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3"/></svg>',
  ssd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h.01M11 12h.01M15 12h.01"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-4z"/><path d="m9 12 2 2 4-4"/></svg>',
};

const CATEGORIES = {
  best:     { label: "Best Picks",            slug: "best-picks" },
  phones:   { label: "Phones & Gadgets",      slug: "phones-gadgets" },
  parts:    { label: "Vehicle Parts",         slug: "vehicle-parts" },
  laptops:  { label: "Laptops & Accessories", slug: "laptops-accessories" },
};

const PRODUCTS = {
  best: [
    { icon: "phone", name: "Samsung Galaxy S24 Ultra 256GB", cat: "phones", price: 1299, old: 1499, badge: "Best Seller", rating: 4.9, reviews: 412, vendor: "TechZone", stock: 14 },
    { icon: "plug", name: "Anker 737 Power Bank 24,000mAh", cat: "phones", price: 89, old: 119, badge: "Sale", sale: true, rating: 4.8, reviews: 530, vendor: "GadgetHub", stock: 32 },
    { icon: "tire", name: "Michelin CrossClimate2 Tyres (Set of 4)", cat: "parts", price: 640, old: null, badge: "Best Seller", rating: 4.9, reviews: 187, vendor: "AutoParts Co.", stock: 6 },
    { icon: "laptop", name: "HP Spectre x360 14\" Touchscreen", cat: "laptops", price: 1499, old: 1699, badge: "Sale", sale: true, rating: 4.7, reviews: 96, vendor: "ComXpert", stock: 9 },
  ],
  phones: [
    { icon: "phone", name: "iPhone 15 Pro Max 256GB", cat: "phones", price: 1599, old: null, badge: "New", isNew: true, rating: 4.9, reviews: 231, vendor: "TechZone", stock: 11 },
    { icon: "phone", name: "Google Pixel 8 Pro 128GB", cat: "phones", price: 999, old: 1099, badge: "Sale", sale: true, rating: 4.8, reviews: 178, vendor: "GadgetHub", stock: 17 },
    { icon: "headphones", name: "Sony WH-1000XM5 Headphones", cat: "phones", price: 349, old: null, badge: null, rating: 4.9, reviews: 642, vendor: "SoundWorld", stock: 24 },
    { icon: "watch", name: "Apple Watch Series 9 GPS", cat: "phones", price: 429, old: 479, badge: "Sale", sale: true, rating: 4.8, reviews: 305, vendor: "TechZone", stock: 13 },
    { icon: "speaker", name: "JBL Charge 5 Bluetooth Speaker", cat: "phones", price: 129, old: null, badge: "Best Seller", rating: 4.7, reviews: 891, vendor: "SoundWorld", stock: 40 },
    { icon: "camera", name: "GoPro Hero 12 Black", cat: "phones", price: 399, old: null, badge: null, rating: 4.6, reviews: 154, vendor: "GadgetHub", stock: 8 },
    { icon: "plug", name: "UGREEN Nexode 100W GaN Charger", cat: "phones", price: 59, old: 79, badge: "Sale", sale: true, rating: 4.8, reviews: 1204, vendor: "GadgetHub", stock: 55 },
    { icon: "gamepad", name: "Nintendo Switch OLED", cat: "phones", price: 349, old: null, badge: "New", isNew: true, rating: 4.9, reviews: 377, vendor: "GameStop ZW", stock: 21 },
  ],
  parts: [
    { icon: "oil", name: "Castrol Edge 5W-30 Engine Oil 5L", cat: "parts", price: 42, old: null, badge: "Best Seller", rating: 4.9, reviews: 1502, vendor: "AutoParts Co.", stock: 120 },
    { icon: "tire", name: "Bridgestone Turanza T005 Tyre", cat: "parts", price: 145, old: 165, badge: "Sale", sale: true, rating: 4.7, reviews: 268, vendor: "TyreKing", stock: 45 },
    { icon: "battery", name: "Willard Automotive Battery 12V 70Ah", cat: "parts", price: 189, old: null, badge: null, rating: 4.8, reviews: 445, vendor: "AutoParts Co.", stock: 18 },
    { icon: "car", name: "Genuine Toyota Brake Pads (Front)", cat: "parts", price: 68, old: null, badge: "Best Seller", rating: 4.9, reviews: 312, vendor: "OEM Direct", stock: 27 },
    { icon: "bulb", name: "Philips H7 Headlight Bulbs (Pair)", cat: "parts", price: 24, old: 32, badge: "Sale", sale: true, rating: 4.6, reviews: 689, vendor: "AutoParts Co.", stock: 80 },
    { icon: "shield", name: "Rain-X Windshield Treatment 500ml", cat: "parts", price: 18, old: null, badge: null, rating: 4.5, reviews: 203, vendor: "CarCare Plus", stock: 64 },
    { icon: "spark", name: "NGK Iridium Spark Plugs (Set of 4)", cat: "parts", price: 56, old: null, badge: null, rating: 4.8, reviews: 176, vendor: "OEM Direct", stock: 39 },
    { icon: "wiper", name: "Bosch Wiper Blades (Pair)", cat: "parts", price: 29, old: 39, badge: "Sale", sale: true, rating: 4.7, reviews: 534, vendor: "CarCare Plus", stock: 51 },
  ],
  laptops: [
    { icon: "laptop", name: "Lenovo ThinkPad X1 Carbon Gen 12", cat: "laptops", price: 1899, old: null, badge: "Best Seller", rating: 4.9, reviews: 87, vendor: "ComXpert", stock: 7 },
    { icon: "laptop", name: "Dell XPS 15 OLED 3.8K", cat: "laptops", price: 2199, old: 2499, badge: "Sale", sale: true, rating: 4.8, reviews: 64, vendor: "ComXpert", stock: 5 },
    { icon: "gamepad", name: "ASUS ROG Strix G16 Gaming", cat: "laptops", price: 1799, old: null, badge: "New", isNew: true, rating: 4.9, reviews: 112, vendor: "GameStop ZW", stock: 10 },
    { icon: "laptop", name: "Acer Aspire 5 Student Edition", cat: "laptops", price: 649, old: 749, badge: "Sale", sale: true, rating: 4.6, reviews: 298, vendor: "ComXpert", stock: 22 },
    { icon: "laptop", name: "MacBook Air M3 13\" 8GB/256GB", cat: "laptops", price: 1599, old: null, badge: null, rating: 4.9, reviews: 143, vendor: "TechZone", stock: 12 },
    { icon: "keyboard", name: "Logitech MX Keys Keyboard", cat: "laptops", price: 99, old: 119, badge: "Sale", sale: true, rating: 4.8, reviews: 421, vendor: "GadgetHub", stock: 33 },
    { icon: "mouse", name: "Logitech MX Master 3S Mouse", cat: "laptops", price: 89, old: null, badge: "Best Seller", rating: 4.9, reviews: 567, vendor: "GadgetHub", stock: 47 },
    { icon: "ssd", name: "Samsung T7 Shield 2TB SSD", cat: "laptops", price: 149, old: 179, badge: "Sale", sale: true, rating: 4.8, reviews: 389, vendor: "ComXpert", stock: 29 },
  ],
};

/* Flattened catalogue for shop page */
const ALL_PRODUCTS = Object.entries(PRODUCTS).flatMap(([section, items]) =>
  items.map((p) => ({ ...p, section }))
);

const fmt = (n) => "$" + Number(n).toLocaleString();

function badgeClass(p) {
  if (p.sale) return "sale";
  if (p.isNew) return "new";
  return "";
}

function productCard(p, { showSection = false } = {}) {
  const badge = p.badge
    ? `<span class="p-badge ${badgeClass(p)}">${p.badge}</span>`
    : "";
  const old = p.old ? `<span class="p-old">${fmt(p.old)}</span>` : "";
  const sectionTag = showSection
    ? `<span class="p-cat">${CATEGORIES[p.section].label}</span>`
    : "";
  return `
    <article class="p-card" data-id="${p.name}">
      <div class="p-img">
        ${badge}
        <button class="p-wish" aria-label="Add to wishlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
        </button>
        <span class="p-icon">${ICONS[p.icon] || ICONS.phone}</span>
      </div>
      <div class="p-body">
        ${sectionTag}
        <h3 class="p-name">${p.name}</h3>
        <div class="p-meta">
          <span class="p-vendor">${p.vendor}</span>
          <span class="p-rating"><b>★</b> ${p.rating} <span class="p-rev">(${p.reviews})</span></span>
        </div>
        <div class="p-price-row">
          <span class="p-price">${fmt(p.price)}</span>
          ${old}
        </div>
        <button class="p-add" data-price="${p.price}">Add to Cart</button>
      </div>
    </article>`;
}
