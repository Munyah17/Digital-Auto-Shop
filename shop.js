/* Shop page — filtering, sorting, search */

const params = new URLSearchParams(location.search);
const state = {
  category: params.get("category") || "all",   // all | best-picks | phones-gadgets | vehicle-parts | laptops-accessories
  cats: new Set(),                              // multi category checkboxes
  query: "",
  min: null,
  max: null,
  inStock: false,
  onSale: false,
  sort: "featured",
};

const CAT_MAP = {
  "best-picks": "best",
  "phones-gadgets": "phones",
  "vehicle-parts": "parts",
  "laptops-accessories": "laptops",
};

/* ---------- Build filter UI ---------- */
const catFiltersEl = document.getElementById("catFilters");
catFiltersEl.innerHTML = [
  ["all", "All Products"],
  ...Object.entries(CATEGORIES).map(([key, c]) => [c.slug, c.label]),
].map(([slug, label]) => {
  const count = slug === "all"
    ? ALL_PRODUCTS.length
    : ALL_PRODUCTS.filter((p) => p.section === CAT_MAP[slug]).length;
  return `<label class="f-check"><input type="radio" name="cat" value="${slug}" ${state.category === slug ? "checked" : ""}/><span>${label}</span><em>${count}</em></label>`;
}).join("");

catFiltersEl.addEventListener("change", (e) => {
  if (e.target.name !== "cat") return;
  state.category = e.target.value;
  state.cats.clear();
  applyFilters();
});

/* ---------- Header / cart / mobile ---------- */
const header = document.getElementById("header");
window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 10), { passive: true });
const burger = document.getElementById("burger");
const mobileNav = document.getElementById("mobileNav");
burger.addEventListener("click", () => mobileNav.classList.toggle("open"));
mobileNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => mobileNav.classList.remove("open")));

const cartEl = document.getElementById("cartCount");
const toast = document.getElementById("toast");
let toastTimer;
document.addEventListener("click", (e) => {
  const buy = e.target.closest(".p-buy");
  const add = e.target.closest(".p-add");
  const btn = buy || add;
  if (!btn) return;
  const item = { name: btn.dataset.name, price: +btn.dataset.price, vendor: btn.dataset.vendor };
  addToCart(item);
  syncCartBadge();
  cartEl.classList.remove("bump");
  void cartEl.offsetWidth;
  cartEl.classList.add("bump");
  toast.textContent = buy ? "Added — taking you to checkout…" : `Added to cart — ${fmt(item.price)}`;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  if (buy) setTimeout(() => (location.href = "checkout.html"), 600);
});

/* ---------- Filters ---------- */
document.getElementById("searchInput").addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  applyFilters();
});
document.getElementById("minPrice").addEventListener("input", (e) => {
  state.min = e.target.value === "" ? null : +e.target.value;
  applyFilters();
});
document.getElementById("maxPrice").addEventListener("input", (e) => {
  state.max = e.target.value === "" ? null : +e.target.value;
  applyFilters();
});
document.getElementById("inStockOnly").addEventListener("change", (e) => {
  state.inStock = e.target.checked;
  applyFilters();
});
document.getElementById("onSaleOnly").addEventListener("change", (e) => {
  state.onSale = e.target.checked;
  applyFilters();
});
document.getElementById("sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  applyFilters();
});
document.getElementById("clearFilters").addEventListener("click", () => {
  state.category = "all"; state.query = ""; state.min = state.max = null;
  state.inStock = state.onSale = false; state.sort = "featured";
  document.getElementById("searchInput").value = "";
  document.getElementById("minPrice").value = "";
  document.getElementById("maxPrice").value = "";
  document.getElementById("inStockOnly").checked = false;
  document.getElementById("onSaleOnly").checked = false;
  document.getElementById("sortSelect").value = "featured";
  catFiltersEl.querySelector('input[value="all"]').checked = true;
  applyFilters();
});
document.getElementById("filtersToggle").addEventListener("click", () => {
  document.getElementById("filters").classList.toggle("collapsed");
});

/* ---------- Render ---------- */
function getFiltered() {
  let list = ALL_PRODUCTS.slice();

  if (state.category !== "all") {
    const key = CAT_MAP[state.category];
    list = list.filter((p) => p.section === key);
  }
  if (state.query) {
    list = list.filter((p) =>
      p.name.toLowerCase().includes(state.query) ||
      p.vendor.toLowerCase().includes(state.query) ||
      p.cat.toLowerCase().includes(state.query)
    );
  }
  if (state.min !== null) list = list.filter((p) => p.price >= state.min);
  if (state.max !== null) list = list.filter((p) => p.price <= state.max);
  if (state.inStock) list = list.filter((p) => p.stock > 0);
  if (state.onSale) list = list.filter((p) => p.old !== null);

  switch (state.sort) {
    case "price-asc": list.sort((a, b) => a.price - b.price); break;
    case "price-desc": list.sort((a, b) => b.price - a.price); break;
    case "rating": list.sort((a, b) => b.rating - a.rating); break;
    case "reviews": list.sort((a, b) => b.reviews - a.reviews); break;
    default: list.sort((a, b) => (b.badge === "Best Seller") - (a.badge === "Best Seller") || b.reviews - a.reviews);
  }
  return list;
}

function applyFilters() {
  syncHeading();
  markNav();
  document.querySelector(".shop-layout")?.classList.toggle("no-filters", state.category !== "all");
  const list = getFiltered();
  const grid = document.getElementById("shopGrid");
  document.getElementById("shopCount").textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;

  if (!list.length) {
    grid.innerHTML = `
      <div class="shop-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8.5 11h5"/></svg>
        <h3>No products found</h3>
        <p>Try adjusting your filters or search term.</p>
      </div>`;
    return;
  }
  grid.innerHTML = list.map((p) => productCard(p, { showSection: true })).join("");
}

function syncHeading() {
  const entry = Object.entries(CATEGORIES).find(([, c]) => c.slug === state.category);
  const title = document.getElementById("pageTitle");
  const sub = document.getElementById("pageSub");
  if (!entry) {
    title.textContent = "Shop All";
    sub.textContent = "Browse our full catalogue — phones, gadgets, vehicle parts and laptops.";
    document.title = "Shop All Products — Digital Auto Shop";
    return;
  }
  const count = ALL_PRODUCTS.filter((p) => p.section === CAT_MAP[state.category]).length;
  title.textContent = entry[1].label;
  sub.textContent = `Showing ${entry[1].label.toLowerCase()} only — ${count} products available.`;
  document.title = `${entry[1].label} — Digital Auto Shop`;
}

function markNav() {
  document.querySelectorAll(".nav-link, .mobile-nav a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const active = state.category === "all"
      ? href === "shop.html"
      : href.indexOf("category=" + state.category) !== -1;
    a.classList.toggle("active", active);
  });
}

applyFilters();
