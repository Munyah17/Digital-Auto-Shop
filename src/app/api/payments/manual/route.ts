import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { MANUAL_IDS } from "@/lib/manualPayments";
import { logError } from "@/lib/logger";

/**
 * POST /api/payments/manual
 *
 * Manual payment methods (bank transfer, EcoCash P2P, InnBucks).
 * Creates an order in `awaiting_payment` state and sends the customer to the
 * order page, which shows the payment instructions, a reference field and a
 * WhatsApp proof-of-payment button. Staff confirm payment from the admin panel.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      items,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      notes,
      shipping_cost,
      fulfillment_type,
      payment_method,
    } = body;

    if (!items?.length || !customer_email || !customer_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!MANUAL_IDS.includes(payment_method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const subtotal = items.reduce(
      (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
      0
    );
    const total = subtotal + (shipping_cost ?? 0);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_email,
        customer_name,
        customer_phone: customer_phone ?? null,
        shipping_address,
        notes: notes ?? null,
        fulfillment_type: fulfillment_type ?? "delivery",
        status: "awaiting_payment",
        payment_method,
        payment_status: "pending",
        subtotal,
        shipping_cost: shipping_cost ?? 0,
        total,
      })
      .select()
      .single();

    if (orderError || !order) {
      logError("payments/manual — order insert", orderError, { customer_email });
      return NextResponse.json({ error: "Unable to process your order. Please try again." }, { status: 500 });
    }

    await supabase.from("order_items").insert(
      items.map((item: {
        product_id: string;
        name: string;
        image?: string;
        price: number;
        quantity: number;
      }) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        product_image: item.image ?? null,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }))
    );

    return NextResponse.json({ url: `/orders/${order.id}?status=awaiting_payment`, orderId: order.id });
  } catch (err: unknown) {
    logError("payments/manual — checkout", err);
    return NextResponse.json({ error: "Order creation failed. Please try again." }, { status: 500 });
  }
}
