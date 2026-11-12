/**
 * Single source of truth for listing wizard constants (handoff §8, §21).
 *
 * Kept in one module so the Step 4 UI, client validation and server-side
 * parsing can never disagree about platform rules. Values mirror the current
 * SpaceYaar product rules; change them here, not in individual components.
 */

/** Weeks in a month used to derive weekly/monthly rental rates (money only). */
export const WEEKS_PER_MONTH = 4.345;

/** Platform-wide minimum booking length for new listings. */
export const PLATFORM_MIN_BOOKING_DAYS = 45;

/** Maximum allowed security refund timeline in days. */
export const MAX_REFUND_DAYS = 90;

/** Default maximum booking length — 11 Months (handoff §8.7 payload example). */
export const DEFAULT_MAX_BOOKING_DAYS = 330;

/**
 * Price models offered by the updated flow (handoff §8.1). Legacy models
 * ("Per Day", "Customize") remain valid server-side so older listings keep
 * editing and booking correctly.
 */
export const PRICE_MODELS = ["Per Week", "Per Month"] as const;

/**
 * Weekday values in the format listings already store. The booking RPC's
 * availability check and the renter UI both speak this format, so the new
 * flow reuses it instead of introducing MON/TUE enums (handoff §5.1 mapping
 * principle).
 */
export const AVAILABILITY_DAYS = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const DAY_FULL_NAMES: Record<string, string> = {
  Mon: "Monday",
  Tues: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

/** Screen-reader friendly name for an availability weekday. */
export const availabilityDayLabel = (day: string) => DAY_FULL_NAMES[day] ?? day;

/**
 * Duration presets shown in Step 4. Months use 30-day values so the default
 * maximum of "11 Months" normalizes to the 330 days in the handoff payload.
 * Labels (not day counts) drive the selected state, so "90 Days" and
 * "3 Months" can coexist even though both normalize to 90 days.
 */
export const MIN_BOOKING_PRESETS = ["45 Days", "60 Days", "90 Days", "3 Months", "6 Months", "12 Months", "Custom"] as const;
export const MAX_BOOKING_PRESETS = ["3 Months", "6 Months", "9 Months", "11 Months", "12 Months", "Custom"] as const;

const DURATION_DAYS: Record<string, number> = {
  "45 Days": 45,
  "60 Days": 60,
  "90 Days": 90,
  "3 Months": 90,
  "6 Months": 180,
  "9 Months": 270,
  "11 Months": 330,
  "12 Months": 360,
};

/** Resolve a duration preset (or custom day count) to normalized days. */
export function durationDays(label: string, customDays: string): number | null {
  if (label === "Custom") {
    const value = Number(customDays);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  }
  return DURATION_DAYS[label] ?? null;
}

/** Derive the weekly/monthly rate pair from the entered base rate (§8.2). */
export function deriveRates(baseRate: number, priceModel: string): { weeklyRate: number; monthlyRate: number } {
  if (!Number.isFinite(baseRate) || baseRate <= 0) return { weeklyRate: 0, monthlyRate: 0 };
  return priceModel === "Per Month"
    ? { monthlyRate: Math.round(baseRate), weeklyRate: Math.round(baseRate / WEEKS_PER_MONTH) }
    : { weeklyRate: Math.round(baseRate), monthlyRate: Math.round(baseRate * WEEKS_PER_MONTH) };
}

/** Parse a rupee input (accepts grouped digits) to a number, or null. */
export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Indian-grouped display formatting for rupee amounts. */
export function formatINR(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("en-IN") : "";
}

/** Strip everything but digits — numeric fields reject alphabets/symbols. */
export function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 12);
}
