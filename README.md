# Digital Auto Shop

Multi-vendor marketplace frontend + backend for phones, gadgets, vehicle parts and laptops (Zimbabwe).

## Run it

```powershell
# Terminal 1 — API (port 3000)
copy backend\.env.example backend\.env   # fill in mail/Paynow/auth secrets
node backend/server.js

# Terminal 2 — Website + /api proxy (port 8080)
node server.js
```

Open http://localhost:8080

- Homepage: `index.html`
- Full shop + filters: `shop.html` (supports `?category=best-picks|phones-gadgets|vehicle-parts|laptops-accessories`)
- Customer account: `login.html`, `register.html`, `account.html`
- Seller dashboard: `vendor.html` · Super Admin: `admin.html` · Order tracking: `track.html`
- Info pages: `about.html`, `contact.html`

## cPanel deployment

Pushes to `main` can auto-deploy to cPanel through Git Version Control, `.cpanel.yml`, and the signed webhook in `deploy.php`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the one-time cPanel/GitHub setup.

## Structure

```
index.html / shop.html / account.html / vendor.html / admin.html   pages
styles.css                            design system (blue theme)
products.js                           shared catalogue + SVG icon set
app.js / shop.js / checkout.js        storefront, cart and checkout logic
login.js / register.js / account.js   customer auth + order history
contact.js / page.js / session.js     contact form, shared chrome, customer session
server.js                             static server + /api proxy → :3000
backend/server.js                     multi-vendor REST API (no deps, JSON store)
backend/mail.js                       SMTP send + POP3 inbox sync
backend/data/                         runtime data (auto-created, git-ignored)
```

## Backend API

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` `/api/auth/login` | Customer, vendor and admin sign-in |
| `GET /api/account/me` `/api/account/orders` | Customer profile + order history |
| `GET/POST /api/vendors` | Vendor accounts (name, phone, payout method, KYC) |
| `GET/POST /api/vendors/:id/products` `/api/vendors/:id/orders` | Vendor inventory and sales |
| `PATCH /api/products/:id` | Stock/price updates |
| `GET /api/products?category=&q=&vendorId=` | Public catalogue |
| `POST /api/orders` | Checkout — validates stock server-side |
| `GET /api/orders/lookup?ref=` | Public order tracking |
| `GET /api/orders` | Admin order list (auth required) |
| `POST /api/orders/:id/transition` | Order state machine (admin/vendor) |
| `POST /api/pos/sale` | Vendor point-of-sale sale |
| `GET /api/delivery-fee?zone=&km=&orderTotal=` | Dynamic delivery quote |
| `GET /api/vendors/:id/payouts` | Net payable after commission |
| `POST /api/contact` | Website contact form → shop mailbox |
| `GET/POST /api/admin/slides` `/api/admin/customers` `/api/admin/notifications` | Admin portal data |
| `GET /api/admin/orders/:id/pop` | Admin proof-of-payment file |
| `POST /api/paynow/initiate` `GET/POST /api/paynow/result` | Paynow hosted checkout + callback |

## Order flow & commission protection

Order states: `pending_payment → paid_escrow → dispatched → delivered → completed → payout_released`
Pickup+cash: `awaiting_pickup_payment → pickup_confirmed → completed`

**How sellers can't wiggle out of commission on cash pickups:**

1. **Escrow by default** — EcoCash/OneMoney/card payments land in the *platform* account, never the seller's. Commission is deducted automatically; seller sees only their net in `/payouts`.
2. **Pickup requires a platform-issued code** — at checkout the buyer receives a 6-digit `pickupCode`. The seller cannot mark `pickup_confirmed` without it (enforced server-side, `actor !== "admin"` check in `transitionOrder`). The code proves the buyer actually paid the platform first.
3. **Cash pickup alternative** — buyer pays cash to seller *only after* the platform confirms via EcoCash push; or the seller collects cash and must remit commission within 24h or face payout hold + delisting.
4. **Payout hold** — `payout_released` only happens `PAYOUT_HOLD_DAYS` after delivery confirmation, giving buyers a dispute window.
5. **KYC + payout-on-file** — vendors register payout phone/wallet up front; commission is never "collected later", it's withheld at source.

**Delivery fees:** `deliveryFee()` uses a zone + per-km rate card with bulky/fragile/heavy surcharges and a free-delivery threshold. Swap in live InDrive/biker quotes by calling their APIs inside that function — the order pipeline already consumes `{ fee }`.

## Still to build (next iterations)

- Live InDrive/biker rate API integration
- Password reset / email verification for customer accounts
- Dispute and refund workflow with admin review
- Vendor KYC review actions in the admin portal
- Production secrets rotation and HTTPS enforcement
