"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_CONFIG } from "@/lib/maps/map-config";
import type { LocationSearchResult } from "@/lib/maps/geocoding";

type LocationMapProps = {
  center: [number, number];
  selectedLocation: LocationSearchResult;
  onMapReady?: (map: L.Map) => void;
  /** Fired when the owner drags the pin to a new entrance position. */
  onMarkerDragEnd?: (latitude: number, longitude: number) => void;
};

export default function LocationMap({ center, selectedLocation, onMapReady, onMarkerDragEnd }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const initialCenterRef = useRef(center);
  const onMapReadyRef = useRef(onMapReady);
  const onMarkerDragEndRef = useRef(onMarkerDragEnd);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    onMarkerDragEndRef.current = onMarkerDragEnd;
  }, [onMarkerDragEnd]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: initialCenterRef.current,
      zoom: MAP_CONFIG.defaultZoom,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    L.tileLayer(MAP_CONFIG.tileUrl, {
      maxZoom: 19,
      attribution: MAP_CONFIG.attribution,
    }).addTo(map);

    map.attributionControl.setPosition("bottomright");
    mapRef.current = map;
    onMapReadyRef.current?.(map);

    window.requestAnimationFrame(() => {
      map.invalidateSize();
    });

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const target: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];
    mapRef.current.flyTo(target, 12, { duration: 0.6 });
    mapRef.current.invalidateSize();

    if (!markerRef.current) {
      const icon = L.divIcon({
        className: "custom-map-marker",
        html: '<span class="map-marker-pin"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker(target, { icon, draggable: true }).addTo(mapRef.current);
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onMarkerDragEndRef.current?.(position.lat, position.lng);
      });
      markerRef.current = marker;
      return;
    }

    markerRef.current.setLatLng(target);
  }, [selectedLocation]);

  return <div ref={containerRef} className="leaflet-map" aria-label="Map for location selection" />;
}
