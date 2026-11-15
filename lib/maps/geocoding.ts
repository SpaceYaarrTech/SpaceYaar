export type LocationSearchResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  city?: string;
  area?: string;
};

const geocodeCache = new Map<string, LocationSearchResult[]>();
const reverseCache = new Map<string, LocationSearchResult>();

const normalizeQuery = (query: string) => query.trim().replace(/\s+/g, " ").toLowerCase();

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  state?: string;
};

type NominatimItem = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
};

const toResult = (item: NominatimItem): LocationSearchResult | null => {
  if (!item.display_name || item.error) return null;
  const address = item.address ?? {};
  const city = address.city ?? address.town ?? address.village ?? address.suburb ?? "";
  const area = address.suburb ?? city;
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    displayName: item.display_name,
    city: city || undefined,
    area: area || undefined,
  };
};

/**
 * Keyword search against OpenStreetMap Nominatim. Returns up to 5 matches so
 * the caller can show the user real options instead of silently picking one.
 *
 * `signal` lets the caller cancel in-flight work (debounced keystrokes). An
 * 8s internal timeout guarantees the UI never spins forever on a bad network;
 * a caller-initiated abort rejects with AbortError so it can be ignored.
 */
export async function searchLocation(query: string, signal?: AbortSignal): Promise<LocationSearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized) ?? [];
  }

  const params = new URLSearchParams({
    q: normalized,
    format: "jsonv2",
    limit: "5",
    addressdetails: "1",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const relayAbort = () => controller.abort();
  signal?.addEventListener("abort", relayAbort);

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Location search unavailable");
    }

    const rawResults = (await response.json()) as NominatimItem[];

    const results = rawResults
      .map(toResult)
      .filter((item): item is LocationSearchResult => item !== null);

    geocodeCache.set(normalized, results);
    return results;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      // Our 8s timeout vs. the caller cancelling — only the former is a failure.
      if (signal?.aborted) throw cause;
      throw new Error("Location search timed out. Try again.");
    }
    throw cause instanceof Error ? cause : new Error("Location search unavailable");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relayAbort);
  }
}

/**
 * Resolves coordinates back into a named place (used after the browser
 * grants a geolocation fix). Returns null on any failure so callers can fall
 * back to whatever location they already had.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationSearchResult | null> {
  // ~11m grid — repeated fixes for the same spot hit the cache, not Nominatim.
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = reverseCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    lat: latitude.toFixed(6),
    lon: longitude.toFixed(6),
    format: "jsonv2",
    zoom: "16",
    addressdetails: "1",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const raw = (await response.json()) as NominatimItem;
    const result = toResult(raw);
    if (result) reverseCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
