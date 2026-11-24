# Digital Auto Shop

Multi-vendor marketplace frontend + backend for phones, gadgets, vehicle parts and laptops (Zimbabwe).

## Run it

```powershell
# Terminal 1 — API (port 3000)
node backend/server.js

# Terminal 2 — Website + /api proxy (port 8080)
node server.js
```

Open http://localhost:8080

- Homepage: `index.html`
- Full shop + filters: `shop.html` (supports `?category=best-picks|phones-gadgets|vehicle-parts|laptops-accessories`)
- Super Admin (hero slides): `admin.html`

## Structure

```
index.html / shop.html / admin.html   pages
styles.css                            design system (blue theme)
products.js                           shared catalogue + SVG icon set
app.js / shop.js / admin.js           page logic
server.js                             static server + /api proxy → :3000
backend/server.js                     multi-vendor REST API (no deps, JSON store)
backend/data/store.json               runtime data (auto-created)
```

## Backend API

| Endpoint | Purpose |
|---|---|
| `GET/POST /api/vendors` | Vendor accounts (name, phone, payout method, KYC) |
| `GET/POST /api/vendors/:id/products` | Vendor inventory ("record book" CRUD) |
| `PATCH /api/products/:id` | Stock/price updates |
| `GET /api/products?category=&q=&vendorId=` | Public catalogue |
| `POST /api/orders` | Checkout — validates stock server-side |
| `POST /api/orders/:id/transition` | Order state machine |
| `GET /api/delivery-fee?zone=&km=&orderTotal=` | Dynamic delivery quote |
| `GET /api/vendors/:id/payouts` | Net payable after commission |
| `GET/POST /api/admin/slides` | Production slide storage |

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

- Vendor dashboard UI (inventory "record book" + point-of-sale)
- Buyer auth + order tracking page
- EcoCash/OneMoney/Paynow payment gateway integration
- Admin panel for vendors, orders, disputes (backend endpoints exist)
- Live InDrive/biker rate API integration
- Push the slide manager to `/api/admin/slides` instead of localStorage
