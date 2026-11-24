/* Super Admin — hero slide manager (localStorage-backed, API-ready) */

const SLIDES_KEY = "das_slides_v1";
const MAX_SLIDES = 10;

const DEFAULT_SLIDES = [
  { active: true, banner: "gradient-blue", eyebrow: "Zimbabwe's Most Trusted Tech & Auto Store", title: "Everything your car, phone & work needs.", titleAccent: "phone & work", subtitle: "Phones, gadgets, genuine vehicle parts and laptops — all under one roof, delivered fast across Zimbabwe.", ctaText: "Shop Best Picks", ctaLink: "#best-picks", cta2Text: "Talk to an Expert", cta2Link: "#cta" },
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

function persist() {
  localStorage.setItem(SLIDES_KEY, JSON.stringify(slides.slice(0, MAX_SLIDES)));
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

render();
