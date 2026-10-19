"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MAP_CONFIG } from "@/lib/maps/map-config";

export type SearchMapMarker = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
};

export function SearchResultsMap({
  markers,
  selectedId,
  onSelect,
  onOriginChange,
}: {
  markers: SearchMapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOriginChange: (origin: [number, number]) => void;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    const map = L.map(elementRef.current, { center: MAP_CONFIG.defaultCenter, zoom: MAP_CONFIG.defaultZoom, zoomControl: false });
    L.tileLayer(MAP_CONFIG.tileUrl, { maxZoom: 19, attribution: MAP_CONFIG.attribution }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    window.requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const points: L.LatLngExpression[] = [];
    markers.forEach((marker) => {
      if (!Number.isFinite(marker.latitude) || !Number.isFinite(marker.longitude)) return;
      const selected = selectedId === marker.id;
      const icon = L.divIcon({
        className: "renter-map-marker",
        html: `<span class="renter-map-pin${selected ? " is-selected" : ""}"></span>`,
        iconSize: [24, 30],
        iconAnchor: [12, 28],
      });
      L.marker([marker.latitude, marker.longitude], { icon })
        .bindTooltip(marker.title, { direction: "top", offset: [0, -20] })
        .on("click", () => onSelectRef.current(marker.id))
        .addTo(layer);
      points.push([marker.latitude, marker.longitude]);
    });
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 14 });
  }, [markers, selectedId]);

  return (
    <div className="renter-map-wrap">
      <div ref={elementRef} className="renter-results-map" aria-label="Map of available listings" />
      <div className="renter-map-controls" aria-label="Map controls">
        <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus size={17} /></button>
        <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus size={17} /></button>
        <button
          type="button"
          aria-label="Use my current location"
          onClick={() => {
            setLocationError("");
            if (!navigator.geolocation) {
              setLocationError("Location is not available in this browser.");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              ({ coords }) => {
                const origin: [number, number] = [coords.latitude, coords.longitude];
                mapRef.current?.flyTo(origin, 13);
                onOriginChange(origin);
              },
              () => setLocationError("Location permission was denied or unavailable."),
              { enableHighAccuracy: true, timeout: 10000 },
            );
          }}
        ><LocateFixed size={16} /></button>
      </div>
      {locationError && <p className="renter-map-error" role="alert">{locationError}</p>}
      {markers.length === 0 && <p className="renter-map-empty">No listed spaces with map coordinates in these results.</p>}
    </div>
  );
}
