import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  isValidRazorpaySignature,
  parseRazorpayWebhookPayload,
} from "../../lib/payments/razorpay-security.ts";

const secret = "test-secret";

function sign(message) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

test("accepts a valid Razorpay HMAC signature", () => {
  const message = "order_123|pay_456";

  assert.equal(isValidRazorpaySignature(message, sign(message), secret), true);
});

test("rejects altered messages and malformed signatures", () => {
  const message = "order_123|pay_456";

  assert.equal(isValidRazorpaySignature(`${message}!`, sign(message), secret), false);
  assert.equal(isValidRazorpaySignature(message, "not-a-signature", secret), false);
});

test("parses typed payment and subscription webhook entities", () => {
  assert.deepEqual(parseRazorpayWebhookPayload({
    event: "payment.captured",
    payload: {
      payment: { entity: { id: "pay_123", order_id: "order_123", amount: "invalid" } },
      subscription: {
        entity: {
          id: "sub_123",
          current_start: 1_800_000_000,
          current_end: "invalid",
        },
      },
    },
  }), {
    event: "payment.captured",
    payload: {
      payment: { entity: { id: "pay_123", order_id: "order_123" } },
      subscription: { entity: { id: "sub_123", current_start: 1_800_000_000 } },
    },
  });
});

test("rejects non-object webhook payloads and payloads without an event name", () => {
  assert.equal(parseRazorpayWebhookPayload(null), null);
  assert.equal(parseRazorpayWebhookPayload([]), null);
  assert.equal(parseRazorpayWebhookPayload({ payload: {} }), null);
  assert.equal(parseRazorpayWebhookPayload({ event: "  " }), null);
});
