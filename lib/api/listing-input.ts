import { MAX_REFUND_DAYS, PLATFORM_MIN_BOOKING_DAYS } from "@/lib/listing/config";

const PRICE_MODELS = ["Per Day", "Per Week", "Per Month", "Customize"] as const;
const AVAILABILITY_DAYS = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DIMENSION_UNITS = ["Ft", "Gaj", "Cm", "Inch", "Meter"] as const;
const TEMPERATURE_UNITS = ["Celsius", "Fahrenheit"] as const;
// Legacy label durations still accepted so older edit flows keep working.
// The wizard now sends `minimumBookingDays` as a normalized number instead.
const MINIMUM_DURATIONS: Record<string, number> = { "1 Day": 1, "3 Days": 3, "1 Week": 7 };
// Values older listings were created with; grandfathered in below the
// platform minimum so editing them never corrupts or rejects their data.
const LEGACY_MIN_BOOKING_DAYS = [1, 3, 7];

const readString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const readNumber = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const readStringArray = (value: unknown, maxItems: number, maxLength: number) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean);
};

export function parseListingDraft(value: unknown) {
  if (!value || typeof value !== "object") return { error: "Invalid listing data." } as const;

  const input = value as Record<string, unknown>;
  const propertyType = readString(input.propertyType, 80);
  const floorLevel = readString(input.floorLevel, 40);
  const description = readString(input.description, 300);
  const address = readString(input.address, 500);
  const city = readString(input.city, 100);
  const state = readString(input.state, 100);
  const priceModel = readString(input.priceModel, 20);
  const dimensionUnit = readString(input.dimensionUnit, 10);
  const temperatureUnit = readString(input.temperatureUnit, 20);
  const priceAmount = readNumber(input.rate);
  const securityAmount = readNumber(input.securityAmount) ?? 0;
  const refundWithinDays = readNumber(input.refundDays);
  const minimumBookingDays =
    readNumber(input.minimumBookingDays) ?? MINIMUM_DURATIONS[readString(input.minimumBookingDuration, 20)] ?? null;
  const maximumBookingDays = readNumber(input.maximumBookingDays);
  const availabilityDays = readStringArray(input.availabilityDays, 7, 8);
  const latitude = readNumber(input.latitude);
  const longitude = readNumber(input.longitude);

  if (!propertyType || !floorLevel || !address || !city || !state) {
    return { error: "Complete the space type, floor, address, city, and state." } as const;
  }
  if (!PRICE_MODELS.includes(priceModel as (typeof PRICE_MODELS)[number]) || priceAmount === null || priceAmount <= 0) {
    return { error: "Choose a price model and enter a valid rate." } as const;
  }
  // A ₹0 deposit needs no refund timeline (stored as null); a taken deposit
  // requires one within the configured maximum (handoff §8.3/§8.4).
  if (securityAmount < 0 || (securityAmount > 0 && (refundWithinDays === null || refundWithinDays < 1 || refundWithinDays > MAX_REFUND_DAYS))) {
    return { error: "Enter valid security and refund details." } as const;
  }
  if (minimumBookingDays === null || minimumBookingDays < 1 || !availabilityDays.length) {
    return { error: "Choose availability days and a minimum booking duration." } as const;
  }
  if (
    minimumBookingDays < PLATFORM_MIN_BOOKING_DAYS &&
    !LEGACY_MIN_BOOKING_DAYS.includes(minimumBookingDays)
  ) {
    return { error: `Minimum booking duration must be at least ${PLATFORM_MIN_BOOKING_DAYS} days.` } as const;
  }
  if (maximumBookingDays !== null && maximumBookingDays < 1) {
    return { error: "Enter a valid maximum booking duration." } as const;
  }
  if (maximumBookingDays !== null && maximumBookingDays < minimumBookingDays) {
    return { error: "Maximum duration must be greater than or equal to minimum duration." } as const;
  }
  if (availabilityDays.some((day) => !AVAILABILITY_DAYS.includes(day as (typeof AVAILABILITY_DAYS)[number]))) {
    return { error: "Choose valid availability weekdays." } as const;
  }
  if (!DIMENSION_UNITS.includes(dimensionUnit as (typeof DIMENSION_UNITS)[number])) {
    return { error: "Choose a supported dimension unit." } as const;
  }
  if (!TEMPERATURE_UNITS.includes(temperatureUnit as (typeof TEMPERATURE_UNITS)[number])) {
    return { error: "Choose a supported temperature unit." } as const;
  }
  if ((latitude !== null && (latitude < -90 || latitude > 90)) || (longitude !== null && (longitude < -180 || longitude > 180))) {
    return { error: "Location coordinates are invalid." } as const;
  }

  const areaValue = readNumber(input.areaValue);
  const length = readNumber(input.length);
  const breadth = readNumber(input.breadth);
  const height = readNumber(input.height);
  const temperature = readNumber(input.temperature);

  return {
    data: {
      title: `${propertyType.replace(/-/g, " ")} in ${city}`,
      description,
      property_type: propertyType,
      floor_level: floorLevel,
      area_value: areaValue !== null && areaValue > 0 ? areaValue : null,
      area_unit: readString(input.areaUnit, 24) || null,
      length,
      breadth,
      height,
      dimension_unit: dimensionUnit,
      temperature,
      temperature_unit: temperatureUnit,
      usage_types: readStringArray(input.usageTypes, 12, 48),
      loading_features: readStringArray(input.loadingFeatures, 20, 80),
      amenities: readStringArray(input.amenities, 30, 80),
      price_model: priceModel,
      price_amount: priceAmount,
      currency: "INR",
      security_amount: securityAmount,
      refund_within_days: refundWithinDays === null ? null : Math.floor(refundWithinDays),
      availability_days: availabilityDays,
      min_booking_days: Math.floor(minimumBookingDays),
      max_booking_days: maximumBookingDays === null ? null : Math.floor(maximumBookingDays),
      area_overridden: input.areaOverridden === true,
      address,
      pincode: readString(input.pincode, 12) || null,
      city,
      state,
      access_instructions: readString(input.accessInstructions, 300) || null,
      latitude,
      longitude,
    },
  } as const;
}
