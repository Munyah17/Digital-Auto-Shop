# Digital Auto Shop

Premium tech and vehicle accessories e-commerce store for Zimbabwe.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — obsidian + gold theme
- **Supabase** — Postgres (products, orders, profiles) + Auth + Storage
- **Zustand** — cart state (persisted)
- **Payments** — Stripe and Paynow hosted checkout, plus manual methods
  (bank transfer, EcoCash P2P, InnBucks) with WhatsApp proof-of-payment

## Portals

| Portal | Path | Who |
|--------|------|-----|
| Storefront | `/` | Customers |
| Admin | `/admin` | super_admin, admin, supervisor, assistant, investor |
| Agent | `/agent` | Field agents (sell at markup) |
| Delivery | `/delivery` | Delivery drivers |

## Setup

1. Create a Supabase project, then run `supabase/schema.sql` once in the SQL
   editor (it's idempotent — safe to re-run).
2. Run `supabase/seed-products.sql` to load the starter catalog.
3. Create the `product-images` and `payment-banners` public storage buckets
   (one-line INSERT is commented at the bottom of `schema.sql`).
4. Copy `.env.local.example` → `.env.local` and fill in your keys.
5. `npm install && npm run dev`

## Payments

- **Stripe** / **Paynow** — redirect to hosted checkout; webhooks mark orders
  paid automatically.
- **Manual methods** — order is created as `awaiting_payment`; the order page
  shows instructions, a reference field and a WhatsApp proof button. Staff
  confirm payment in **Admin → Orders** via the row status dropdown.
- Manual method account details and the WhatsApp number live in
  `src/lib/manualPayments.ts` (`NEXT_PUBLIC_WHATSAPP_NUMBER` env var).

## Deploy

Vercel: import the repo, add the env vars, deploy. Set
`NEXT_PUBLIC_APP_URL` to the production domain so Paynow/Stripe return
URLs land correctly.
