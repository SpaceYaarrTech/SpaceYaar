import { createHmac, timingSafeEqual } from "node:crypto";

export type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
};

export type RazorpaySubscriptionEntity = {
  id?: string;
  plan_id?: string;
  customer_id?: string;
  status?: string;
  current_start?: number;
  current_end?: number;
  ended_at?: number;
};

export type RazorpayWebhookPayload = {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    subscription?: { entity?: RazorpaySubscriptionEntity };
  };
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidRazorpaySignature(message: string, signature: string, secret: string): boolean {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] : undefined;
}

function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  return typeof record[key] === "number" && Number.isFinite(record[key])
    ? record[key]
    : undefined;
}

function parsePaymentEntity(value: unknown): RazorpayPaymentEntity | undefined {
  if (!isRecord(value)) return undefined;
  const id = optionalString(value, "id");
  const orderId = optionalString(value, "order_id");
  return {
    ...(id !== undefined && { id }),
    ...(orderId !== undefined && { order_id: orderId }),
  };
}

function parseSubscriptionEntity(value: unknown): RazorpaySubscriptionEntity | undefined {
  if (!isRecord(value)) return undefined;
  const id = optionalString(value, "id");
  const planId = optionalString(value, "plan_id");
  const customerId = optionalString(value, "customer_id");
  const status = optionalString(value, "status");
  const currentStart = optionalNumber(value, "current_start");
  const currentEnd = optionalNumber(value, "current_end");
  const endedAt = optionalNumber(value, "ended_at");
  return {
    ...(id !== undefined && { id }),
    ...(planId !== undefined && { plan_id: planId }),
    ...(customerId !== undefined && { customer_id: customerId }),
    ...(status !== undefined && { status }),
    ...(currentStart !== undefined && { current_start: currentStart }),
    ...(currentEnd !== undefined && { current_end: currentEnd }),
    ...(endedAt !== undefined && { ended_at: endedAt }),
  };
}

export function parseRazorpayWebhookPayload(value: unknown): RazorpayWebhookPayload | null {
  if (!isRecord(value) || typeof value.event !== "string" || !value.event.trim()) return null;
  if (!isRecord(value.payload)) return { event: value.event };

  const payment = isRecord(value.payload.payment)
    ? parsePaymentEntity(value.payload.payment.entity)
    : undefined;
  const subscription = isRecord(value.payload.subscription)
    ? parseSubscriptionEntity(value.payload.subscription.entity)
    : undefined;

  return {
    event: value.event,
    payload: {
      ...(payment && { payment: { entity: payment } }),
      ...(subscription && { subscription: { entity: subscription } }),
    },
  };
}
