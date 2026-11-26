/* Shop mailbox. Credentials are read from backend/.env and are never sent to the browser. */

const fs = require("fs");
const path = require("path");
const tls = require("tls");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(path.join(__dirname, ".env"));

function configured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function shopAddress() {
  return process.env.MAIL_TO || process.env.SMTP_USER || "";
}

function redact(value) {
  let msg = String(value || "Mail error");
  const secret = process.env.SMTP_PASS || "";
  if (secret) msg = msg.split(secret).join("[hidden]");
  return msg.slice(0, 240);
}

function oneLine(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function headerValue(value) {
  const clean = oneLine(value).slice(0, 180);
  return /^[\x20-\x7E]*$/.test(clean) ? clean : "=?UTF-8?B?" + Buffer.from(clean, "utf8").toString("base64") + "?=";
}

function addressOnly(value) {
  const text = oneLine(value);
  const wrapped = text.match(/<([^>]+)>/);
  return (wrapped ? wrapped[1] : text).trim();
}

function isEmail(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(addressOnly(value));
}

function dotStuff(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
    .map((line) => (line.startsWith(".") ? "." + line : line))
    .join("\r\n");
}

function smtpSession(host, port) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host });
    let buf = "";
    let wait = null;
    let settled = false;
    let pendingReject = null;
    const fail = (err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      if (pendingReject) pendingReject(error);
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(20000, () => fail(new Error("SMTP timed out")));
    socket.on("error", fail);
    function pump() {
      if (!wait) return;
      let idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, idx).replace(/\r$/, "");
        buf = buf.slice(idx + 1);
        if (/^\d{3}-/.test(line)) continue;
        const code = Number(line.slice(0, 3));
        if (!code) continue;
        const pending = wait;
        wait = null;
        pending(code, line);
        return;
      }
    }
    socket.on("data", (chunk) => { buf += chunk.toString("utf8"); pump(); });
    function expect(code) {
      return new Promise((ok, no) => {
        pendingReject = no;
        wait = (got, line) => {
          pendingReject = null;
          if (got === code) ok(line);
          else no(new Error(redact(line)));
        };
        pump();
      });
    }
    function write(line) { socket.write(line + "\r\n"); }
    socket.once("secureConnect", () => {
      settled = true;
      resolve({ expect, write, end: () => socket.end() });
    });
  });
}

async function send({ to, subject, text, replyTo }) {
  if (!configured()) return { ok: false, skipped: true };
  const recipients = (Array.isArray(to) ? to : [to]).map(addressOnly).filter(isEmail);
  if (!recipients.length) throw new Error("No recipient for this message");
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const session = await smtpSession(host, port);
  try {
  await session.expect(220);
  session.write("EHLO digitalautoshop");
  await session.expect(250);
  session.write("AUTH LOGIN");
  await session.expect(334);
  session.write(Buffer.from(process.env.SMTP_USER, "utf8").toString("base64"));
  await session.expect(334);
  session.write(Buffer.from(process.env.SMTP_PASS, "utf8").toString("base64"));
  await session.expect(235);
  session.write("MAIL FROM:<" + addressOnly(from) + ">");
  await session.expect(250);
  for (const rcpt of recipients) {
    session.write("RCPT TO:<" + rcpt + ">");
    await session.expect(250);
  }
  session.write("DATA");
  await session.expect(354);
  const headers = [
    "From: " + headerValue(from),
    "To: " + recipients.join(", "),
    "Subject: " + headerValue(subject || "Digital Auto Shop"),
    "Date: " + new Date().toUTCString(),
    "Message-ID: <" + Date.now().toString(36) + Math.random().toString(36).slice(2) + "@globalspaceweb.co.zw>",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];
  if (replyTo && isEmail(replyTo)) headers.push("Reply-To: " + addressOnly(replyTo));
  const payload = headers.join("\r\n") + "\r\n\r\n" + dotStuff(text) + "\r\n.\r\n";
  session.write(payload.slice(0, -2));
  await session.expect(250);
  session.write("QUIT");
  session.end();
  return { ok: true };
  } catch (err) {
    try { session.end(); } catch { /* already closed */ }
    throw new Error(redact(err.message));
  }
}

function popLines(socket) {
  let buf = "";
  let wait = null;
  socket.on("data", (chunk) => { buf += chunk.toString("utf8"); drain(); });
  function drain() {
    if (!wait) return;
    if (wait.mode === "line") {
      const idx = buf.indexOf("\n");
      if (idx === -1) return;
      const line = buf.slice(0, idx).replace(/\r$/, "");
      buf = buf.slice(idx + 1);
      const pending = wait;
      wait = null;
      pending.resolve(line);
      drain();
      return;
    }
    const match = buf.match(/(^|\r?\n)\.\r?\n/);
    if (!match) return;
    const body = buf.slice(0, match.index);
    buf = buf.slice(match.index + match[0].length);
    const pending = wait;
    wait = null;
    pending.resolve(body);
  }
  return {
    line() { return new Promise((resolve, reject) => { wait = { mode: "line", resolve, reject }; drain(); }); },
    dots() { return new Promise((resolve, reject) => { wait = { mode: "dot", resolve, reject }; drain(); }); },
    send(line) { socket.write(line + "\r\n"); },
  };
}

function decodeHeader(value) {
  return oneLine(value).replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, data) => {
    try {
      if (enc.toUpperCase() === "B") return Buffer.from(data, "base64").toString(charset.toLowerCase() === "utf-8" ? "utf8" : "latin1");
      const text = data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
      return text;
    } catch { return data; }
  });
}

function parseMail(raw) {
  const text = raw.replace(/\r\n/g, "\n").replace(/^\.\./gm, ".");
  const split = text.indexOf("\n\n");
  const head = split === -1 ? text : text.slice(0, split);
  const body = split === -1 ? "" : text.slice(split + 2);
  const headers = {};
  let key = "";
  for (const line of head.split("\n")) {
    if (/^[ \t]/.test(line) && key) headers[key] += " " + line.trim();
    else {
      const cut = line.indexOf(":");
      if (cut > 0) {
        key = line.slice(0, cut).toLowerCase();
        headers[key] = line.slice(cut + 1).trim();
      }
    }
  }
  return {
    from: decodeHeader(headers.from || ""),
    subject: decodeHeader(headers.subject || "(no subject)"),
    date: headers.date || "",
    text: body.trim().slice(0, 4000),
  };
}

async function pullInbox(known, opts) {
  if (!configured()) return [];
  const host = process.env.POP3_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.POP3_PORT || 995);
  const socket = tls.connect({ host, port, servername: host });
  socket.setTimeout(20000);
  const io = popLines(socket);
  const done = new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("Mailbox timed out")));
    socket.once("secureConnect", () => resolve());
  });
  try {
    await done;
    const greet = await io.line();
    if (!greet.startsWith("+OK")) throw new Error(greet);
    io.send("USER " + process.env.SMTP_USER);
    const userOk = await io.line();
    if (!userOk.startsWith("+OK")) throw new Error("Mailbox rejected the account");
    io.send("PASS " + process.env.SMTP_PASS);
    const passOk = await io.line();
    if (!passOk.startsWith("+OK")) throw new Error("Mailbox login failed");
    io.send("UIDL");
    const uidlOk = await io.line();
    if (!uidlOk.startsWith("+OK")) throw new Error(uidlOk);
    const uidl = await io.dots();
    const all = uidl.split(/\n/).map((line) => {
      const match = line.replace(/\r/g, "").match(/^(\d+)\s+(\S+)/);
      return match ? { n: Number(match[1]), uid: match[2] } : null;
    }).filter(Boolean);
    if (opts && opts.listOnly) {
      io.send("QUIT");
      socket.end();
      return all.map((entry) => entry.uid);
    }
    const entries = all.filter((entry) => !known.has(entry.uid)).slice(-20);

    const found = [];
    for (const entry of entries) {
      io.send("RETR " + entry.n);
      const retr = await io.line();
      if (!retr.startsWith("+OK")) continue;
      const raw = await io.dots();
      found.push({ uid: entry.uid, ...parseMail(raw), receivedAt: new Date().toISOString() });
    }
    io.send("QUIT");
    socket.end();
    return found;
  } catch (err) {
    socket.destroy();
    throw new Error(redact(err.message));
  }
}

module.exports = { configured, shopAddress, redact, send, pullInbox, isEmail };
