-- ============================================================
--  Digital Auto Shop — Supabase Schema
--  GitHub  : Munyah17/Digital-Auto-Shop
--  This is a DEDICATED Supabase project for Digital Auto Shop.
--  Safe to re-run: every statement is idempotent.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Utility: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $func$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$func$;

-- ── Branches ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  address     text,
  town        text NOT NULL DEFAULT 'Harare',
  province    text,
  phone       text,
  email       text,
  manager_id  uuid,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read branches" ON public.branches;
CREATE POLICY "Staff read branches" ON public.branches FOR SELECT USING (true);

DROP TRIGGER IF EXISTS set_branches_updated_at ON public.branches;
CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  username    text,
  phone       text,
  avatar_url  text,
  role        text NOT NULL DEFAULT 'customer'
              CHECK (role IN ('super_admin','admin','supervisor','assistant','investor','agent','delivery','customer')),
  branch_id   uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','inactive','suspended')),
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branches_manager_id_fkey'
  ) THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT branches_manager_id_fkey
      FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff read profiles"          ON public.profiles;
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Staff portal needs to list profiles (staff/agents/delivery pages use the service
-- role via API routes, so this read policy is a fallback for client-side reads).
CREATE POLICY "Staff read profiles" ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('super_admin','admin','supervisor','assistant','investor')
  ));

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_app_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  image_url   text,
  sort_order  int  DEFAULT 0,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);

INSERT INTO public.categories (name, slug, description, sort_order) VALUES
  ('Car Electronics', 'car-electronics', 'Dash cams, OBD scanners, car chargers, FM transmitters', 1),
  ('Gadgets',         'gadgets',         'Power banks, chargers, cables and everyday tech',       2),
  ('Car Accessories', 'car-accessories', 'Phone mounts, seat covers, mats, organisers',           3),
  ('Audio',           'audio',           'Car audio, speakers, earbuds and headphones',           4),
  ('Vehicle Care',    'vehicle-care',    'Cleaning, detailing, tools and maintenance',            5),
  ('Smart Tech',      'smart-tech',      'Inverters, GPS trackers, smart devices',                6)
ON CONFLICT (slug) DO NOTHING;

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              text         NOT NULL,
  slug              text         NOT NULL UNIQUE,
  description       text         NOT NULL DEFAULT '',
  short_description text,
  price             numeric(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price  numeric(10,2) CHECK (compare_at_price >= 0),
  category_id       uuid         REFERENCES public.categories(id) ON DELETE SET NULL,
  stock_quantity    int          NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_featured       boolean      NOT NULL DEFAULT false,
  is_active         boolean      NOT NULL DEFAULT true,
  tags              text[]       DEFAULT '{}',
  specs             jsonb,
  created_at        timestamptz  DEFAULT now() NOT NULL,
  updated_at        timestamptz  DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_slug      ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category  ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured  ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_active    ON public.products(is_active)   WHERE is_active   = true;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true);

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Product Images ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_images (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url         text NOT NULL,
  alt         text,
  is_primary  boolean DEFAULT false,
  sort_order  int     DEFAULT 0,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product_images" ON public.product_images;
CREATE POLICY "Public read product_images" ON public.product_images FOR SELECT USING (true);

-- ── Orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email    text         NOT NULL,
  customer_name     text         NOT NULL,
  customer_phone    text,
  status            text         NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','awaiting_payment','paid','processing','shipped','delivered','cancelled','refunded','failed')),
  payment_method    text         CHECK (payment_method IN ('stripe','paynow','bank_transfer','ecocash','innbucks','cash')),
  payment_status    text         NOT NULL DEFAULT 'pending'
                                 CHECK (payment_status IN ('pending','completed','failed','cancelled','refunded')),
  payment_reference text,
  stripe_session_id text,
  paynow_reference  text,
  subtotal          numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  shipping_cost     numeric(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  total             numeric(10,2) NOT NULL CHECK (total >= 0),
  shipping_address  jsonb,
  notes             text,
  branch_id         uuid         REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_id          uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  delivery_id       uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  fulfillment_type  text         NOT NULL DEFAULT 'delivery'
                                 CHECK (fulfillment_type IN ('standard','delivery','agent_delivery','pickup','external_delivery','collection')),
  agent_fulfillment_fee numeric(10,2),
  created_at        timestamptz  DEFAULT now() NOT NULL,
  updated_at        timestamptz  DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user        ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email       ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe      ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_paynow      ON public.orders(paynow_reference);
CREATE INDEX IF NOT EXISTS idx_orders_agent       ON public.orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery    ON public.orders(delivery_id);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON public.orders(fulfillment_type);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own orders"       ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order"     ON public.orders;
DROP POLICY IF EXISTS "Service role updates orders" ON public.orders;
CREATE POLICY "Users view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Anyone can create order"
  ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role updates orders"
  ON public.orders FOR UPDATE USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Order Items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id            uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      uuid         NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    uuid         REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  text         NOT NULL,
  product_image text,
  price         numeric(10,2) NOT NULL CHECK (price >= 0),
  quantity      int          NOT NULL CHECK (quantity > 0),
  subtotal      numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at    timestamptz  DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own order items"   ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Users view own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND (o.user_id = auth.uid() OR o.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ));
CREATE POLICY "Anyone can insert order items"
  ON public.order_items FOR INSERT WITH CHECK (true);

-- ── Agent Profiles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id                    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  territory             text NOT NULL DEFAULT 'To be assigned',
  town                  text NOT NULL DEFAULT 'To be assigned',
  markup_percentage     numeric(5,2) NOT NULL DEFAULT 20,
  max_markup_percentage numeric(5,2) NOT NULL DEFAULT 50,
  wallet_balance        numeric(10,2) NOT NULL DEFAULT 0,
  total_sales           numeric(12,2) NOT NULL DEFAULT 0,
  total_commission      numeric(12,2) NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  contract_start        date,
  notes                 text,
  created_at            timestamptz DEFAULT now() NOT NULL,
  updated_at            timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents read own profile" ON public.agent_profiles;
CREATE POLICY "Agents read own profile" ON public.agent_profiles FOR SELECT USING (auth.uid() = id);

DROP TRIGGER IF EXISTS set_agent_profiles_updated_at ON public.agent_profiles;
CREATE TRIGGER set_agent_profiles_updated_at
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Agent Sales ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_sales (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name  text,
  customer_phone text,
  items          jsonb NOT NULL DEFAULT '[]',
  base_total     numeric(10,2) NOT NULL CHECK (base_total >= 0),
  sale_total     numeric(10,2) NOT NULL CHECK (sale_total >= 0),
  agent_profit   numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text CHECK (payment_method IN ('cash','ecocash','bank_transfer','innbucks','other')),
  notes          text,
  created_at     timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_sales_agent ON public.agent_sales(agent_id);
ALTER TABLE public.agent_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents read own sales"   ON public.agent_sales;
DROP POLICY IF EXISTS "Agents insert own sales" ON public.agent_sales;
CREATE POLICY "Agents read own sales"   ON public.agent_sales FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "Agents insert own sales" ON public.agent_sales FOR INSERT WITH CHECK (auth.uid() = agent_id);

-- ── Delivery Profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_profiles (
  id                uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type      text NOT NULL DEFAULT 'bike'
                    CHECK (vehicle_type IN ('bike','car','truck','walk')),
  zone              text,
  is_available      boolean NOT NULL DEFAULT true,
  is_active         boolean NOT NULL DEFAULT true,
  total_deliveries  int NOT NULL DEFAULT 0,
  total_earnings    numeric(10,2) NOT NULL DEFAULT 0,
  rating            numeric(3,2),
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.delivery_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers read own profile" ON public.delivery_profiles;
CREATE POLICY "Drivers read own profile" ON public.delivery_profiles FOR SELECT USING (auth.uid() = id);

DROP TRIGGER IF EXISTS set_delivery_profiles_updated_at ON public.delivery_profiles;
CREATE TRIGGER set_delivery_profiles_updated_at
  BEFORE UPDATE ON public.delivery_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role text,
  type           text NOT NULL DEFAULT 'info',
  title          text NOT NULL,
  message        text NOT NULL,
  data           jsonb,
  is_read        boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users mark own read"            ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users mark own read"
  ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- ── Agent totals RPC (used by /api/agent/sales) ──────────────
CREATE OR REPLACE FUNCTION public.increment_agent_totals(
  agent_id uuid,
  sale_amount numeric,
  profit_amount numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  UPDATE public.agent_profiles
  SET wallet_balance    = wallet_balance + profit_amount,
      total_sales       = total_sales + sale_amount,
      total_commission  = total_commission + profit_amount
  WHERE id = agent_id;
END;
$func$;

-- ── Storage buckets ───────────────────────────────────────────
-- Run this once manually in the Supabase SQL editor if buckets don't exist:
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('product-images',  'product-images',  true),
--   ('payment-banners', 'payment-banners', true)
-- ON CONFLICT DO NOTHING;
