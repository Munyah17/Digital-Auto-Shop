/* Shared cart — localStorage-backed, synced with backend orders at checkout */

const CART_KEY = "das_cart_v1";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function addToCart(item) {
  const cart = getCart();
  const found = cart.find((c) => c.name === item.name);
  if (found) found.qty += item.qty || 1;
  else cart.push({ name: item.name, price: item.price, vendor: item.vendor || "", qty: item.qty || 1 });
  saveCart(cart);
  return cart;
}
function setQty(name, qty) {
  const cart = getCart().map((c) => (c.name === name ? { ...c, qty } : c));
  saveCart(cart.filter((c) => c.qty > 0));
  return getCart();
}
function removeFromCart(name) {
  saveCart(getCart().filter((c) => c.name !== name));
}
function clearCart() { localStorage.removeItem(CART_KEY); }
function cartCount() { return getCart().reduce((s, c) => s + c.qty, 0); }
function cartTotal() { return getCart().reduce((s, c) => s + c.price * c.qty, 0); }

/* Keep header cart badge in sync on every page */
function syncCartBadge() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = cartCount();
}
document.addEventListener("DOMContentLoaded", syncCartBadge);
