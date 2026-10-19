import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type VerifyPaymentRequest = {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
};

function isValidSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  let body: VerifyPaymentRequest;
  try {
    body = await request.json() as VerifyPaymentRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "Razorpay payment details are incomplete." }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }
  if (!isValidSignature(orderId, paymentId, signature, keySecret)) {
    return NextResponse.json({ error: "Razorpay payment signature is invalid." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to verify this payment." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: payment, error: lookupError } = await admin
      .from("razorpay_payments")
      .select("id, status, razorpay_payment_id")
      .eq("razorpay_order_id", orderId)
      .eq("renter_id", user.id)
      .maybeSingle();
    if (lookupError) {
      console.error("Could not load Razorpay payment:", lookupError.message);
      return NextResponse.json({ error: "Could not verify this payment." }, { status: 500 });
    }
    if (!payment) {
      return NextResponse.json({ error: "Payment order not found." }, { status: 404 });
    }
    if (payment.status === "captured" && payment.razorpay_payment_id === paymentId) {
      return NextResponse.json({ verified: true });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const providerPayment = await razorpay.payments.fetch(paymentId);
    if (providerPayment.order_id !== orderId || providerPayment.status !== "captured") {
      return NextResponse.json({ error: "Razorpay has not captured this payment yet." }, { status: 409 });
    }

    const { error: updateError } = await admin
      .from("razorpay_payments")
      .update({
        razorpay_payment_id: paymentId,
        status: "captured",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    if (updateError) {
      console.error("Could not record verified Razorpay payment:", updateError.message);
      return NextResponse.json({ error: "Payment was verified but could not be recorded." }, { status: 500 });
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Razorpay payment verification failed:", error);
    return NextResponse.json({ error: "Could not verify this payment." }, { status: 500 });
  }
}
