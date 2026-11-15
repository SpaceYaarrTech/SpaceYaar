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

/** A search failure that knows whether retrying could plausibly help. */
class SearchError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "SearchError";
  }
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });

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

async function fetchSuggestions(normalized: string, signal?: AbortSignal): Promise<LocationSearchResult[]> {
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
      // 429/5xx may clear up; other 4xx (bad request, blocked) will not.
      const busy = response.status === 429 || response.status >= 500;
      throw new SearchError(
        busy ? "Location search is busy right now. Try again in a moment." : "Location search unavailable",
        busy,
      );
    }

    const rawResults = (await response.json()) as NominatimItem[];
    return rawResults
      .map(toResult)
      .filter((item): item is LocationSearchResult => item !== null);
  } catch (cause) {
    if (cause instanceof SearchError) throw cause;
    if (cause instanceof DOMException && cause.name === "AbortError") {
      // Our 8s cap vs. the caller cancelling — only the former may retry.
      if (signal?.aborted) throw cause;
      throw new SearchError("Location search timed out. Try again.", true);
    }
    // Dropped connection / DNS blip — worth one more attempt.
    throw new SearchError("Location search is busy right now. Try again in a moment.", true);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relayAbort);
  }
}

/**
 * Keyword search against OpenStreetMap Nominatim. Returns up to 5 matches so
 * the caller can show the user real options instead of silently picking one.
 *
 * `signal` lets the caller cancel in-flight work (debounced keystrokes). An
 * 8s internal timeout guarantees the UI never spins forever, and one short
 * retry absorbs Nominatim's occasional hangs — never applied to a caller
 * abort or a hard (non-busy) HTTP failure.
 */
export async function searchLocation(query: string, signal?: AbortSignal): Promise<LocationSearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const cached = geocodeCache.get(normalized);
  if (cached) return cached;

  try {
    const results = await fetchSuggestions(normalized, signal);
    geocodeCache.set(normalized, results);
    return results;
  } catch (cause) {
    const callerAborted = signal?.aborted ?? false;
    const canRetry = !callerAborted && cause instanceof SearchError && cause.retryable;
    if (!canRetry) throw cause;

    await sleep(1200, signal); // rejects with AbortError if the caller cancels
    const results = await fetchSuggestions(normalized, signal);
    geocodeCache.set(normalized, results);
    return results;
  }
}

async function fetchReverse(latitude: number, longitude: number): Promise<LocationSearchResult | null> {
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
    return toResult(raw);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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

  const first = await fetchReverse(latitude, longitude);
  if (first) {
    reverseCache.set(cacheKey, first);
    return first;
  }

  // One quick retry — Nominatim occasionally drops the first connection.
  await sleep(1000);
  const second = await fetchReverse(latitude, longitude);
  if (second) reverseCache.set(cacheKey, second);
  return second;
}
