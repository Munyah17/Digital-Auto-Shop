if (getCustomer()) location.replace("dashboard.html");

const form = document.getElementById("registerForm");
const statusEl = document.getElementById("formStatus");
const button = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.className = "form-status";
  statusEl.textContent = "";
  button.disabled = true;
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        password: document.getElementById("password").value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not create the account");
    setCustomer(data);
    location.href = "dashboard.html";
  } catch (err) {
    statusEl.className = "form-status err";
    statusEl.textContent = err.message;
    button.disabled = false;
  }
});
