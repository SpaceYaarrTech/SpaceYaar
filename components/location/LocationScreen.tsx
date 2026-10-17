"use client";

import { useMemo, useRef, useState } from "react";
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

  const cityName = useMemo(() => {
    const displayName = selectedLocation.displayName || "Kanpur";
    const firstSegment = displayName.split(",").map((item) => item.trim()).filter(Boolean)[0];
    return firstSegment || "Kanpur";
  }, [selectedLocation.displayName]);

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

      const nextLocation = results[0];
      setSelectedLocation(nextLocation);
    } catch {
      setError("Location nahi mili. Please try another area.");
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

    const nextLocation: LocationSearchResult = {
      latitude: matchedArea.lat,
      longitude: matchedArea.lng,
      displayName: `${matchedArea.name}, ${cityName}, Uttar Pradesh, India`,
      city: cityName,
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
      city: cityName,
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
        <div className="status-row" aria-hidden="true">
          <span className="status-time">9:30</span>
          <div className="status-icons">
            <svg viewBox="0 0 24 24"><path d="M3 15.5h1.5l1.8-3 2.2 5 2-4.5 1.5 2.5H21" /></svg>
            <svg viewBox="0 0 24 24"><path d="M2 10.5h17.5v7.5H2z" /><path d="M20.5 13h1.5v5h-1.5" /></svg>
            <span className="battery-level" />
          </div>
        </div>

        <h1 className="location-page-title">Aap kaha Jagah Dhudhne hain ?</h1>

        <form className="location-search" onSubmit={handleSearch}>
          <label className="sr-only" htmlFor="location-search">Search your area</label>
          <Search className="search-icon" size={20} />
          <input
            id="location-search"
            aria-label="Search your area"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search your area"
          />
          <button type="button" className="voice-button" aria-label="Voice search">
            <Mic size={18} />
          </button>
          <button type="submit" className="search-submit" aria-label="Search location" disabled={isSearching}>
            {isSearching ? "..." : "Search"}
          </button>
        </form>

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

        <div className="famous-area-block">
          <h2 className="famous-areas-title">Famous Areas in {cityName}</h2>
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

        <button type="button" className="confirm-location-button" onClick={confirmLocation}>
          Confirm Location
        </button>
      </div>
    </main>
  );
}
