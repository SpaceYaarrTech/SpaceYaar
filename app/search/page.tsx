"use client";

import { Crosshair, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { RenterListingCard, type RenterListingRecord } from "@/components/renter/RenterListingCard";
import type { SearchMapMarker } from "@/components/renter/SearchResultsMap";
import { searchLocation, type LocationSearchResult } from "@/lib/maps/geocoding";
import { detectCurrentLocation, persistLocation } from "@/lib/maps/current-location";

const SearchResultsMap = dynamic(
  () => import("@/components/renter/SearchResultsMap").then((module) => module.SearchResultsMap),
  { ssr: false, loading: () => <div className="renter-map-wrap renter-map-loading">Loading map…</div> },
);

type SortMode = "nearest" | "price-asc" | "price-desc" | "recent";
type SearchListing = RenterListingRecord & {
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

function distanceKm(from: [number, number], to: [number, number]) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const [lat1, lon1] = from.map(toRadians);
  const [lat2, lon2] = to.map(toRadians);
  const a = Math.sin((lat2 - lat1) / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function areaInSquareFeet(value: number, unit: string | null) {
  const normalized = unit?.toLowerCase() ?? "";
  if (normalized.includes("meter")) return value * 10.7639;
  if (normalized.includes("gaj")) return value * 9;
  if (normalized.includes("inch")) return value / 144;
  if (normalized.includes("cm")) return value / (30.48 ** 2);
  return value;
}

function updateUrl(values: Record<string, string>) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

export default function SearchPage() {
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [minimumArea, setMinimumArea] = useState("");
  const [withinOneKm, setWithinOneKm] = useState(false);
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [sort, setSort] = useState<SortMode>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");

  // --- Location search: the same behaviour as the location screen ---
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  // True once the user types — gates the live fetch so a restored ?q= filter
  // never pops a location list on load.
  const interactedRef = useRef(false);
  const detectSeqRef = useRef(0);

  /** A manual action invalidates any in-flight detection. */
  const cancelDetection = useCallback(() => {
    detectSeqRef.current += 1;
    setLocating(false);
    setLocationHint(null);
  }, []);

  /** An origin means distance ordering — unless they chose a price sort. */
  const adoptOrigin = useCallback((coords: [number, number]) => {
    setOrigin(coords);
    setSort((current) => (current === "recent" ? "nearest" : current));
  }, []);

  /** A place picked from suggestions / detected — becomes the search origin. */
  const applyPickedLocation = useCallback((next: LocationSearchResult) => {
    persistLocation(next, "renter");
    adoptOrigin([next.latitude, next.longitude]);
    // The intent was "search around here", not a text match on the place name.
    setQuery("");
    interactedRef.current = false;
    setSuggestions([]);
    setShowSuggestions(false);
    setLocationHint(null);
  }, [adoptOrigin]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restoredQuery = params.get("q") ?? "";
    setQuery(restoredQuery);
    setMinimumPrice(params.get("minPrice") ?? "");
    setMaximumPrice(params.get("maxPrice") ?? "");
    setMinimumArea(params.get("minArea") ?? "");
    setWithinOneKm(params.get("within1km") === "1");
    const validSort = params.get("sort");
    const requestedSort = validSort === "price-asc" || validSort === "price-desc" || validSort === "recent"
      ? validSort : null;
    try {
      const stored = window.sessionStorage.getItem("spaceyaar-selected-location");
      if (stored) {
        const location = JSON.parse(stored) as { latitude?: number; longitude?: number };
        if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
          setOrigin([location.latitude as number, location.longitude as number]);
          setSort(requestedSort ?? "nearest");
          // A saved choice stands — same as /location, never auto-stomped.
          return;
        }
        setSort(requestedSort ?? "recent");
      } else {
        setSort(requestedSort ?? "recent");
      }
    } catch {
      setOrigin(null);
      setSort(requestedSort ?? "recent");
    }

    // Nothing saved — locate once (the same first-visit behaviour as the home
    // and location screens). A restored text filter is intent too, so a late
    // fix must never wipe it.
    if (restoredQuery.trim()) return;
    const token = detectSeqRef.current + 1;
    detectSeqRef.current = token;
    setLocating(true);
    void detectCurrentLocation().then((outcome) => {
      if (detectSeqRef.current !== token) return;
      setLocating(false);
      if (outcome.status === "located") {
        applyPickedLocation(outcome.location);
        return;
      }
      setLocationHint(outcome.status === "denied"
        ? "Location access is off — allow it in your browser, or search an area."
        : "Couldn't detect your location — search an area instead.");
    });
  }, [applyPickedLocation]);

  // Fetch matches as the user types (debounced, cancellable) so entering a
  // keyword actually resolves places — the same live lookup as /location.
  useEffect(() => {
    const trimmed = query.trim();
    // A new query invalidates the previous search feedback — a stale no-match
    // message must not linger while the new lookup runs.
    setLocationHint(null);
    if (!interactedRef.current || trimmed.length < 2) {
      // Nothing typed (or too short) → no list; clearing the box closes it.
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchLocation(trimmed, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return;
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
          // A settled empty lookup must say so — silence below a typed
          // query reads as "the page is broken" (same message /location shows).
          if (!results.length) setLocationHint("Location nahi mili. Please try another area.");
        })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setShowSuggestions(false);
          // System failures pass through verbatim; anything else gets the
          // friendly no-match message — the same rule as /location.
          setLocationHint(cause instanceof Error && cause.message.startsWith("Location search")
            ? cause.message
            : "Location nahi mili. Please try another area.");
        });
    }, 700);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/listings?limit=50", { cache: "no-store", signal: controller.signal });
        const result = await response.json() as { listings?: SearchListing[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load spaces.");
        if (!current) return;
        setListings(result.listings ?? []);
        const favoritesResponse = await fetch("/api/favorites", { cache: "no-store", signal: controller.signal });
        if (favoritesResponse.ok) {
          const favoritesResult = await favoritesResponse.json() as { favorites?: Array<{ listing_id: string }> };
          if (current) setSavedIds((favoritesResult.favorites ?? []).map((item) => item.listing_id));
        }
      } catch (cause) {
        if (current && !(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Could not load spaces.");
        }
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    return () => {
      current = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateUrl({
        q: query.trim(),
        minPrice: minimumPrice,
        maxPrice: maximumPrice,
        minArea: minimumArea,
        within1km: withinOneKm ? "1" : "",
        sort: sort === "nearest" ? "" : sort,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, minimumPrice, maximumPrice, minimumArea, withinOneKm, sort]);

  const filteredListings = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const min = minimumPrice === "" ? null : Number(minimumPrice);
    const max = maximumPrice === "" ? null : Number(maximumPrice);
    const area = minimumArea === "" ? null : Number(minimumArea);
    const filtered = listings.filter((listing) => {
      const searchable = [
        listing.title,
        listing.city,
        listing.state ?? "",
        listing.pincode ?? "",
        listing.property_type,
        listing.area_value ?? "",
        listing.area_unit ?? "",
        listing.description ?? "",
        ...listing.amenities,
      ].join(" ").toLocaleLowerCase();
      const price = listing.price_model === "Per Week" ? listing.price_amount / 7
        : listing.price_model === "Per Month" ? listing.price_amount / 30 : listing.price_amount;
      const hasCoordinates = Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude);
      const distance = origin && hasCoordinates
        ? distanceKm(origin, [listing.latitude as number, listing.longitude as number])
        : null;
      return (!needle || searchable.includes(needle))
        && (min === null || price >= min)
        && (max === null || price <= max)
        && (area === null || (listing.area_value !== null && areaInSquareFeet(Number(listing.area_value), listing.area_unit) >= area))
        && (!withinOneKm || (distance !== null && distance <= 1));
    });

    return filtered.sort((first, second) => {
      const perDay = (listing: SearchListing) => listing.price_model === "Per Week" ? listing.price_amount / 7
        : listing.price_model === "Per Month" ? listing.price_amount / 30 : listing.price_amount;
      if (sort === "price-asc") return perDay(first) - perDay(second);
      if (sort === "price-desc") return perDay(second) - perDay(first);
      if (sort === "recent") return Date.parse(second.created_at) - Date.parse(first.created_at);
      if (origin) {
        const firstDistance = first.latitude !== null && first.longitude !== null
          ? distanceKm(origin, [first.latitude, first.longitude]) : Number.POSITIVE_INFINITY;
        const secondDistance = second.latitude !== null && second.longitude !== null
          ? distanceKm(origin, [second.latitude, second.longitude]) : Number.POSITIVE_INFINITY;
        return firstDistance - secondDistance;
      }
      return 0;
    });
  }, [listings, query, minimumPrice, maximumPrice, minimumArea, withinOneKm, origin, sort]);

  const toggleSaved = async (listing: RenterListingRecord) => {
    setFavoriteError("");
    const isSaved = savedIds.includes(listing.id);
    try {
      const response = await fetch(isSaved ? `/api/favorites?listingId=${encodeURIComponent(listing.id)}` : "/api/favorites", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        ...(isSaved ? {} : { body: JSON.stringify({ listingId: listing.id }) }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update saved spaces.");
      setSavedIds((current) => isSaved ? current.filter((id) => id !== listing.id) : [...current, listing.id]);
    } catch (cause) {
      setFavoriteError(cause instanceof Error ? cause.message : "Could not update saved spaces.");
    }
  };

  const clearFilters = () => {
    setMinimumPrice("");
    setMaximumPrice("");
    setMinimumArea("");
    setWithinOneKm(false);
  };

  const changeOrigin = (nextOrigin: [number, number]) => {
    cancelDetection();
    adoptOrigin(nextOrigin);
    // Keep any display fields (area/city/displayName) the location screen
    // wrote — overwriting with bare coordinates would wipe the renter-home
    // location line back to its default.
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(window.sessionStorage.getItem("spaceyaar-selected-location") || "{}") as Record<string, unknown>;
    } catch {
      existing = {};
    }
    window.sessionStorage.setItem("spaceyaar-selected-location", JSON.stringify({
      ...existing,
      latitude: nextOrigin[0],
      longitude: nextOrigin[1],
    }));
  };

  const handleUseCurrentLocation = () => {
    const token = detectSeqRef.current + 1;
    detectSeqRef.current = token;
    interactedRef.current = false; // explicit tap: a typed filter must not block the fix
    setLocating(true);
    setLocationHint(null);
    setShowSuggestions(false);
    void detectCurrentLocation().then((outcome) => {
      if (detectSeqRef.current !== token) return;
      setLocating(false);
      if (outcome.status === "located") {
        applyPickedLocation(outcome.location);
        return;
      }
      // An explicit tap always explains itself.
      setLocationHint(outcome.status === "denied"
        ? "Location access is off — allow it in your browser, or search an area."
        : "Couldn't detect your location — search an area instead.");
    });
  };

  const selectMarker = (listingId: string) => {
    setSelectedId(listingId);
    window.setTimeout(() => {
      document.getElementById(`search-listing-${listingId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  };

  const mapMarkers: SearchMapMarker[] = filteredListings.flatMap((listing) =>
    listing.latitude !== null && listing.longitude !== null
      ? [{ id: listing.id, title: listing.title, latitude: listing.latitude, longitude: listing.longitude }]
      : [],
  );

  return (
    <main className="renter-flow-page renter-search-page">
      <header className="renter-page-header"><h1>Find a Space</h1></header>
      <div className="location-search-wrap">
        <label className="renter-search-input">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              const typed = value.trim().length > 0;
              interactedRef.current = typed;
              // Typing takes over — a late geolocation fix must not stomp.
              if (typed) cancelDetection();
              setQuery(value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && showSuggestions && suggestions.length > 0) {
                event.preventDefault();
                interactedRef.current = false;
                cancelDetection();
                applyPickedLocation(suggestions[0]);
              }
            }}
            onBlur={(event) => {
              // Only close when focus actually leaves the search widget —
              // tapping a suggestion must not race the list shut.
              const next = event.relatedTarget as Node | null;
              const wrap = event.currentTarget.closest(".location-search-wrap");
              if (next && wrap?.contains(next)) return;
              window.setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="Search location size area pincode .etc"
            aria-label="Search location, space name, area or pincode"
          />
          <button type="button" aria-label="Open filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
            <Filter size={18} />
          </button>
        </label>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="location-suggestions" role="listbox" aria-label="Matching locations">
            {suggestions.map((item) => (
              <li key={`${item.latitude},${item.longitude}`}>
                <button
                  type="button"
                  className="location-suggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    interactedRef.current = false;
                    cancelDetection();
                    applyPickedLocation(item);
                  }}
                >
                  <span>{item.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* The same persistent affordance the location screen keeps: current
          location on demand, one tap away. */}
      <button type="button" className="use-current-location" onClick={handleUseCurrentLocation} disabled={locating}>
        <Crosshair size={16} strokeWidth={2.2} aria-hidden="true" />
        <span>Use current location</span>
      </button>

      {locating && <p className="location-hint" role="status">Detecting your location…</p>}
      {!locating && locationHint && <p className="location-hint" role="status">{locationHint}</p>}

      <div className="renter-filter-row">
        {minimumPrice || maximumPrice ? <button type="button" className="renter-filter-chip" onClick={() => { setMinimumPrice(""); setMaximumPrice(""); }}>Price: ₹{minimumPrice || "0"}–{maximumPrice || "∞"} <X size={12} /></button> : null}
        {withinOneKm && <button type="button" className="renter-filter-chip" onClick={() => setWithinOneKm(false)}>Within 1KM <X size={12} /></button>}
        {minimumArea && <button type="button" className="renter-filter-chip" onClick={() => setMinimumArea("")}>{minimumArea}+ Sq ft <X size={12} /></button>}
        <button type="button" className="renter-clear-filters" onClick={clearFilters} disabled={!minimumPrice && !maximumPrice && !minimumArea && !withinOneKm}>Clear All</button>
      </div>

      {filtersOpen && (
        <section className="renter-filter-panel" aria-label="Search filters">
          <div className="renter-filter-panel-heading"><strong>Filters</strong><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={18} /></button></div>
          <div className="renter-filter-fields">
            <label>Min price per day (₹)<input inputMode="decimal" type="number" min="0" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)} /></label>
            <label>Max price per day (₹)<input inputMode="decimal" type="number" min="0" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} /></label>
            <label>Minimum size (sq ft)<input inputMode="numeric" type="number" min="0" value={minimumArea} onChange={(event) => setMinimumArea(event.target.value)} /></label>
          </div>
          <label className="renter-radius-filter"><input type="checkbox" checked={withinOneKm} onChange={(event) => setWithinOneKm(event.target.checked)} /> Within 1 km of my location</label>
          {!origin && withinOneKm && <p className="renter-filter-hint">Use current location or the map button to enable distance filtering.</p>}
        </section>
      )}

      <div className="renter-results-heading">
        <strong>{loading ? "Loading spaces…" : `${filteredListings.length} Spaces available`}</strong>
        <label className="renter-sort-control"><SlidersHorizontal size={14} /><span>Sort:</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Sort search results">
            <option value="nearest" disabled={!origin}>Nearest{origin ? "" : " (set location)"}</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="recent">Recently Added</option>
          </select>
        </label>
      </div>

      <SearchResultsMap markers={mapMarkers} selectedId={selectedId} onSelect={selectMarker} onOriginChange={changeOrigin} />

      {error && <p className="renter-flow-error" role="alert">{error}</p>}
      {favoriteError && <p className="renter-flow-error" role="alert">{favoriteError}</p>}
      {loading ? <p className="renter-flow-state" role="status">Loading available spaces…</p>
        : filteredListings.length ? (
          <section className="renter-listing-stack" aria-label="Search results">
            {filteredListings.map((listing) => {
              const distance = origin && listing.latitude !== null && listing.longitude !== null
                ? `${Math.round(distanceKm(origin, [listing.latitude, listing.longitude]) * 1000)} m`
                : undefined;
              return (
                  <div key={listing.id} id={`search-listing-${listing.id}`} className={selectedId === listing.id ? "is-map-selected" : ""} onClick={() => setSelectedId(listing.id)}>
                  <RenterListingCard listing={listing} distance={distance} saved={savedIds.includes(listing.id)} onToggleSaved={toggleSaved} />
                </div>
              );
            })}
          </section>
        ) : !error ? <p className="renter-flow-empty">No spaces match these search filters.</p> : null}

      <RenterBottomNavigation />
    </main>
  );
}
