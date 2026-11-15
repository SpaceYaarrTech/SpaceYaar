import { reverseGeocode, type LocationSearchResult } from "./geocoding";

export const SELECTED_LOCATION_KEY = "spaceyaar-selected-location";

export type DetectionOutcome =
  | { status: "located"; location: LocationSearchResult }
  | { status: "denied" }
  | { status: "unavailable" };

/**
 * Reads the last confirmed/detected location from the shared session payload.
 * Returns null when nothing displayable is saved (no payload, or a legacy
 * bare-coordinates payload) so callers know they must detect or ask.
 */
export function readStoredLocation(): LocationSearchResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SELECTED_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocationSearchResult>;
    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number" ||
      typeof parsed.displayName !== "string" ||
      !parsed.displayName.trim()
    ) {
      return null;
    }
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      displayName: parsed.displayName,
      city: typeof parsed.city === "string" && parsed.city ? parsed.city : undefined,
      area: typeof parsed.area === "string" && parsed.area ? parsed.area : undefined,
    };
  } catch {
    return null;
  }
}

/** Writes a location into the shared session payload, keeping other fields. */
export function persistLocation(location: LocationSearchResult, role: string): void {
  if (typeof window === "undefined") return;
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(window.sessionStorage.getItem(SELECTED_LOCATION_KEY) || "{}") as Record<string, unknown>;
  } catch {
    existing = {};
  }
  window.sessionStorage.setItem(SELECTED_LOCATION_KEY, JSON.stringify({
    ...existing,
    role,
    latitude: location.latitude,
    longitude: location.longitude,
    city: location.city ?? "",
    area: location.area ?? "",
    displayName: location.displayName,
  }));
}

/** Short human label: "area, city", de-duplicated, falling back to the name. */
export function locationLabelOf(location: LocationSearchResult): string {
  const area = location.area?.trim() ?? "";
  const city = location.city?.trim() ?? "";
  if (area && city && area.toLowerCase() !== city.toLowerCase()) {
    return `${area}, ${city}`;
  }
  return area || city || location.displayName.split(",")[0]?.trim() || "";
}

/**
 * Asks the browser for the current position (permission prompt appears when
 * the origin has no decision yet) and reverse-geocodes it into a named place.
 * Any failure resolves to a non-located outcome — never throws.
 */
export function detectCurrentLocation(): Promise<DetectionOutcome> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ status: "unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        resolve(location ? { status: "located", location } : { status: "unavailable" });
      },
      (error) => {
        resolve({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });
}
