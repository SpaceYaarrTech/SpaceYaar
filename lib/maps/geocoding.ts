export type LocationSearchResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  city?: string;
  area?: string;
};

const geocodeCache = new Map<string, LocationSearchResult[]>();

const normalizeQuery = (query: string) => query.trim().replace(/\s+/g, " ").toLowerCase();

export async function searchLocation(query: string): Promise<LocationSearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized) ?? [];
  }

  const params = new URLSearchParams({
    q: normalized,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
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
}
