export type LocationSearchResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  city?: string;
  area?: string;
};

const geocodeCache = new Map<string, LocationSearchResult[]>();

const normalizeQuery = (query: string) => query.trim().replace(/\s+/g, " ").toLowerCase();

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

    const rawResults = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: { city?: string; town?: string; village?: string; suburb?: string; state?: string; };
    }>;

    const results = rawResults.map((item) => {
      const address = item.address ?? {};
      const city = address.city ?? address.town ?? address.village ?? address.suburb ?? "";
      const area = address.suburb ?? city;

      return {
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        displayName: item.display_name,
        city: city || undefined,
        area: area || undefined,
      };
    });

    geocodeCache.set(normalized, results);
    return results;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      // Our8s timeout vs. the caller cancelling — only the former is a failure.
      if (signal?.aborted) throw cause;
      throw new Error("Location search timed out. Try again.");
    }
    throw cause instanceof Error ? cause : new Error("Location search unavailable");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relayAbort);
  }
}
