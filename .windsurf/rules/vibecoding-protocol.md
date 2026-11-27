# Vibecoding Rules — Production Protocol (adapted to this stack)

This project is a **vanilla JS frontend + dependency-free Node.js backend** (cPanel/PHP-compatible deployment). Where the original rules reference Next.js/Supabase/Vercel, the equivalent here is: **Frontend → Node API (`backend/server.js`) → `data/store.json`**. No frontend→database access ever.

## 1. STRICT ARCHITECTURE: BACKEND-ONLY DATA ACCESS
- Frontend NEVER touches storage directly. All reads/writes go through `/api/*` endpoints in `backend/server.js`.
- No business logic in client JS beyond rendering and calling the API.
- Data lives in `backend/data/store.json` — backend only.

## 2. SECURITY & ACCESS
- Secrets ONLY via `backend/.env` (gitignored) → `process.env.*`. Never hardcode keys (Paynow ID/key, SMTP, auth secrets).
- `.env.example` documents required vars — commit that, never `.env`.
- Auth: token (HMAC-signed) required for protected routes; `requireAuth` enforces role. No token → 401/403.
- Least privilege: endpoints return only what the caller's role may see.
- PoP uploads: stored server-side in `backend/data/pops/`, served only via authenticated admin route.

## 3. PAYMENTS & WEBHOOKS
- NEVER trust `req.body` for payment confirmation. Always verify via provider poll URL (`/api/paynow/result` polls `pollurl` and checks `status === "Paid"`).
- Paynow hash: `sha512(all param values concatenated + PAYNOW_KEY)` — **uppercase hex**, key appended LAST.
- Bank transfer: require transaction ref + email + PoP before marking paid.

## 4. INPUT VALIDATION & RESILIENCE
- Validate every API input; return 400 on bad input, never proceed to logic.
- try/catch all handlers; return generic errors to client, log details server-side only.
- Strip PII from logs — log IDs/status only.

## 5. CHANGE MANAGEMENT
- Analyze downstream effects before changes (orders, payouts, auth, POS, checkout).
- Verify with user before structural/security-sensitive changes.
- NEVER delete data, drop tables, or reset `store.json` with live orders.

## 6. QUALITY
- Feature is done only when verified working locally (happy path).
- Bug fixes include reproduction steps.
- Syntax-check (`node --check`) before commit; never push broken code.

## 7. PRE-CODE CHECKLIST
- [ ] Frontend talking to DB directly? → REJECT
- [ ] Auth checks present, least privilege? 
- [ ] Input validated, output encoded, secrets in env only?
- [ ] Error handling + timeouts present?
