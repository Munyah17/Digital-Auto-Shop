import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: data });
}

/**
 * PATCH /api/orders/:id — customer submits their manual payment reference
 * (EcoCash / bank / InnBucks transaction ref) for staff to verify.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  let reference: string | undefined;
  try {
    const body = await req.json();
    reference = typeof body?.payment_reference === "string"
      ? body.payment_reference.trim().slice(0, 100)
      : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!reference) {
    return NextResponse.json({ error: "Reference required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ payment_reference: reference })
    .eq("id", id)
    .eq("status", "awaiting_payment");

  if (error) {
    return NextResponse.json({ error: "Could not save reference" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
