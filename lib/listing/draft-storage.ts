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

import type { ListingOnBehalf } from "@/lib/listing/on-behalf";

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
  // Admin on-behalf mode rides with the draft so a refresh mid-flow keeps it
  // and finishing/leaving the flow drops it.
  onBehalf?: ListingOnBehalf | null;
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

/**
 * Media (photos/videos + KYC documents) can't live in the JSON draft — File
 * blobs aren't serializable — so they ride in IndexedDB alongside it. Without
 * this, a refresh on the Preview & Review screen restores the form but shows
 * the placeholder image, and step 5 comes back empty.
 */
export type DraftMediaPhoto = { name: string; isVideo: boolean; file: File };
export type DraftMediaDocument = { name: string; file: File };
export type DraftMedia = {
  photos: Record<string, DraftMediaPhoto>;
  documents: Record<string, DraftMediaDocument>;
};

const MEDIA_DB_NAME = "spaceyaar-listing-media";
const MEDIA_STORE_NAME = "draft";
const MEDIA_KEY = "current";

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) db.createObjectStore(MEDIA_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Persist the draft's files. Returns false when IndexedDB is unavailable. */
export async function saveDraftMedia(media: DraftMedia): Promise<boolean> {
  try {
    const db = await openMediaDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
        tx.objectStore(MEDIA_STORE_NAME).put(media, MEDIA_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      return true;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

/** Read the saved files, or null when absent/unreadable. */
export async function loadDraftMedia(): Promise<DraftMedia | null> {
  try {
    const db = await openMediaDb();
    try {
      const stored = await new Promise<DraftMedia | null>((resolve, reject) => {
        const tx = db.transaction(MEDIA_STORE_NAME, "readonly");
        const request = tx.objectStore(MEDIA_STORE_NAME).get(MEDIA_KEY);
        request.onsuccess = () => resolve((request.result as DraftMedia | undefined) ?? null);
        request.onerror = () => reject(request.error);
      });
      if (!stored || typeof stored !== "object") return null;
      return {
        photos: stored.photos && typeof stored.photos === "object" ? stored.photos : {},
        documents: stored.documents && typeof stored.documents === "object" ? stored.documents : {},
      };
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Drop the stored files — called alongside clearListingDraft on submit. */
export async function clearDraftMedia(): Promise<void> {
  try {
    const db = await openMediaDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(MEDIA_STORE_NAME, "readwrite");
        tx.objectStore(MEDIA_STORE_NAME).delete(MEDIA_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    // Nothing to recover from; stale files are harmless.
  }
}
