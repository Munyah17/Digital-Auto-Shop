/* Checkout â€” guest checkout is allowed. A signed-in customer gets the order on their account. */

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
        <span style="font-size:.76rem;color:var(--muted)">${c.vendor} â€¢ ${fmt(c.price)} each</span>
      </div>
      <div class="qty-ctrl">
        <button type="button" data-dec="${c.name}">âˆ’</button>
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
  const pay = document.querySelector('input[name="pay"]:checked')?.value;
  let fee = fulfil === "delivery" ? deliveryFee : 0;
  if (pay === "bank_transfer") fee += (subtotal + fee) * 0.05; // 5% bank charge
  $("cartTotal").textContent = fmt(subtotal + fee);
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
    // fallback rate if API offline â€” no free delivery
    deliveryFee = 4 + 1.1 * km;
    feeInfo = { fee: deliveryFee, freeDeliveryApplied: false };
  }
  updateTotal();
}

/* Payment method toggle â€” bank transfer fields + Paynow note */
document.querySelectorAll('input[name="pay"]').forEach((r) =>
  r.addEventListener("change", () => {
    const isBank = r.value === "bank_transfer" && r.checked;
    $("bankBox").classList.toggle("hidden", !isBank);
    $("bankFields").classList.toggle("hidden", !isBank);
    if (isBank) loadBankDetails();
    updateTotal();
  })
);

async function loadBankDetails() {
  try {
    const d = await (await fetch("/api/bank-details")).json();
    $("bankDetails").innerHTML =
      `<div><strong>Account Name:</strong> ${d.accountName}</div>` +
      `<div><strong>Bank:</strong> ${d.bank}</div>` +
      `<div><strong>Branch:</strong> ${d.branch}</div>` +
      `<div><strong>${d.currency} Account:</strong> ${d.account}</div>`;
  } catch {
    $("bankDetails").innerHTML = "<em>Bank details unavailable â€” API offline.</em>";
  }
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

const signedIn = getCustomer();
const accountNote = $("checkoutAccount");
if (signedIn) {
  accountNote.innerHTML = `Signed in as <strong></strong>. This order is saved to your account. <a href="dashboard.html">View orders</a>`;
  accountNote.querySelector("strong").textContent = signedIn.name || signedIn.email;
  if (!$("buyerName").value) $("buyerName").value = signedIn.name || "";
  if (!$("buyerPhone").value) $("buyerPhone").value = signedIn.phone || "";
  if (!$("orderEmail").value) $("orderEmail").value = signedIn.email || "";
} else {
  accountNote.innerHTML = `Guest checkout â€” no account needed. <a href="register.html">Create an account</a> if you want these orders in one place.`;
}

/* Submit */
$("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("formError");
  err.style.display = "none";
  const cart = getCart();
  if (!cart.length) { err.textContent = "Your cart is empty."; err.style.display = "block"; return; }

  const fulfil = document.querySelector('input[name="fulfil"]:checked').value;
  const pay = document.querySelector('input[name="pay"]:checked').value;

  // bank transfer validation
  const orderEmail = $("orderEmail").value.trim();
  if (orderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderEmail)) {
    err.textContent = "Enter a valid email address."; err.style.display = "block"; return;
  }
  const bankEmail = $("buyerEmail").value.trim();
  if (bankEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bankEmail)) {
    err.textContent = "Enter a valid email address."; err.style.display = "block"; return;
  }
  if (pay === "bank_transfer") {
    if (!$("transactionRef").value.trim()) { err.textContent = "Transaction reference is required."; err.style.display = "block"; return; }
    if (!bankEmail && !orderEmail) { err.textContent = "Email is required."; err.style.display = "block"; return; }
    if (!$("popFile").files.length) { err.textContent = "Please upload your Proof of Payment."; err.style.display = "block"; return; }
  }

  // read PoP file as data URL
  let popData = null;
  if (pay === "bank_transfer" && $("popFile").files.length) {
    popData = await new Promise((resolve, reject) => {
      const f = $("popFile").files[0];
      if (f.size > 8 * 1024 * 1024) return reject(new Error("PoP file too large (max 8MB)"));
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(f);
    }).catch((e2) => { err.textContent = e2.message; err.style.display = "block"; return null; });
    if (!popData) return;
  }

  const body = {
    buyerName: $("buyerName").value.trim(),
    buyerPhone: $("buyerPhone").value.trim(),
    fulfillment: fulfil,
    paymentMethod: pay,
    items: cart.map((c) => ({ name: c.name, qty: c.qty })),
  };
  body.email = bankEmail || orderEmail;
  if (pay === "bank_transfer") {
    body.transactionRef = $("transactionRef").value.trim();
    body.pop = popData;
  }
  if (fulfil === "delivery") {
    body.deliveryAddress = $("deliveryAddress").value.trim();
    body.deliveryZone = $("deliveryZone").value;
    body.distanceKm = +$("distanceKm").value || 5;
  }

  $("placeOrder").disabled = true;
  $("placeOrder").textContent = "Placing orderâ€¦";
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
      headers: { "Content-Type": "application/json", ...customerHeaders() },
      body: JSON.stringify(body),
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error || "Order failed");

    // Paynow methods â†’ redirect to hosted checkout
    if (["ecocash", "onemoney", "card"].includes(pay)) {
      try {
        const init = await (await fetch("/api/paynow/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: order.total, reference: order.id, description: `Order ${order.id}` }),
        })).json();
        if (init.redirectUrl) {
          sessionStorage.setItem("pendingOrderId", order.id);
          location.href = init.redirectUrl;
          return;
        }
      } catch { /* fall through to success screen */ }
    }

    clearCart();
    syncCartBadge();
    $("detailsCard").classList.add("hidden");
    $("cartItems").innerHTML = "";
    $("successCard").classList.remove("hidden");
    const guestLine = getCustomer()
      ? " It is saved in your account."
      : " You checked out as a guest.";
    $("successMsg").textContent =
      (fulfil === "pickup"
        ? "Collect your items from the seller. Show your pickup code at handover."
        : "Your order is confirmed. We'll call you to confirm delivery.") + guestLine;
    if (order.pickupCode) {
      $("pickupCodeBox").style.display = "block";
      $("pickupCodeBox").textContent = order.pickupCode;
    }
    if (pay === "bank_transfer") $("bankSuccessNote").classList.remove("hidden");
    $("orderIdLine").textContent = `Order ID: ${order.id} â€” Total: ${fmt(order.total)}`;
    $("trackLink").href = `track.html?order=${encodeURIComponent(order.id)}`;
    sessionStorage.setItem("lastOrderId", order.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (ex) {
    err.textContent = ex.message;
    err.style.display = "block";
    $("placeOrder").disabled = false;
    $("placeOrder").textContent = "Place order";
  }
});

/* Paynow return â€” the result webhook updates the order, so poll briefly for confirmation */
async function pollPaidOrder(orderId) {
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch("/api/orders/lookup?ref=" + encodeURIComponent(orderId));
      const order = await res.json().catch(() => ({}));
      if (res.ok && order.status && order.status !== "pending_payment") {
        $("successMsg").textContent = order.status === "paid_escrow"
          ? "Payment received â€” your order is being prepared."
          : "Order status: " + String(order.status).replace(/_/g, " ") + ".";
        return;
      }
    } catch { /* keep polling */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function showPaidReturn() {
  const params = new URLSearchParams(location.search);
  if (params.get("paid") !== "1") return false;
  const orderId = sessionStorage.getItem("pendingOrderId") || "";
  clearCart();
  syncCartBadge();
  $("detailsCard").classList.add("hidden");
  $("cartItems").innerHTML = "";
  $("successCard").classList.remove("hidden");
  $("successMsg").textContent = "We're confirming your Paynow payment. This page updates when the bank confirms it.";
  $("orderIdLine").textContent = orderId ? `Order ID: ${orderId}` : "";
  if (orderId) {
    $("trackLink").href = `track.html?order=${encodeURIComponent(orderId)}`;
    pollPaidOrder(orderId);
  }
  sessionStorage.removeItem("pendingOrderId");
  window.scrollTo({ top: 0, behavior: "smooth" });
  return true;
}

/* Init */
if (!showPaidReturn()) {
  renderCart();
  quoteFee();
}
