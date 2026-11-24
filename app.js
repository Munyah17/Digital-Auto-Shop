/* Digital Auto Shop — homepage logic */

/* ================= Hero slider ================= */
/* Slides are managed via admin.html and persisted in localStorage.
   Up to 10 slides. A slide with no banner assigned is never displayed. */

const SLIDES_KEY = "das_slides_v1";
const MAX_SLIDES = 10;

const DEFAULT_SLIDES = [
  {
    active: true,
    banner: "gradient-blue",
    eyebrow: "Zimbabwe's Most Trusted Tech & Auto Store",
    title: "Everything your car, phone & work needs.",
    titleAccent: "phone & work",
    subtitle: "Phones, gadgets, genuine vehicle parts and laptops — all under one roof, delivered fast across Zimbabwe.",
    ctaText: "Shop Best Picks",
    ctaLink: "#best-picks",
    cta2Text: "Talk to an Expert",
    cta2Link: "#cta",
  },
  {
    active: true,
    banner: "gradient-cyan",
    eyebrow: "New Arrivals",
    title: "iPhone 15 Pro Max now in stock.",
    titleAccent: "iPhone 15 Pro Max",
    subtitle: "Latest flagship with trade-in offers and 0% EcoCash instalments available.",
    ctaText: "Shop Phones",
    ctaLink: "shop.html?category=phones-gadgets",
    cta2Text: "See Deals",
    cta2Link: "shop.html",
  },
  {
    active: true,
    banner: "gradient-indigo",
    eyebrow: "Auto Season",
    title: "Genuine parts, fitted while you wait.",
    titleAccent: "genuine parts",
    subtitle: "OEM brake pads, batteries, tyres and fluids for Toyota, Nissan, Ford & Isuzu — free fitting included.",
    ctaText: "Shop Parts",
    ctaLink: "shop.html?category=vehicle-parts",
    cta2Text: "Book Fitting",
    cta2Link: "#cta",
  },
];

const GRADIENTS = {
  "gradient-blue": "linear-gradient(120deg,#0e2a6e 0%,#1440a0 50%,#1d5bf0 100%)",
  "gradient-cyan": "linear-gradient(120deg,#083344 0%,#0e5f8a 50%,#0ea5e9 100%)",
  "gradient-indigo": "linear-gradient(120deg,#1e1b4b 0%,#3730a3 50%,#4f46e5 100%)",
  "gradient-sky": "linear-gradient(120deg,#0c4a6e 0%,#0369a1 50%,#38bdf8 100%)",
};

function loadSlides() {
  try {
    const raw = localStorage.getItem(SLIDES_KEY);
    if (!raw) return DEFAULT_SLIDES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SLIDES) : DEFAULT_SLIDES;
  } catch {
    return DEFAULT_SLIDES;
  }
}

function saveSlides(slides) {
  localStorage.setItem(SLIDES_KEY, JSON.stringify(slides.slice(0, MAX_SLIDES)));
}

function slideStyle(slide) {
  // banner may be an image URL or a gradient preset key
  if (slide.banner && slide.banner.startsWith("http")) {
    return `background-image: linear-gradient(rgba(10,31,77,.72), rgba(10,31,77,.55)), url('${slide.banner}'); background-size: cover; background-position: center;`;
  }
  const g = GRADIENTS[slide.banner] || GRADIENTS["gradient-blue"];
  return `background: ${g};`;
}

function renderHero() {
  const slides = loadSlides().filter((s) => s.active && s.banner);
  const wrap = document.getElementById("heroSlides");
  const dotsWrap = document.getElementById("heroDots");
  if (!slides.length) {
    wrap.innerHTML = `<div class="hero-slide active" style="${slideStyle(DEFAULT_SLIDES[0])}">
      <div class="container">
        <div>
          <span class="hero-eyebrow">${DEFAULT_SLIDES[0].eyebrow}</span>
          <h1>${DEFAULT_SLIDES[0].title.replace(DEFAULT_SLIDES[0].titleAccent, `<span class="grad">${DEFAULT_SLIDES[0].titleAccent}</span>`)}</h1>
          <p>${DEFAULT_SLIDES[0].subtitle}</p>
          <div class="hero-cta">
            <a href="${DEFAULT_SLIDES[0].ctaLink}" class="btn btn-primary">${DEFAULT_SLIDES[0].ctaText}</a>
            <a href="${DEFAULT_SLIDES[0].cta2Link}" class="btn btn-ghost">${DEFAULT_SLIDES[0].cta2Text}</a>
          </div>
          <div class="hero-stats">
            <div><strong>12k+</strong><span>Happy customers</span></div>
            <div><strong>4.9★</strong><span>Average rating</span></div>
            <div><strong>24h</strong><span>Dispatch time</span></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-ring"></div>
          <div class="hero-card hero-card-1"><span class="hc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg></span><div><strong>iPhone 15 Pro</strong><span>From $1,599</span></div></div>
          <div class="hero-card hero-card-2"><span class="hc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></svg></span><div><strong>Michelin Tyres</strong><span>From $145</span></div></div>
          <div class="hero-card hero-card-3"><span class="hc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg></span><div><strong>ThinkPad X1</strong><span>From $1,899</span></div></div>
        </div>
      </div>
    </div>`;
    dotsWrap.innerHTML = "";
    return;
  }

  wrap.innerHTML = slides.map((s, i) => `
    <div class="hero-slide ${i === 0 ? "active" : ""}" style="${slideStyle(s)}">
      <div class="container">
        <div>
          <span class="hero-eyebrow">${s.eyebrow || ""}</span>
          <h1>${(s.title || "").replace(s.titleAccent || "", s.titleAccent ? `<span class="grad">${s.titleAccent}</span>` : "")}</h1>
          <p>${s.subtitle || ""}</p>
          <div class="hero-cta">
            <a href="${s.ctaLink || "#"}" class="btn btn-primary">${s.ctaText || "Shop Now"}</a>
            <a href="${s.cta2Link || "#"}" class="btn btn-ghost">${s.cta2Text || "Learn More"}</a>
          </div>
          <div class="hero-stats">
            <div><strong>12k+</strong><span>Happy customers</span></div>
            <div><strong>4.9★</strong><span>Average rating</span></div>
            <div><strong>24h</strong><span>Dispatch time</span></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-ring"></div>
          <div class="hero-card hero-card-1"><span class="hc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg></span><div><strong>iPhone 15 Pro</strong><span>From $1,599</span></div></div>
          <div class="hero-card hero-card-2"><span class="hc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></svg></span><div><strong>Michelin Tyres</strong><span>From $145</span></div></div>
          <div class="hero-card hero-card-3"><span class="hc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg></span><div><strong>ThinkPad X1</strong><span>From $1,899</span></div></div>
        </div>
      </div>
    </div>`).join("");

  dotsWrap.innerHTML = slides.map((_, i) =>
    `<button class="hero-dot ${i === 0 ? "active" : ""}" data-i="${i}" aria-label="Slide ${i + 1}"></button>`
  ).join("");

  initSlider(wrap, dotsWrap);
}

function initSlider(wrap, dotsWrap) {
  const slides = wrap.querySelectorAll(".hero-slide");
  const dots = dotsWrap.querySelectorAll(".hero-dot");
  const prevBtn = document.getElementById("heroPrev");
  const nextBtn = document.getElementById("heroNext");
  if (slides.length <= 1) {
    dotsWrap.style.display = "none";
    if (prevBtn) prevBtn.classList.add("hidden");
    if (nextBtn) nextBtn.classList.add("hidden");
    return;
  }
  let current = 0;
  let timer;

  const go = (i) => {
    slides[current].classList.remove("active");
    dots[current]?.classList.remove("active");
    current = (i + slides.length) % slides.length;
    slides[current].classList.add("active");
    dots[current]?.classList.add("active");
  };
  const autoplay = () => {
    clearInterval(timer);
    timer = setInterval(() => go(current + 1), 6000);
  };

  prevBtn?.addEventListener("click", () => { go(current - 1); autoplay(); });
  nextBtn?.addEventListener("click", () => { go(current + 1); autoplay(); });

  // pause autoplay while hovering / touching
  wrap.closest(".hero")?.addEventListener("mouseenter", () => clearInterval(timer));
  wrap.closest(".hero")?.addEventListener("mouseleave", autoplay);

  dotsWrap.addEventListener("click", (e) => {
    const d = e.target.closest(".hero-dot");
    if (!d) return;
    go(+d.dataset.i);
    autoplay();
  });

  // swipe support
  let startX = null;
  wrap.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
  wrap.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 45) { go(current + (dx < 0 ? 1 : -1)); autoplay(); }
    startX = null;
  }, { passive: true });

  autoplay();
}

/* ================= Product carousels ================= */
document.querySelectorAll("[data-carousel]").forEach((car) => {
  const track = car.querySelector(".car-track");
  const prev = car.querySelector(".prev");
  const next = car.querySelector(".next");
  const step = () => (track.querySelector(".p-card")?.offsetWidth || 200) + 18;

  next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
  prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));

  const update = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
  };
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
});

/* ================= Cart ================= */
let cartCount = 0;
const cartEl = document.getElementById("cartCount");
const toast = document.getElementById("toast");
let toastTimer;

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".p-add");
  if (!btn) return;
  cartCount++;
  cartEl.textContent = cartCount;
  cartEl.classList.remove("bump");
  void cartEl.offsetWidth;
  cartEl.classList.add("bump");

  toast.textContent = `Added to cart — ${fmt(+btn.dataset.price)}`;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
});

/* ================= Header / nav ================= */
const header = document.getElementById("header");
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

const burger = document.getElementById("burger");
const mobileNav = document.getElementById("mobileNav");
burger.addEventListener("click", () => mobileNav.classList.toggle("open"));
mobileNav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => mobileNav.classList.remove("open"))
);

/* ================= Reveal on scroll ================= */
const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add("visible")),
  { threshold: 0.1 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ================= Active nav link ================= */
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-link");
window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((s) => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });
  navLinks.forEach((l) =>
    l.classList.toggle("active", l.getAttribute("href") === "#" + current)
  );
}, { passive: true });

/* ================= Init ================= */
renderHero();
document.getElementById("track-best").innerHTML = PRODUCTS.best.map((p) => productCard(p)).join("");
document.getElementById("track-phones").innerHTML = PRODUCTS.phones.map((p) => productCard(p)).join("");
document.getElementById("track-parts").innerHTML = PRODUCTS.parts.map((p) => productCard(p)).join("");
document.getElementById("track-laptops").innerHTML = PRODUCTS.laptops.map((p) => productCard(p)).join("");
