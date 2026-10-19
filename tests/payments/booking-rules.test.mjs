import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingErrorMessage,
  bookingErrorStatus,
  isBookingStatus,
  isRecord,
  isValidBookingDate,
} from "../../lib/api/booking-rules.ts";

test("accepts only real ISO calendar dates", () => {
  assert.equal(isValidBookingDate("2026-10-20"), true);
  assert.equal(isValidBookingDate("2026-02-29"), false);
  assert.equal(isValidBookingDate("2026-2-02"), false);
  assert.equal(isValidBookingDate(20261020), false);
});

test("validates booking status transitions and JSON records", () => {
  assert.equal(isBookingStatus("accepted"), true);
  assert.equal(isBookingStatus("cancelled"), true);
  assert.equal(isBookingStatus("completed"), false);
  assert.equal(isRecord({ status: "accepted" }), true);
  assert.equal(isRecord([]), false);
  assert.equal(isRecord(null), false);
});

test("maps booking conflicts to an actionable response", () => {
  assert.equal(bookingErrorStatus("P0001", "booking_dates_unavailable"), 409);
  assert.equal(bookingErrorStatus("42501", "only_owner_can_respond"), 403);
  assert.equal(bookingErrorMessage("booking_dates_unavailable"), "Those dates are no longer available.");
});
