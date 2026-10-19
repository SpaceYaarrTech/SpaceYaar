"use client";

import { Building2, Heart, MapPin, Snowflake } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { RenterListingCard, type RenterListingRecord } from "@/components/renter/RenterListingCard";

type Favorite = {
  listing_id: string;
  created_at: string;
  listings: RenterListingRecord | null;
};

type Collection = {
  id: string;
  title: string;
  icon: typeof MapPin;
  listingIds: string[];
};

function collectionKey(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function SavedPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selectedTab, setSelectedTab] = useState<"collections" | "all">("collections");
  const [selectedCollection, setSelectedCollection] = useState("favorites");
  const [sort, setSort] = useState<"recent" | "price-asc" | "price-desc">("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadFavorites = async (signal?: AbortSignal) => {
    const response = await fetch("/api/favorites", { cache: "no-store", signal });
    const result = await response.json() as { favorites?: Favorite[]; error?: string };
    if (!response.ok) throw new Error(result.error || "Could not load saved spaces.");
    setFavorites(result.favorites ?? []);
  };

  useEffect(() => {
    const controller = new AbortController();
    loadFavorites(controller.signal)
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Could not load saved spaces.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const collections = useMemo<Collection[]>(() => {
    const withListings = favorites.filter((favorite): favorite is Favorite & { listings: RenterListingRecord } => Boolean(favorite.listings));
    const byCity = new Map<string, string[]>();
    const byType = new Map<string, string[]>();
    for (const favorite of withListings) {
      const city = favorite.listings.city.trim();
      if (city) byCity.set(city, [...(byCity.get(city) ?? []), favorite.listing_id]);
      const propertyType = favorite.listings.property_type.trim();
      if (propertyType) byType.set(propertyType, [...(byType.get(propertyType) ?? []), favorite.listing_id]);
    }
    return [
      { id: "favorites", title: "Favorites", icon: Heart, listingIds: withListings.map(({ listing_id }) => listing_id) },
      ...[...byCity.entries()].sort(([first], [second]) => first.localeCompare(second))
        .map(([city, listingIds]) => ({ id: `city:${collectionKey(city)}`, title: city, icon: MapPin, listingIds })),
      ...[...byType.entries()].sort(([first], [second]) => first.localeCompare(second))
        .map(([type, listingIds]) => ({
          id: `type:${collectionKey(type)}`,
          title: type,
          icon: type.toLowerCase().includes("cold") ? Snowflake : Building2,
          listingIds,
        })),
    ];
  }, [favorites]);

  const collection = collections.find(({ id }) => id === selectedCollection) ?? collections[0];
  const visibleFavorites = useMemo(() => {
    let items = favorites.filter((favorite) => favorite.listings);
    if (selectedTab === "collections" && collection) {
      const membership = new Set(collection.listingIds);
      items = items.filter(({ listing_id }) => membership.has(listing_id));
    }
    return items.sort((first, second) => {
      if (sort === "price-asc") return Number(first.listings?.price_amount) - Number(second.listings?.price_amount);
      if (sort === "price-desc") return Number(second.listings?.price_amount) - Number(first.listings?.price_amount);
      return Date.parse(second.created_at) - Date.parse(first.created_at);
    });
  }, [favorites, selectedTab, collection, sort]);

  const unsave = async (listing: RenterListingRecord) => {
    setActionError("");
    try {
      const response = await fetch(`/api/favorites?listingId=${encodeURIComponent(listing.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not remove this saved space.");
      setFavorites((current) => current.filter(({ listing_id }) => listing_id !== listing.id));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not remove this saved space.");
    }
  };

  return (
    <main className="renter-flow-page renter-saved-page">
      <header className="renter-page-header"><h1>Saved Spaces</h1></header>
      <div className="renter-segmented-control" role="tablist" aria-label="Saved spaces view">
        <button type="button" role="tab" aria-selected={selectedTab === "collections"} className={selectedTab === "collections" ? "is-active" : ""} onClick={() => setSelectedTab("collections")}>Collection</button>
        <button type="button" role="tab" aria-selected={selectedTab === "all"} className={selectedTab === "all" ? "is-active" : ""} onClick={() => setSelectedTab("all")}>All Saved</button>
      </div>

      {selectedTab === "collections" && (
        <section className="renter-collections-section">
          <div className="renter-section-heading"><h2>My Collections</h2></div>
          {collections.length > 1 ? (
            <div className="renter-collection-grid">
              {collections.map(({ id, title, icon: Icon, listingIds }) => (
                <button
                  type="button"
                  key={id}
                  className={`renter-collection-card${selectedCollection === id ? " is-selected" : ""}`}
                  aria-pressed={selectedCollection === id}
                  onClick={() => setSelectedCollection(id)}
                >
                  <Icon size={20} fill={id === "favorites" ? "none" : undefined} />
                  <strong>{title}</strong>
                  <span>{listingIds.length} {listingIds.length === 1 ? "Space" : "Spaces"}</span>
                </button>
              ))}
            </div>
          ) : !loading && !error ? (
            <p className="renter-flow-empty renter-collection-empty">Saved spaces are grouped by location and space type as you add them.</p>
          ) : null}
        </section>
      )}

      <section className="renter-saved-list-section">
        <div className="renter-section-heading renter-saved-list-heading">
          <h2>{selectedTab === "all" ? "All Saved" : selectedCollection === "favorites" ? "Recently Saved" : collection?.title ?? "Saved Spaces"}</h2>
          <label className="renter-sort-control"><span>Sort:</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort saved spaces">
              <option value="recent">Recently Saved</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </label>
        </div>
        {loading ? <p className="renter-flow-state" role="status">Loading saved spaces…</p>
          : error ? <p className="renter-flow-error" role="alert">{error}</p>
            : actionError ? <p className="renter-flow-error" role="alert">{actionError}</p>
              : visibleFavorites.length ? (
                <div className="renter-listing-stack">
                  {visibleFavorites.map((favorite) => favorite.listings && (
                    <RenterListingCard key={favorite.listing_id} listing={favorite.listings} saved onToggleSaved={unsave} />
                  ))}
                </div>
              ) : <p className="renter-flow-empty">{selectedTab === "all" ? "You have no saved spaces yet." : "This collection has no saved spaces."}</p>}
      </section>
      <RenterBottomNavigation />
    </main>
  );
}
