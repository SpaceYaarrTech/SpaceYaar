"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Check, Mic, Minus, Plus, Search } from "lucide-react";
import { getSelectedRole } from "@/lib/roles/role-storage";
import { searchLocation, type LocationSearchResult } from "@/lib/maps/geocoding";
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
  const [searchQuery, setSearchQuery] = useState("Kanpur");
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult>(defaultLocation);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(["Panki", "Transport Nagar"]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keyword search results, fetched live so the box actually resolves places.
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const hasTypedRef = useRef(false);

  const cityName = useMemo(() => {
    const displayName = selectedLocation.displayName || "Kanpur";
    const firstSegment = displayName.split(",").map((item) => item.trim()).filter(Boolean)[0];
    return firstSegment || "Kanpur";
  }, [selectedLocation.displayName]);

  // Fetch matches as the owner types (debounced, cancellable) so entering a
  // keyword actually resolves places instead of leaving a dead input. Skipped
  // until they type so the initial "Kanpur" value doesn't pop a list open.
  useEffect(() => {
    if (!hasTypedRef.current) return;
    const query = searchQuery.trim();
    if (query.length < 2) {
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

  const selectLocation = (next: LocationSearchResult) => {
    setSelectedLocation(next);
    // A fresh keyword result must not keep stale Kanpur chip selections —
    // they would leak into the confirm payload's area fallback.
    setSelectedAreas([]);
    setShowSuggestions(false);
    setError(null);
  };

  // The famous-area chips are hardcoded Kanpur coordinates — showing them
  // under "Famous Areas in Connaught Place" would be nonsense.
  const showFamousAreas = /kanpur/i.test(selectedLocation.city ?? "")
    || /kanpur/i.test(selectedLocation.displayName ?? "");

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = searchQuery.trim();
    if (!normalized) {
      setError("Location nahi mili. Please try another area.");
      return;
    }

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
      const message = cause instanceof Error && cause.message.includes("timed out")
        ? cause.message
        : "Location nahi mili. Please try another area.";
      setError(message);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleArea = (areaName: string) => {
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
  };

  const confirmLocation = () => {
    const role = getSelectedRole() ?? "renter";
    const payload = {
      role,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      // Prefer the geocoded city — the display-name's first segment is the
      // place itself (e.g. "Connaught Place"), not the city it sits in.
      city: selectedLocation.city || cityName,
      area: selectedLocation.area ?? selectedAreas[0] ?? "Panki",
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
                hasTypedRef.current = true;
                setSearchQuery(event.target.value);
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

        <button type="button" className="confirm-location-button" onClick={confirmLocation}>
          Confirm Location
        </button>
      </div>
    </main>
  );
}
