/* Contact form — posts to the shop API */

const form = document.getElementById("contactForm");
const statusEl = document.getElementById("formStatus");
const sendBtn = document.getElementById("cSend");

function setStatus(kind, text) {
  statusEl.className = "form-status" + (kind ? " " + kind : "");
  statusEl.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("cName").value.trim();
  const email = document.getElementById("cEmail").value.trim();
  const phone = document.getElementById("cPhone").value.trim();
  const message = document.getElementById("cMessage").value.trim();

  if (!name || !message) {
    setStatus("err", "Enter your name and a message.");
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus("err", "Enter a valid email address.");
    return;
  }

  sendBtn.disabled = true;
  setStatus("", "Sending…");
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not send your message");
    form.reset();
    setStatus("ok", data.mailSent
      ? "Message sent. A copy is in the shop inbox, and we will reply using the contact details you left."
      : "Message saved at the shop. Email delivery is delayed — you can also call +263 77 390 9307.");
  } catch (err) {
    setStatus("err", err.message || "We could not reach the shop just now. Call +263 77 390 9307 or email info@globalspaceweb.co.zw.");
  } finally {
    sendBtn.disabled = false;
  }
});
