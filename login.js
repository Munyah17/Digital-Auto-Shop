if (getCustomer()) location.replace("dashboard.html");

const form = document.getElementById("loginForm");
const statusEl = document.getElementById("formStatus");
const button = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.className = "form-status";
  statusEl.textContent = "";
  button.disabled = true;
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "customer",
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not sign in");
    setCustomer(data);
    const next = new URLSearchParams(location.search).get("next");
    location.href = next && /^[a-z0-9.-]+\.html$/.test(next) ? next : "dashboard.html";
  } catch (err) {
    statusEl.className = "form-status err";
    statusEl.textContent = err.message;
    button.disabled = false;
  }
});
