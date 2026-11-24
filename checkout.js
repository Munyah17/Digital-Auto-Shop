/* Checkout — builds order from localStorage cart, posts to /api/orders */

const fmt = (n) => "$" + Number(n).toLocaleString();
const $ = (id) => document.getElementById(id);

let deliveryFee = 0;
let feeInfo = null;

function renderCart() {
  const cart = getCart();
  const wrap = $("cartItems");
  if (!cart.length) {
    wrap.innerHTML = `<p style="color:var(--muted);font-size:.88rem;padding:12px 0">Your cart is empty.</p>`;
    $("cartTotal").textContent = "$0";
    $("placeOrder").disabled = true;
    return;
  }
  wrap.innerHTML = cart.map((c) => `
    <div class="co-item">
      <div>
        <strong style="font-size:.86rem">${c.name}</strong><br/>
        <span style="font-size:.76rem;color:var(--muted)">${c.vendor} • ${fmt(c.price)} each</span>
      </div>
      <div class="qty-ctrl">
        <button type="button" data-dec="${c.name}">−</button>
        <span>${c.qty}</span>
        <button type="button" data-inc="${c.name}">+</button>
      </div>
      <span style="min-width:64px;text-align:right;font-weight:600">${fmt(c.price * c.qty)}</span>
    </div>`).join("");
  updateTotal();
}

function updateTotal() {
  const cart = getCart();
  const subtotal = cartTotal();
  const fulfil = document.querySelector('input[name="fulfil"]:checked')?.value;
  const total = subtotal + (fulfil === "delivery" ? deliveryFee : 0);
  $("cartTotal").textContent = fmt(total);
}

async function quoteFee() {
  const fulfil = document.querySelector('input[name="fulfil"]:checked')?.value;
  const zone = $("deliveryZone")?.value || "harare-suburbs";
  const km = +$("distanceKm")?.value || 5;
  const total = cartTotal();
  if (fulfil !== "delivery") { deliveryFee = 0; feeInfo = null; updateTotal(); return; }
  try {
    const q = new URLSearchParams({ zone, km, orderTotal: total });
    feeInfo = await (await fetch(`/api/delivery-fee?${q}`)).json();
    deliveryFee = feeInfo.fee || 0;
  } catch {
    // fallback rate if API offline
    deliveryFee = total >= 100 ? 0 : 4 + 1.1 * km;
    feeInfo = { fee: deliveryFee, freeDeliveryApplied: total >= 100 };
  }
  updateTotal();
}

/* Fulfilment toggle */
document.querySelectorAll('input[name="fulfil"]').forEach((r) =>
  r.addEventListener("change", () => {
    $("deliveryFields").style.display = r.value === "delivery" && r.checked ? "" : "none";
    if (r.value === "pickup") $("deliveryFields").style.display = "none";
    quoteFee();
  })
);
$("deliveryZone").addEventListener("change", quoteFee);
$("distanceKm").addEventListener("input", quoteFee);

/* Qty controls (event delegation) */
$("cartItems").addEventListener("click", (e) => {
  const inc = e.target.closest("[data-inc]");
  const dec = e.target.closest("[data-dec]");
  if (inc) {
    const c = getCart().find((x) => x.name === inc.dataset.inc);
    setQty(inc.dataset.inc, (c?.qty || 0) + 1);
  } else if (dec) {
    const c = getCart().find((x) => x.name === dec.dataset.dec);
    setQty(dec.dataset.dec, (c?.qty || 1) - 1);
  } else return;
  renderCart();
  quoteFee();
  syncCartBadge();
});

/* Submit */
$("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("formError");
  err.style.display = "none";
  const cart = getCart();
  if (!cart.length) { err.textContent = "Your cart is empty."; err.style.display = "block"; return; }

  const fulfil = document.querySelector('input[name="fulfil"]:checked').value;
  const pay = document.querySelector('input[name="pay"]:checked').value;

  const body = {
    buyerName: $("buyerName").value.trim(),
    buyerPhone: $("buyerPhone").value.trim(),
    fulfillment: fulfil,
    paymentMethod: pay,
    items: cart.map((c) => ({ name: c.name, qty: c.qty })),
  };
  if (fulfil === "delivery") {
    body.deliveryAddress = $("deliveryAddress").value.trim();
    body.deliveryZone = $("deliveryZone").value;
    body.distanceKm = +$("distanceKm").value || 5;
  }

  $("placeOrder").disabled = true;
  $("placeOrder").textContent = "Placing order…";
  try {
    // map cart names to catalogue products for IDs
    const all = typeof ALL_PRODUCTS !== "undefined" ? ALL_PRODUCTS : [];
    const items = cart.map((c) => {
      const p = all.find((x) => x.name === c.name);
      return { productId: p ? p.name : c.name, qty: c.qty };
    });
    body.items = items;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error || "Order failed");

    clearCart();
    syncCartBadge();
    $("detailsCard").classList.add("hidden");
    $("cartItems").innerHTML = "";
    $("successCard").classList.remove("hidden");
    $("successMsg").textContent =
      fulfil === "pickup"
        ? "Collect your items from the seller. Show your pickup code at handover."
        : "Your order is confirmed. We'll call you to confirm delivery.";
    if (order.pickupCode) {
      $("pickupCodeBox").style.display = "block";
      $("pickupCodeBox").textContent = order.pickupCode;
    }
    $("orderIdLine").textContent = `Order ID: ${order.id} — Total: ${fmt(order.total)}`;
    $("trackLink").href = `track.html`;
    sessionStorage.setItem("lastOrderId", order.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = "block";
    $("placeOrder").disabled = false;
    $("placeOrder").textContent = "Place order";
  }
});

/* Init */
renderCart();
quoteFee();
