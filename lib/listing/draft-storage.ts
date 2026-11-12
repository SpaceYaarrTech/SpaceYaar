/**
 * Local-first listing draft persistence (handoff §4, §18, §21).
 *
 * Wizard progress is written to localStorage synchronously before any step
 * navigation, restored on mount, and mirrored on a 1s debounce while the
 * owner edits. This keeps drafts alive across refresh and logout (nothing in
 * the app clears this key), works for guests, and stays testable without a
 * configured backend. Final listing validation still happens server-side on
 * submit — the server remains the source of truth for business rules.
 *
 * The shape is intentionally behind this module so a server-side draft sync
 * can be added later without touching the wizard.
 */

export const LISTING_DRAFT_KEY = "spaceyaar-listing-draft";
export const LISTING_DRAFT_VERSION = 1;

export type DraftLocation = {
  latitude: number;
  longitude: number;
  displayName: string;
  city: string;
  area: string;
};

export type ListingDraftValues = {
  // Step 1 — Property Details
  selectedSpaceType: string;
  selectedFloor: string;
  spaceArea: string;
  spaceAreaUnit: string;
  description: string;
  selectedUsages: string[];
  // Step 2 — Property Dimensions
  length: string;
  breadth: string;
  height: string;
  dimensionUnit: string;
  temperature: string;
  temperatureUnit: string;
  selectedLoadingFeatures: string[];
  areaOverridden: boolean;
  // Step 3 — Amenities & Features
  selectedAmenities: string[];
  // Step 4 — Pricing & Availability
  priceModel: string;
  rate: string;
  securityAmount: string;
  refundDays: string;
  availabilityDays: string[];
  minimumBookingDuration: string;
  minimumBookingCustomDays: string;
  maximumBookingDuration: string;
  maximumBookingCustomDays: string;
  // Step 6 — Location & Access
  address: string;
  pincode: string;
  city: string;
  state: string;
  accessInstructions: string;
  selectedLocation: DraftLocation;
};

export type ListingDraft = {
  version: number;
  updatedAt: string;
  currentStep: number;
  showReview: boolean;
  editingFromReview: number | null;
  draftListingId: string | null;
  values: ListingDraftValues;
};

/** Read the saved draft, or null when absent/unreadable/outdated. */
export function loadListingDraft(): ListingDraft | null {
  try {
    const raw = window.localStorage.getItem(LISTING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListingDraft;
    if (
      !parsed ||
      parsed.version !== LISTING_DRAFT_VERSION ||
      typeof parsed.currentStep !== "number" ||
      !parsed.values ||
      typeof parsed.values !== "object"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Persist the draft. Returns false when storage is unavailable (§18). */
export function saveListingDraft(draft: ListingDraft): boolean {
  try {
    window.localStorage.setItem(LISTING_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Drop the draft — called after a successful submission. */
export function clearListingDraft(): void {
  try {
    window.localStorage.removeItem(LISTING_DRAFT_KEY);
  } catch {
    // Nothing to recover from; a stale draft is harmless.
  }
}
