/**
 * Per-step wizard validation (handoff §4, §5–§10).
 *
 * Returns a `FieldErrors` map keyed by field; an empty map means the step is
 * valid. Server-side validation lives in `lib/api/listing-input.ts` and mirrors
 * these rules — keep both in sync when a rule changes.
 */
import { LISTING_MIN_IMAGES, LISTING_MIN_MEDIA } from "@/lib/listing-media";
import { MAX_REFUND_DAYS, PLATFORM_MIN_BOOKING_DAYS, durationDays, parseAmount } from "./config";

export type FieldErrors = Record<string, string>;

export type Step1Values = {
  spaceType: string;
  floor: string;
  area: string;
  description: string;
  usages: string[];
};

export type Step2Values = {
  length: string;
  breadth: string;
  height: string;
};

export type Step4Values = {
  priceModel: string;
  rate: string;
  securityAmount: string;
  refundDays: string;
  availabilityDays: string[];
  minimumBookingDuration: string;
  minimumBookingCustomDays: string;
  maximumBookingDuration: string;
  maximumBookingCustomDays: string;
};

export type Step5Values = {
  mediaCount: number;
  imageCount: number;
  hasAadhaar: boolean;
};

export type Step6Values = {
  address: string;
  city: string;
  state: string;
};

export function validateStep1(values: Step1Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.spaceType.trim()) errors.spaceType = "Select a space type to continue.";
  if (!values.floor.trim()) errors.floor = "Select a floor level to continue.";
  const area = parseAmount(values.area);
  if (area === null || area <= 0) errors.area = "Enter your space area.";
  if (!values.description.trim()) errors.description = "Write a short description to continue.";
  else if (values.description.length > 300) errors.description = "Description must be 300 characters or fewer.";
  if (!values.usages.length) errors.usage = "Select at least one usage.";
  return errors;
}

export function validateStep2(values: Step2Values): FieldErrors {
  const errors: FieldErrors = {};
  const length = parseAmount(values.length);
  const breadth = parseAmount(values.breadth);
  if (!values.length.trim() || !values.breadth.trim()) {
    errors.dimensions = "Enter length and breadth to continue.";
  } else if (length === null || breadth === null || length <= 0 || breadth <= 0) {
    errors.dimensions = "Enter valid numeric dimensions.";
  }
  if (values.height.trim() && (parseAmount(values.height) === null || (parseAmount(values.height) ?? 0) <= 0)) {
    errors.height = "Enter a valid height.";
  }
  return errors;
}

/** Step 3 (Amenities) has no required fields — handoff §7. */
export function validateStep3(): FieldErrors {
  return {};
}

export function validateStep4(values: Step4Values): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.priceModel) errors.priceModel = "Select a price model.";

  const rate = parseAmount(values.rate);
  if (!values.rate.trim()) errors.rate = "Enter your rental rate.";
  else if (rate === null || rate <= 0) errors.rate = "Rate must be greater than ₹0.";

  const security = parseAmount(values.securityAmount);
  if (!values.securityAmount.trim() || security === null || security < 0) {
    errors.security = "Enter a valid amount.";
  } else if (security > 0) {
    // Refund timeline is only meaningful when a deposit is taken (§8.3/§8.4).
    const refund = parseAmount(values.refundDays);
    if (!values.refundDays.trim()) errors.refund = "Enter refund timeline.";
    else if (refund === null || !Number.isInteger(refund) || refund < 1) errors.refund = "Enter a valid number of days.";
    else if (refund > MAX_REFUND_DAYS) errors.refund = `Refund period cannot exceed ${MAX_REFUND_DAYS} days.`;
  }

  if (!values.availabilityDays.length) errors.availabilityDays = "Select at least one available day.";

  const minDays = durationDays(values.minimumBookingDuration, values.minimumBookingCustomDays);
  if (minDays === null) errors.minimumBookingDuration = "Enter a valid number of days.";
  else if (minDays < PLATFORM_MIN_BOOKING_DAYS) {
    errors.minimumBookingDuration = `Minimum booking duration must be at least ${PLATFORM_MIN_BOOKING_DAYS} days.`;
  }

  const maxDays = durationDays(values.maximumBookingDuration, values.maximumBookingCustomDays);
  if (maxDays === null) errors.maximumBookingDuration = "Enter a valid number of days.";
  else if (minDays !== null && maxDays < minDays) {
    errors.maximumBookingDuration = "Maximum duration must be greater than or equal to minimum duration.";
  }

  return errors;
}

export function validateStep5(values: Step5Values): FieldErrors {
  const errors: FieldErrors = {};
  if (values.mediaCount < LISTING_MIN_MEDIA || values.imageCount < LISTING_MIN_IMAGES) {
    errors.media = "Add at least 2 space photos to continue.";
  }
  if (!values.hasAadhaar) errors.kyc = "Aadhaar card upload is required — the other documents are optional.";
  return errors;
}

export function validateStep6(values: Step6Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.address.trim()) errors.address = "Enter your full address to continue.";
  if (!values.city.trim() || !values.state.trim()) errors.cityState = "Enter city and state to continue.";
  return errors;
}

/** First message in a field-error map, for banner display. */
export function firstError(errors: FieldErrors): string {
  for (const key of Object.keys(errors)) return errors[key];
  return "";
}
