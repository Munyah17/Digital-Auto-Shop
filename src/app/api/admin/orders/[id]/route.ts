import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/roles";
import type { Role, OrderStatus, PaymentStatus } from "@/types";

const VALID_STATUSES: OrderStatus[] = [
  "pending", "awaiting_payment", "paid", "processing",
  "shipped", "delivered", "cancelled", "refunded", "failed",
];

// When staff move an order to these statuses, payment is considered confirmed.
const PAID_STATUSES = new Set(["paid", "processing", "shipped", "delivered"]);

/**
 * PATCH /api/admin/orders/:id — staff update of order status.
 * Used to confirm manual payments and progress fulfillment.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = {
      getAll: () =>
        req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: () => {},
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookieStore }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: me } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!me || !hasPermission(me.role as Role, "orders:process")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const status = body?.status as OrderStatus;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const payment_status: PaymentStatus | undefined = PAID_STATUSES.has(status)
      ? "completed"
      : status === "failed"
        ? "failed"
        : status === "refunded" || status === "cancelled"
          ? status
          : undefined;

    const { error } = await admin
      .from("orders")
      .update({ status, ...(payment_status ? { payment_status } : {}) })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
