import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { isRecord } from "@/lib/payments/razorpay-security";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.bookingId !== "string" || !body.bookingId.trim()) {
    return NextResponse.json({ error: "A booking ID is required." }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to pay for this booking." }, { status: 401 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, renter_id, status, quoted_total")
      .eq("id", body.bookingId)
      .eq("renter_id", user.id)
      .maybeSingle();
    if (bookingError) {
      console.error("Could not load booking for Razorpay order:", bookingError.message);
      return NextResponse.json({ error: "Could not load this booking." }, { status: 500 });
    }
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.status !== "accepted") {
      return NextResponse.json({ error: "Payment is available after the owner accepts the booking." }, { status: 409 });
    }

    const amountPaise = Math.round(Number(booking.quoted_total) * 100);
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      return NextResponse.json({ error: "This booking has an invalid payment amount." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existingPayment, error: paymentLookupError } = await admin
      .from("razorpay_payments")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("status", "captured")
      .maybeSingle();
    if (paymentLookupError) {
      console.error("Could not check existing Razorpay payment:", paymentLookupError.message);
      return NextResponse.json({ error: "Could not check payment status." }, { status: 500 });
    }
    if (existingPayment) {
      return NextResponse.json({ error: "This booking has already been paid." }, { status: 409 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `sy_${booking.id}`,
      notes: { booking_id: booking.id, renter_id: user.id },
    });

    const { error: insertError } = await admin
      .from("razorpay_payments")
      .insert({
        booking_id: booking.id,
        renter_id: user.id,
        razorpay_order_id: order.id,
        amount_paise: amountPaise,
        currency: "INR",
        status: "created",
      });
    if (insertError) {
      console.error("Could not persist Razorpay order:", insertError.message);
      return NextResponse.json({ error: "Could not save the payment order." }, { status: 500 });
    }

    return NextResponse.json({ keyId, order });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return NextResponse.json({ error: "Could not create a payment order." }, { status: 500 });
  }
}
