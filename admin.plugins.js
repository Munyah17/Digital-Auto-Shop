
/* ================= Plugins ================= */

let pluginCache = [];
let pluginVendors = [];

async function loadPlugins() {
  const list = document.getElementById("pluginList");
  if (!list) return;
  try {
    const [pRes, vRes] = await Promise.all([
      fetch("/api/plugins", { headers: authHeaders() }),
      fetch("/api/vendors"),
    ]);
    if (pRes.status === 401) { clearAuth(); location.reload(); return; }
    pluginCache = pRes.ok ? await pRes.json() : [];
    pluginVendors = vRes.ok ? await vRes.json() : [];
  } catch {
    list.innerHTML = `<div class="order-card"><p>Could not load plugins — is the backend running?</p></div>`;
    return;
  }
  renderPlugins();
  pollPluginStatus();
}

function renderPlugins() {
  const list = document.getElementById("pluginList");
  if (!pluginCache.length) {
    list.innerHTML = `<div class="order-card"><p>No plugins installed.</p></div>`;
    return;
  }
  list.innerHTML = pluginCache.map((p) => pluginCard(p)).join("");
}

function pluginCard(p) {
  const s = p.settings || {};
  const st = p.state || {};
  const isCrawler = p.id === "takealot-crawler";
  const running = !!st.running;
  const vendorOpts = pluginVendors.map((v) =>
    `<option value="${escapeHtml(v.id)}" ${v.id === s.targetVendorId ? "selected" : ""}>${escapeHtml(v.name)}</option>`
  ).join("");

  const statusHtml = st.lastRun
    ? `<div class="order-meta-line">Last run ${escapeHtml(st.lastRun.at || "")} — imported <strong>${st.lastRun.imported ?? 0}</strong>, skipped ${st.lastRun.skipped ?? 0}, errors ${st.lastRun.errors ?? 0}</div>`
    : `<div class="order-meta-line">Never run yet.</div>`;
  const logHtml = (st.log || []).slice(-12).reverse().map((l) =>
    `<div style="font-family:monospace;font-size:.78rem;color:var(--muted)">${escapeHtml(l)}</div>`
  ).join("");
  const errHtml = (st.errors || []).slice(-5).map((e) =>
    `<div style="color:#b91c1c;font-size:.82rem">&#9888; ${escapeHtml(e)}</div>`
  ).join("");

  const settingsFields = isCrawler ? `
    <div class="field"><label>Target vendor (imports go here)</label>
      <select id="pl-vendor">${vendorOpts}</select></div>
    <div class="field"><label>Base URL</label>
      <input id="pl-base" type="text" value="${escapeHtml(s.baseUrl || "")}"/></div>
    <div class="field-row">
      <div class="field"><label>Currency from</label>
        <input id="pl-cur-from" type="text" value="${escapeHtml(s.currency?.from || "ZAR")}"/></div>
      <div class="field"><label>Currency to</label>
        <input id="pl-cur-to" type="text" value="${escapeHtml(s.currency?.to || "USD")}"/></div>
      <div class="field"><label>Exchange rate</label>
        <input id="pl-cur-rate" type="number" step="0.0001" value="${escapeHtml(s.currency?.rate ?? 0.054)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Markup %</label>
        <input id="pl-markup" type="number" step="0.5" value="${escapeHtml(s.markupPct ?? 15)}"/></div>
      <div class="field"><label>Max products per run</label>
        <input id="pl-max" type="number" value="${escapeHtml(s.maxProducts ?? 50)}"/></div>
      <div class="field"><label>Default stock</label>
        <input id="pl-stock" type="number" value="${escapeHtml(s.stock ?? 10)}"/></div>
      <div class="field"><label>Delay between requests (ms)</label>
        <input id="pl-delay" type="number" value="${escapeHtml(s.requestDelayMs ?? 1500)}"/></div>
    </div>
    <div class="field"><label>Category URLs to crawl (one per line, relative or absolute)</label>
      <textarea id="pl-urls" rows="4">${escapeHtml((s.categoryUrls || []).join("\n"))}</textarea></div>
    <div class="field"><label>Category map (JSON: takealot keyword &rarr; shop category)</label>
      <textarea id="pl-catmap" rows="5" style="font-family:monospace;font-size:.8rem">${escapeHtml(JSON.stringify(s.categoryMap || {}, null, 2))}</textarea></div>
    <div class="field"><label>Default category (fallback)</label>
      <input id="pl-defcat" type="text" value="${escapeHtml(s.defaultCategory || "general")}"/></div>
    <label class="f-check"><input type="checkbox" id="pl-enabled" ${s.enabled !== false ? "checked" : ""}/><span>Plugin enabled</span></label>
    <label class="f-check"><input type="checkbox" id="pl-dedupe" ${s.dedupeByUrl !== false ? "checked" : ""}/><span>Dedupe by source URL</span></label>
    <label class="f-check"><input type="checkbox" id="pl-images" ${s.importImages !== false ? "checked" : ""}/><span>Import images</span></label>
  ` : `<p class="text-muted">No configurable settings for this plugin.</p>`;

  return `
  <article class="order-card" data-plugin="${escapeHtml(p.id)}">
    <div class="order-card-top">
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="order-meta-line">${escapeHtml(p.description || "")}</div>
        ${statusHtml}
      </div>
      <span class="pill ${running ? "paid_escrow" : "completed"}">${running ? "Running…" : "Idle"}</span>
    </div>
    ${settingsFields}
    ${errHtml}
    ${logHtml ? `<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--muted);font-size:.82rem">Crawl log</summary>${logHtml}</details>` : ""}
    <div class="order-actions" style="margin-top:12px">
      <button class="btn btn-solid" type="button" data-save="${escapeHtml(p.id)}">Save settings</button>
      ${isCrawler ? `<button class="btn btn-line" type="button" data-run="${escapeHtml(p.id)}" ${running ? "disabled" : ""}>${running ? "Crawling…" : "Run crawl now"}</button>` : ""}
    </div>
  </article>`;
}

function readCrawlerSettings() {
  let catMap = {};
  try { catMap = JSON.parse(document.getElementById("pl-catmap").value || "{}"); }
  catch { alert("Category map must be valid JSON"); return null; }
  return {
    enabled: document.getElementById("pl-enabled").checked,
    targetVendorId: document.getElementById("pl-vendor").value,
    baseUrl: document.getElementById("pl-base").value.trim(),
    categoryUrls: document.getElementById("pl-urls").value.split("\n").map((s) => s.trim()).filter(Boolean),
    currency: {
      from: document.getElementById("pl-cur-from").value.trim() || "ZAR",
      to: document.getElementById("pl-cur-to").value.trim() || "USD",
      rate: parseFloat(document.getElementById("pl-cur-rate").value) || 0.054,
    },
    markupPct: parseFloat(document.getElementById("pl-markup").value) || 0,
    maxProducts: parseInt(document.getElementById("pl-max").value, 10) || 50,
    stock: parseInt(document.getElementById("pl-stock").value, 10) || 10,
    requestDelayMs: parseInt(document.getElementById("pl-delay").value, 10) || 1500,
    categoryMap: catMap,
    defaultCategory: document.getElementById("pl-defcat").value.trim() || "general",
    dedupeByUrl: document.getElementById("pl-dedupe").checked,
    importImages: document.getElementById("pl-images").checked,
  };
}

document.getElementById("pluginList")?.addEventListener("click", async (e) => {
  const saveBtn = e.target.closest("[data-save]");
  const runBtn = e.target.closest("[data-run]");
  if (saveBtn) {
    const id = saveBtn.dataset.save;
    const settings = id === "takealot-crawler" ? readCrawlerSettings() : null;
    if (settings === null && id === "takealot-crawler") return;
    saveBtn.disabled = true;
    try {
      const res = await fetch("/api/plugins/" + encodeURIComponent(id) + "/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      const p = pluginCache.find((x) => x.id === id);
      if (p) p.settings = data.settings;
      toast.textContent = "Plugin settings saved";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1800);
    } catch (err) { alert(err.message); }
    saveBtn.disabled = false;
  }
  if (runBtn) {
    const id = runBtn.dataset.run;
    runBtn.disabled = true;
    runBtn.textContent = "Starting…";
    try {
      const res = await fetch("/api/plugins/" + encodeURIComponent(id) + "/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Run failed");
      pollPluginStatus();
    } catch (err) { alert(err.message); runBtn.disabled = false; }
  }
});

let pluginPollTimer = null;
function pollPluginStatus() {
  if (pluginPollTimer) return;
  pluginPollTimer = setInterval(async () => {
    try {
      const res = await fetch("/api/plugins/takealot-crawler/status", { headers: authHeaders() });
      if (!res.ok) return;
      const st = await res.json();
      const p = pluginCache.find((x) => x.id === "takealot-crawler");
      if (p) { p.state = st; renderPlugins(); }
      if (!st.running) { clearInterval(pluginPollTimer); pluginPollTimer = null; }
    } catch { /* keep polling */ }
  }, 3000);
}
