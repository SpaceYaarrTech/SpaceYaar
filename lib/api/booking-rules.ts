export function isValidBookingDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isBookingStatus(value: unknown): value is "accepted" | "rejected" | "cancelled" {
  return value === "accepted" || value === "rejected" || value === "cancelled";
}

export function bookingErrorStatus(code: string | undefined, message: string): number {
  if (code === "P0002" || message.includes("not_found")) return 404;
  if (code === "42501" || code === "28000") return code === "28000" ? 401 : 403;
  if (message.includes("unavailable") || message.includes("not_pending")) return 409;
  return 400;
}

export function bookingErrorMessage(message: string): string {
  if (message.includes("booking_dates_unavailable")) return "Those dates are no longer available.";
  if (message.includes("minimum_booking_duration_not_met")) return "The selected dates do not meet this space’s minimum booking duration.";
  if (message.includes("booking_start_date_in_past")) return "Choose a start date that is today or later.";
  if (message.includes("listing_requires_custom_quote")) return "This space requires a custom quote. Contact the owner before requesting a booking.";
  if (message.includes("booking_is_not_pending")) return "This booking request has already been updated.";
  if (message.includes("renter_role_required")) return "Choose the Renter role before requesting a booking.";
  if (message.includes("only_owner_can_respond") || message.includes("only_listing_owner_can_accept")) return "Only the space owner can respond to this request.";
  if (message.includes("owner_role_required")) return "Choose the Owner role before responding to requests.";
  if (message.includes("only_renter_can_cancel_request")) return "Only the renter can cancel this request.";
  if (message.includes("cannot_book_own_listing")) return "You cannot book your own space.";
  if (message.includes("published_listing_not_found")) return "Published listing not found.";
  if (message.includes("sign_in_required")) return "Sign in to continue.";
  return "Could not update this booking. Check the dates and try again.";
}
