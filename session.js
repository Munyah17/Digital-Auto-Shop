/* Customer session. The token stays in this browser. */

const CUSTOMER_KEY = "das_customer";

function getCustomer() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) || null; }
  catch { return null; }
}
function setCustomer(data) {
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify({
    token: data.token, id: data.id, name: data.name, email: data.email, phone: data.phone,
  }));
}
function clearCustomer() { localStorage.removeItem(CUSTOMER_KEY); }
function customerHeaders() {
  const customer = getCustomer();
  return customer && customer.token ? { Authorization: "Bearer " + customer.token } : {};
}
