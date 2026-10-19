import assert from "node:assert/strict";
import test from "node:test";
import { parseListingDraft } from "../../lib/api/listing-input.ts";

function validListing(overrides = {}) {
  return {
    propertyType: "warehouse",
    floorLevel: "Ground Floor",
    address: "1 Test Road",
    city: "Kanpur",
    state: "Uttar Pradesh",
    priceModel: "Per Day",
    rate: "1500",
    securityAmount: "0",
    refundDays: "5",
    minimumBookingDuration: "1 Day",
    availabilityDays: ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"],
    dimensionUnit: "Ft",
    temperatureUnit: "Celsius",
    ...overrides,
  };
}

test("accepts valid listing weekdays", () => {
  assert.equal("data" in parseListingDraft(validListing()), true);
});

test("rejects weekday values that booking availability cannot interpret", () => {
  const result = parseListingDraft(validListing({ availabilityDays: ["Monday"] }));

  assert.deepEqual(result, { error: "Choose valid availability weekdays." });
});
