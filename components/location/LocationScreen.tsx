"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Check, Crosshair, Mic, Minus, Plus, Search } from "lucide-react";
import { getSelectedRole } from "@/lib/roles/role-storage";
import { searchLocation, type LocationSearchResult } from "@/lib/maps/geocoding";
import {
  detectCurrentLocation,
  locationLabelOf,
  readStoredLocation,
} from "@/lib/maps/current-location";
import { MAP_CONFIG } from "@/lib/maps/map-config";

const LocationMap = dynamic(() => import("@/components/location/LocationMap"), { ssr: false });

type AreaItem = {
  name: string;
  lat: number;
  lng: number;
};

const famousAreas: AreaItem[] = [
  { name: "Panki", lat: 26.5167, lng: 80.2677 },
  { name: "Dada nagar", lat: 26.4581, lng: 80.3617 },
  { name: "Transport Nagar", lat: 26.4709, lng: 80.3268 },
  { name: "Rama Devi", lat: 26.4571, lng: 80.3171 },
  { name: "FazalGanj", lat: 26.4634, lng: 80.3256 },
  { name: "Govind Nagar", lat: 26.4858, lng: 80.3269 },
  { name: "Kidwai Nagar", lat: 26.4318, lng: 80.3002 },
  { name: "P. Road", lat: 26.4506, lng: 80.3512 },
];

const defaultLocation: LocationSearchResult = {
  latitude: MAP_CONFIG.defaultCenter[0],
  longitude: MAP_CONFIG.defaultCenter[1],
  displayName: "Kanpur, Uttar Pradesh, India",
  city: "Kanpur",
  area: "Panki",
};

export function LocationScreen() {
  const router = useRouter();
  const mapApiRef = useRef<L.Map | null>(null);
  // Starts empty — the screen never assumes a city. A saved choice paints in
  // instantly on mount; otherwise (and always, as a refinement) the browser
  // is asked for the device location.
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult>(defaultLocation);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keyword search results, fetched live so the box actually resolves places.
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Detection feedback — "Detecting…" while asking, then only a hint when
  // there is nothing to show (no saved location either).
  const [detecting, setDetecting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  // Confirm stays disabled until a real place was chosen (detected, restored
  // or picked) — nothing Kanpur-ish can be silently confirmed.
  const [hasSelection, setHasSelection] = useState(false);
  // True once the user drives the screen (typed, picked, tapped a chip);
  // a late geolocation result must not stomp on their in-progress choice.
  const interactedRef = useRef(false);
  const detectSeqRef = useRef(0);

  const cityName = useMemo(() => {
    const displayName = selectedLocation.displayName || "Kanpur";
    const firstSegment = displayName.split(",").map((item) => item.trim()).filter(Boolean)[0];
    return firstSegment || "Kanpur";
  }, [selectedLocation.displayName]);

  // Fetch matches as the user types (debounced, cancellable) so entering a
  // keyword actually resolves places instead of leaving a dead input. Skipped
  // until they interact so a programmatic detection fill doesn't pop a list —
  // and clearing the box closes any open list.
  useEffect(() => {
    const query = searchQuery.trim();
    if (!interactedRef.current || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchLocation(query, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return;
          setSuggestions(results);
          setShowSuggestions(true);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        });
    }, 700);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  /** Paints a location as the active choice (detection / restore / submit). */
  const applySelection = useCallback((next: LocationSearchResult) => {
    setSelectedLocation(next);
    setSelectedAreas([]);
    setSearchQuery(locationLabelOf(next));
    setHasSelection(true);
    setError(null);
    setShowSuggestions(false);
  }, []);

  /** A manual action invalidates any in-flight detection. */
  const cancelDetection = useCallback(() => {
    detectSeqRef.current += 1;
    setDetecting(false);
    setHint(null);
  }, []);

  // Asks the browser for the device location (permission prompt appears the
  // first time) and reverse-geocodes the fix. `explicit` marks a deliberate
  // tap (the "Use current location" row / Search on an empty box) — those
  // always explain a failure; an automatic attempt only nags when there is
  // nothing to show at all.
  const detectLocation = useCallback((options?: { explicit?: boolean }) => {
    const token = detectSeqRef.current + 1;
    detectSeqRef.current = token;
    const isStale = () => detectSeqRef.current !== token;
    interactedRef.current = false;
    setDetecting(true);
    setHint(null);
    setShowSuggestions(false);

    void detectCurrentLocation().then((outcome) => {
      if (isStale()) return;
      setDetecting(false);

      if (outcome.status === "located") {
        // A user who already started searching/picking keeps their choice.
        if (!interactedRef.current) applySelection(outcome.location);
        return;
      }

      if (options?.explicit || (!interactedRef.current && !readStoredLocation())) {
        setHint(outcome.status === "denied"
          ? "Location access is off — allow it in your browser, or search your area."
          : "Couldn't detect your location — search your area instead.");
      }
    });
  }, [applySelection]);

  // Mount: a saved choice paints in as-is — address pickers (Swiggy, Zomato,
  // Amazon, Google place search) show the selected address rather than
  // silently jumping to the device position; detection stays one tap away
  // via "Use current location". With nothing saved, locate immediately —
  // that first visit is where the permission prompt belongs.
  useEffect(() => {
    const stored = readStoredLocation();
    if (stored) {
      applySelection(stored);
      return;
    }
    detectLocation();
  }, [applySelection, detectLocation]);

  const selectLocation = (next: LocationSearchResult) => {
    interactedRef.current = true;
    cancelDetection();
    setSelectedLocation(next);
    // A fresh keyword result must not keep stale chip selections —
    // they would leak into the confirm payload's area fallback.
    setSelectedAreas([]);
    setShowSuggestions(false);
    setError(null);
    setHasSelection(true);
  };

  // The famous-area chips are hardcoded Kanpur coordinates — showing them
  // under "Famous Areas in Connaught Place" would be nonsense.
  const showFamousAreas = /kanpur/i.test(selectedLocation.city ?? "")
    || /kanpur/i.test(selectedLocation.displayName ?? "");

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = searchQuery.trim();
    if (!normalized) {
      // An empty box means "locate me" — re-run detection instead of erroring.
      detectLocation({ explicit: true });
      return;
    }

    interactedRef.current = true;
    cancelDetection();
    setIsSearching(true);
    setError(null);

    try {
      const results = await searchLocation(normalized);
      if (!results.length) {
        throw new Error("not found");
      }
      setSuggestions(results);
      setShowSuggestions(true);
      // One unambiguous match applies immediately; multiple matches are left
      // open for the owner to pick from the list.
      if (results.length === 1) {
        selectLocation(results[0]);
      }
    } catch (cause) {
      // System failures ("Location search timed out/busy…") pass through
      // verbatim; only a genuine no-match gets the friendly message.
      const message = cause instanceof Error && cause.message.startsWith("Location search")
        ? cause.message
        : "Location nahi mili. Please try another area.";
      setError(message);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleArea = (areaName: string) => {
    interactedRef.current = true;
    cancelDetection();
    const nextSelected = selectedAreas.includes(areaName)
      ? selectedAreas.filter((item) => item !== areaName)
      : [...selectedAreas, areaName];

    setSelectedAreas(nextSelected);

    const matchedArea = famousAreas.find((area) => area.name === areaName);
    if (!matchedArea) return;

    // Keep the city stable across chip taps — deriving it from the first
    // display-name segment would turn "Panki" into the city after one tap.
    const city = selectedLocation.city || cityName;
    const nextLocation: LocationSearchResult = {
      latitude: matchedArea.lat,
      longitude: matchedArea.lng,
      displayName: `${matchedArea.name}, ${city}, Uttar Pradesh, India`,
      city,
      area: matchedArea.name,
    };

    setSelectedLocation(nextLocation);
    setHasSelection(true);
  };

  const confirmLocation = () => {
    if (!hasSelection) return;
    const role = getSelectedRole() ?? "renter";
    // Last-resort area fallback: the picked place's own name — never a
    // hardcoded city (the previous "Panki" fallback leaked Kanpur).
    const firstSegment = selectedLocation.displayName.split(",").map((item) => item.trim()).filter(Boolean)[0] ?? "";
    const payload = {
      role,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      // Prefer the geocoded city — the display-name's first segment is the
      // place itself (e.g. "Connaught Place"), not the city it sits in.
      city: selectedLocation.city || cityName,
      area: selectedLocation.area ?? selectedAreas[0] ?? firstSegment,
      displayName: selectedLocation.displayName,
    };

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("spaceyaar-selected-location", JSON.stringify(payload));
    }

    router.push("/location/confirm");
  };

  return (
    <main className="location-page" aria-label="Location selection screen">
      <div className="location-page-inner">
        <h1 className="location-page-title">Aap kaha Jagah Dhudhne hain ?</h1>

        <div className="location-search-wrap">
          <form className="location-search" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="location-search">Search your area</label>
            <Search className="search-icon" size={20} />
            <input
              id="location-search"
              aria-label="Search your area"
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                interactedRef.current = value.trim().length > 0;
                // Typing takes over — a late geolocation fix must not stomp.
                if (interactedRef.current) cancelDetection();
                setSearchQuery(value);
              }}
              onBlur={(event) => {
                // Only close when focus actually leaves the search widget —
                // tapping Search or a suggestion must not race the list shut.
                const next = event.relatedTarget as Node | null;
                const wrap = event.currentTarget.closest(".location-search-wrap");
                if (next && wrap?.contains(next)) return;
                window.setTimeout(() => setShowSuggestions(false), 150);
              }}
              placeholder="Search your area"
            />
            <button type="button" className="voice-button" aria-label="Voice search">
              <Mic size={18} />
            </button>
            <button type="submit" className="search-submit" aria-label="Search location" disabled={isSearching}>
              {isSearching ? "..." : "Search"}
            </button>
          </form>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="location-suggestions" role="listbox" aria-label="Matching locations">
              {suggestions.map((item) => (
                <li key={`${item.latitude},${item.longitude}`}>
                  <button
                    type="button"
                    className="location-suggestion"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectLocation(item)}
                  >
                    <span>{item.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* The persistent affordance every major picker has: current location
            on demand, one tap away, whether or not detection already ran. */}
        <button
          type="button"
          className="use-current-location"
          onClick={() => detectLocation({ explicit: true })}
          disabled={detecting}
        >
          <Crosshair size={16} strokeWidth={2.2} aria-hidden="true" />
          <span>Use current location</span>
        </button>

        {detecting && <p className="location-hint" role="status">Detecting your location…</p>}
        {!detecting && hint && <p className="location-hint" role="status">{hint}</p>}
        {error && <p className="location-error" role="alert">{error}</p>}

        <div className="map-container">
          <LocationMap
            center={[MAP_CONFIG.defaultCenter[0], MAP_CONFIG.defaultCenter[1]]}
            selectedLocation={selectedLocation}
            onMapReady={(map) => {
              mapApiRef.current = map;
              map.invalidateSize();
            }}
          />

          <div className="map-zoom-controls" aria-label="Map controls">
            <button type="button" aria-label="Zoom in" onClick={() => mapApiRef.current?.zoomIn()}>
              <Plus size={22} />
            </button>
            <div className="map-zoom-divider" />
            <button type="button" aria-label="Zoom out" onClick={() => mapApiRef.current?.zoomOut()}>
              <Minus size={22} />
            </button>
          </div>
        </div>

        {showFamousAreas && (
          <div className="famous-area-block">
            <h2 className="famous-areas-title">Famous Areas in {selectedLocation.city || cityName}</h2>
            <div className="chip-grid">
              {famousAreas.map((area) => {
                const isSelected = selectedAreas.includes(area.name);
                return (
                  <button
                    key={area.name}
                    type="button"
                    className={isSelected ? "area-chip selected" : "area-chip"}
                    aria-pressed={isSelected}
                    onClick={() => toggleArea(area.name)}
                  >
                    {isSelected && <Check size={14} className="chip-check" />}
                    <span>{area.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          className="confirm-location-button"
          onClick={confirmLocation}
          disabled={!hasSelection}
        >
          Confirm Location
        </button>
      </div>
    </main>
  );
}
