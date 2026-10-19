import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    subscription?: { entity?: Record<string, unknown> };
  };
};

function isValidWebhookSignature(rawBody: string, signature: string, secret: string) {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Razorpay webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!isValidWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid Razorpay webhook signature." }, { status: 400 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Webhook body must be valid JSON." }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId || !payload.event) {
    return NextResponse.json({ error: "Webhook event ID and event name are required." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const payment = payload.payload?.payment?.entity;
    if (payment?.order_id && (payload.event === "payment.captured" || payload.event === "payment.failed")) {
      const updates = payload.event === "payment.captured"
        ? { status: "captured", razorpay_payment_id: payment.id ?? null }
        : { status: "failed", razorpay_payment_id: payment.id ?? null };
      let updateQuery = admin
        .from("razorpay_payments")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("razorpay_order_id", payment.order_id)
        .select("id");
      if (payload.event === "payment.failed") updateQuery = updateQuery.neq("status", "captured");
      const { data: updatedPayments, error } = await updateQuery;
      if (error) {
        console.error("Could not update payment from Razorpay webhook:", error.message);
        return NextResponse.json({ error: "Could not record payment event." }, { status: 500 });
      }
      if (!updatedPayments?.length) {
        return NextResponse.json({ error: "Payment order is not recorded yet." }, { status: 500 });
      }
    }

    const subscription = payload.payload?.subscription?.entity;
    const subscriptionId = subscription?.id;
    if (subscription && typeof subscriptionId === "string") {
      const { error } = await admin
        .from("razorpay_subscriptions")
        .upsert({
          razorpay_subscription_id: subscriptionId,
          razorpay_plan_id: typeof subscription.plan_id === "string" ? subscription.plan_id : null,
          customer_id: typeof subscription.customer_id === "string" ? subscription.customer_id : null,
          status: typeof subscription.status === "string" ? subscription.status : "unknown",
          current_start: typeof subscription.current_start === "number"
            ? new Date(subscription.current_start * 1000).toISOString()
            : null,
          current_end: typeof subscription.current_end === "number"
            ? new Date(subscription.current_end * 1000).toISOString()
            : null,
          ended_at: typeof subscription.ended_at === "number"
            ? new Date(subscription.ended_at * 1000).toISOString()
            : null,
          razorpay_payload: subscription,
          updated_at: new Date().toISOString(),
        }, { onConflict: "razorpay_subscription_id" });
      if (error) {
        console.error("Could not store Razorpay subscription event:", error.message);
        return NextResponse.json({ error: "Could not record subscription event." }, { status: 500 });
      }
    }

    const { error: insertError } = await admin
      .from("razorpay_webhooks")
      .insert({ event_id: eventId, event: payload.event, payload });
    if (insertError && insertError.code !== "23505") {
      console.error("Could not store Razorpay webhook:", insertError.message);
      return NextResponse.json({ error: "Could not record webhook event." }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing failed:", error);
    return NextResponse.json({ error: "Could not process Razorpay webhook." }, { status: 500 });
  }
}
