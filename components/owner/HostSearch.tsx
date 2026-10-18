"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Factory,
  Filter,
  Heart,
  MapPin,
  Search,
  Snowflake,
  Warehouse,
  Wind,
  type LucideIcon,
  Zap,
} from "lucide-react";
import { LISTINGS } from "@/data/listings";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import {
  DEFAULT_SEARCH_FILTERS,
  FILTER_OPTIONS,
  makeSearchHref,
  readSearchFilters,
  type FilterGroup,
  type SearchFilters,
  writeSearchParams,
} from "@/lib/owner/search-filters";

const PREVIEW_FAVORITES_KEY = "spaceyaar:host-preview-favorites";

type SearchListing = {
  id: string;
  title: string;
  description: string;
  property_type: string;
  area_value: number | null;
  area_unit: string | null;
  price_amount: number;
  price_model: string;
  city: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  image: string;
  distance_label: string;
  badge_label?: string;
  isDemo?: boolean;
};

const CATEGORIES: { label: string; type: string; icon: LucideIcon }[] = [
  { label: "Cold Storage", type: "cold-storage", icon: Snowflake },
  { label: "Warehouse", type: "warehouse", icon: Warehouse },
  { label: "Mini Storage", type: "retail-storage", icon: Factory },
  { label: "Climate Control", type: "climate-control", icon: Wind },
];

function previewListings(): SearchListing[] {
  return LISTINGS.map((listing) => {
    const amount = Number(listing.pricePerDay.replace(/[^\d.]/g, "")) || 0;
    const areaMatch = listing.area.match(/[\d,.]+/);
    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      property_type: listing.feature.toLowerCase().includes("climate") ? "climate-control" : "warehouse",
      area_value: areaMatch ? Number(areaMatch[0].replace(/,/g, "")) : null,
      area_unit: "Sq. Ft",
      price_amount: amount,
      price_model: "Per Day",
      city: "Kanpur",
      pincode: null,
      latitude: null,
      longitude: null,
      amenities: [listing.feature],
      image: listing.image,
      distance_label: listing.distance,
      badge_label: listing.badge.label,
      isDemo: true,
    };
  });
}

function listingFromApi(listing: Omit<SearchListing, "image" | "isDemo" | "distance_label"> & {
  listing_photos: Array<{ image_url: string; position: number }>;
}): SearchListing {
  return {
    ...listing,
    image: [...listing.listing_photos].sort((a, b) => a.position - b.position)[0]?.image_url || "",
    distance_label: "",
    isDemo: false,
  };
}

function readFavoriteIds() {
  try {
    const value = window.localStorage.getItem(PREVIEW_FAVORITES_KEY);
    return value ? JSON.parse(value) as string[] : [];
  } catch {
    return [];
  }
}

function toggleSelected(current: string[], value: string) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function HostSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState(DEFAULT_SEARCH_FILTERS.location);
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteError, setFavoriteError] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const filters = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    const parsed = readSearchFilters(params);
    if (!params.has("location")) parsed.location = location;
    return parsed;
  }, [location, searchParams]);
  const showAll = searchParams.get("all") === "1";

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem("spaceyaar-selected-location");
      if (stored) {
        const saved = JSON.parse(stored) as { area?: string; city?: string; displayName?: string; latitude?: number; longitude?: number };
        setLocation([saved.area, saved.city].filter(Boolean).join(", ") || saved.displayName || DEFAULT_SEARCH_FILTERS.location);
        if (Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude)) {
          setOrigin([saved.latitude as number, saved.longitude as number]);
        }
      }
    } catch {
      setLocation(DEFAULT_SEARCH_FILTERS.location);
    }
  }, []);

  useEffect(() => {
    let current = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/listings?limit=50", { cache: "no-store" });
        const result = await response.json() as {
          listings?: Array<Omit<SearchListing, "image" | "isDemo" | "distance_label"> & { listing_photos: Array<{ image_url: string; position: number }> }>;
          error?: string;
        };
        if (!response.ok) {
          if (isAuthBypassEnabled() && result.error === "Backend is not configured yet.") {
            if (current) {
              setListings(previewListings());
              setFavorites(readFavoriteIds());
              setIsPreview(true);
            }
            return;
          }
          throw new Error(result.error || "Could not load spaces.");
        }
        if (current) {
          setListings((result.listings ?? []).map(listingFromApi));
          setIsPreview(false);
          const favoritesResponse = await fetch("/api/favorites", { cache: "no-store" });
          if (favoritesResponse.ok) {
            const favoritesResult = await favoritesResponse.json() as { favorites?: Array<{ listing_id: string }> };
            setFavorites((favoritesResult.favorites ?? []).map((favorite) => favorite.listing_id));
          }
        }
      } catch (cause) {
        if (current) setError(cause instanceof Error ? cause.message : "Could not load spaces.");
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    return () => {
      current = false;
    };
  }, []);

  const filteredListings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedAmenities = [...filters.security, ...filters.utilities, ...filters.logistics];
    return listings.filter((listing) => {
      const searchable = [
        listing.title,
        listing.city,
        listing.pincode || "",
        listing.property_type,
        listing.area_value === null ? "" : String(listing.area_value),
        listing.area_unit || "",
        listing.description,
        ...listing.amenities,
      ].join(" ").toLowerCase();
      const numericArea = listing.area_value === null ? 0 : Number(listing.area_value);
      const areaUnit = listing.area_unit?.toLowerCase() || "";
      const areaInSqFt = areaUnit.includes("meter") ? numericArea * 10.7639
        : areaUnit.includes("gaj") ? numericArea * 9
          : areaUnit.includes("inch") ? numericArea / 144
            : areaUnit.includes("cm") ? numericArea / (30.48 ** 2) : numericArea;
      const pricePerDay = listing.price_model === "Per Week" ? listing.price_amount / 7
        : listing.price_model === "Per Month" ? listing.price_amount / 30 : listing.price_amount;
      const typeMatch = !filters.spaceType || listing.property_type.toLowerCase() === filters.spaceType.toLowerCase();
      const locationTerms = filters.location.split(",").map((term) => term.trim().toLowerCase()).filter(Boolean);
      const locationMatch = !locationTerms.length || locationTerms.some((term) =>
        listing.city.toLowerCase().includes(term) || (listing.pincode || "").toLowerCase().includes(term),
      );
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && typeMatch
        && locationMatch
        && (!areaInSqFt || filters.maxArea >= 50_000 || areaInSqFt <= filters.maxArea)
        && (filters.budget >= 50_000 || pricePerDay <= filters.budget)
        && selectedAmenities.every((amenity) =>
          listing.amenities.some((value) => value.toLowerCase().includes(amenity.toLowerCase()) || amenity.toLowerCase().includes(value.toLowerCase())),
        );
    });
  }, [filters, listings, query]);

  const displayedListings = showAll ? filteredListings : filteredListings.slice(0, 3);

  const updateQuery = (value: string) => {
    setQuery(value);
    const params = writeSearchParams(new URLSearchParams(searchParams.toString()), filters, value);
    if (showAll) params.set("all", "1");
    const queryString = params.toString();
    window.history.replaceState(null, "", `/owner/spaces${queryString ? `?${queryString}` : ""}`);
  };

  const toggleFavorite = async (listing: SearchListing) => {
    setFavoriteError("");
    if (isPreview || listing.isDemo) {
      const next = toggleSelected(favorites, listing.id);
      setFavorites(next);
      window.localStorage.setItem(PREVIEW_FAVORITES_KEY, JSON.stringify(next));
      return;
    }
    const isSaved = favorites.includes(listing.id);
    try {
      const response = await fetch(isSaved ? `/api/favorites?listingId=${encodeURIComponent(listing.id)}` : "/api/favorites", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        ...(isSaved ? {} : { body: JSON.stringify({ listingId: listing.id }) }),
      });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Sign in to save this space.");
      setFavorites((current) => toggleSelected(current, listing.id));
    } catch (cause) {
      setFavoriteError(cause instanceof Error ? cause.message : "Could not update saved spaces.");
    }
  };

  const filterParams = new URLSearchParams(searchParams.toString());
  if (!filterParams.has("location")) filterParams.set("location", location);
  const filterHref = `/owner/filters?${filterParams.toString()}`;
  const locationLabel = searchParams.has("location") ? filters.location || "All locations" : location;
  const getDistanceLabel = (listing: SearchListing) => {
    if (listing.distance_label) return listing.distance_label;
    if (origin && listing.latitude !== null && listing.longitude !== null) {
      const radians = (degrees: number) => degrees * Math.PI / 180;
      const [latitude, longitude] = origin.map(radians);
      const targetLatitude = radians(listing.latitude);
      const targetLongitude = radians(listing.longitude);
      const latitudeDelta = targetLatitude - latitude;
      const longitudeDelta = targetLongitude - longitude;
      const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(latitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;
      const distance = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
      return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    }
    return listing.city;
  };

  return (
    <div className="host-search-page">
      <header className="host-search-header">
        <div>
          <h1>Saved Spaces</h1>
          <button className="host-location-link" type="button" onClick={() => {
            window.sessionStorage.setItem("spaceyaar-location-return-to", `/owner/spaces${window.location.search}`);
            router.push("/location");
          }}>
            <MapPin size={13} fill="currentColor" />{locationLabel}
          </button>
        </div>
        <Link href="/owner/my-spaces" className="host-my-spaces-link">My Spaces</Link>
      </header>

      <label className="host-search-input">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search location size area pincode .etc"
          aria-label="Search spaces by name, location, area or feature"
        />
        <Link href={filterHref} className="host-filter-button" aria-label="Open filters"><Filter size={19} /></Link>
      </label>

      {isPreview && <p className="host-preview-notice" role="note">Preview spaces are sample listings stored with the app; production results come from published listings.</p>}
      {favoriteError && <p className="host-state-error" role="alert">{favoriteError}</p>}

      <section className="host-search-section">
        <div className="host-search-section-heading">
          <h2>{showAll ? "Recommended Spaces" : "Recommended for You"}</h2>
          {!showAll && <Link href={makeSearchHref(filters, query, true)}>See All <span aria-hidden="true">→</span></Link>}
        </div>
        {loading ? <p className="host-state-message" role="status">Loading spaces…</p>
          : error ? <p className="host-state-error" role="alert">{error}</p>
            : displayedListings.length ? (
              <div className="host-search-list">
                {displayedListings.map((listing) => {
                  const saved = favorites.includes(listing.id);
                  return (
                    <article className="host-search-card" key={listing.id}>
                      <Link href={`/owner/spaces/${encodeURIComponent(listing.id)}`} className="host-search-image" aria-label={`Open ${listing.title}`}>
                        {listing.image
                          ? <Image src={listing.image} alt="" fill unoptimized sizes="130px" />
                          : <span className="host-search-image-fallback"><Warehouse size={26} /></span>}
                      </Link>
                      <div className="host-search-card-copy">
                        <div className="host-search-card-top">
                          <span className="host-instant-badge"><Zap size={10} fill="currentColor" />{listing.isDemo ? listing.badge_label : "Live"}</span>
                          <button type="button" className={`host-favorite-button${saved ? " is-saved" : ""}`} aria-label={saved ? `Remove ${listing.title} from saved spaces` : `Save ${listing.title}`} aria-pressed={saved} onClick={() => void toggleFavorite(listing)}>
                            <Heart size={18} fill={saved ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <Link href={`/owner/spaces/${encodeURIComponent(listing.id)}`} className="host-search-title">{listing.title}</Link>
                        <p className="host-search-meta">{getDistanceLabel(listing)} · {listing.area_value ? `${Number(listing.area_value).toLocaleString("en-IN")} ${listing.area_unit || "Sq. Ft"} Area` : listing.property_type} · {listing.amenities[0] || "Space available"}</p>
                        <p className="host-search-price">₹{Number(listing.price_amount).toLocaleString("en-IN")}<span>/{listing.price_model.replace("Per ", "")}</span></p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <div className="host-empty-state"><Warehouse size={26} /><p>No spaces match your search.</p><button type="button" onClick={() => updateQuery("")}>Clear search</button></div>}
      </section>

      {!showAll && (
        <section className="host-search-section host-category-section">
          <div className="host-search-section-heading"><h2>Browse by Category</h2></div>
          <div className="host-category-grid">
            {CATEGORIES.map(({ label, type, icon: Icon }) => {
              const params = writeSearchParams(new URLSearchParams(searchParams.toString()), { ...filters, spaceType: type }, query);
              params.delete("all");
              return (
                <Link href={`/owner/spaces?${params.toString()}`} className="host-category-card" key={type}>
                  <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function RangeFilter({
  label,
  value,
  onChange,
  minimum,
  maximum,
  id,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  minimum: string;
  maximum: string;
  id: string;
}) {
  return (
    <div className="host-filter-section host-range-filter">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="range" min={0} max={50_000} step={500} value={value} style={{ "--range-progress": `${value / 500}%` } as CSSProperties} onChange={(event) => onChange(Number(event.target.value))} />
      <div><span>{minimum}</span><span>{maximum}</span></div>
    </div>
  );
}

function toggleGroup<T extends FilterGroup>(filters: SearchFilters, group: T, value: string): SearchFilters {
  return { ...filters, [group]: toggleSelected(filters[group], value) };
}

export function HostFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>(() => readSearchFilters(new URLSearchParams(searchParams.toString())));
  const query = searchParams.get("q") || "";
  const showAll = searchParams.get("all") === "1";

  useEffect(() => {
    setFilters(readSearchFilters(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  const reset = () => setFilters({ ...DEFAULT_SEARCH_FILTERS, security: [], utilities: [], logistics: [] });
  const apply = () => router.replace(makeSearchHref(filters, query, showAll));

  return (
    <main className="host-filters-page">
      <header className="host-filters-topbar">
        <button type="button" aria-label="Back to search" onClick={() => router.back()}><ChevronLeft size={22} /></button>
        <button className="host-filter-reset" type="button" onClick={reset}>Reset All</button>
      </header>
      <h1>Filters</h1>
      <label className="host-filter-location">
        <MapPin size={17} />
        <input aria-label="Filter by location" value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} />
      </label>
      <section className="host-filter-section">
        <h2>Space Type</h2>
        <div className="host-space-type-grid">
          {[
            ["cold-storage", "Cold Storage", Snowflake],
            ["warehouse", "Warehouse", Warehouse],
            ["industrial", "Industrial/Factory", Factory],
            ["climate-control", "Climate Control", Wind],
            ["retail-storage", "Retail Storage", Warehouse],
            ["logistic-hub", "Logistic Hub", Factory],
          ].map(([type, label, Icon]) => {
            const SpaceIcon = Icon as LucideIcon;
            const selected = filters.spaceType === type;
            return (
              <button type="button" key={type as string} className={selected ? "host-space-type-card is-selected" : "host-space-type-card"} aria-pressed={selected} onClick={() => setFilters((current) => ({ ...current, spaceType: selected ? "" : type as string }))}>
                <SpaceIcon size={24} strokeWidth={1.7} />
                <span>{label as string}</span>
              </button>
            );
          })}
        </div>
      </section>
      <RangeFilter label="Area in (Sq. Ft)" id="host-area-range" value={filters.maxArea} onChange={(maxArea) => setFilters((current) => ({ ...current, maxArea }))} minimum="0" maximum="50,000+" />
      <RangeFilter label="Budget Per Day" id="host-budget-range" value={filters.budget} onChange={(budget) => setFilters((current) => ({ ...current, budget }))} minimum="₹0" maximum="₹50,000+" />

      {(Object.entries(FILTER_OPTIONS) as [FilterGroup, readonly string[]][]).map(([group, options]) => (
        <section className="host-filter-section host-chip-filter" key={group}>
          <h2>{group[0].toUpperCase() + group.slice(1)}</h2>
          <div>
            {options.map((option) => {
              const selected = filters[group].includes(option);
              return (
                <button key={option} type="button" className={selected ? "host-filter-chip is-selected" : "host-filter-chip"} aria-pressed={selected} onClick={() => setFilters((current) => toggleGroup(current, group, option))}>
                  {selected && <Check size={12} />}{option}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <footer className="host-filter-footer"><button type="button" onClick={apply}>Apply</button></footer>
    </main>
  );
}

export function HostSpaceDetails() {
  const params = useParams<{ id: string }>();
  return <HostPublicSpaceDetails id={params.id} />;
}

function HostPublicSpaceDetails({ id }: { id: string }) {
  const router = useRouter();
  const [listing, setListing] = useState<SearchListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const response = await fetch(`/api/listings/${encodeURIComponent(id)}`, { cache: "no-store" });
        const result = await response.json() as {
          listing?: Omit<SearchListing, "image" | "isDemo" | "distance_label"> & { listing_photos: Array<{ image_url: string; position: number }> };
          error?: string;
        };
        if (response.ok && result.listing) {
          if (current) setListing(listingFromApi(result.listing));
          return;
        }
        if (isAuthBypassEnabled()) {
          const demo = previewListings().find((space) => space.id === id);
          if (demo) {
            if (current) setListing(demo);
            return;
          }
        }
        throw new Error(result.error || "Could not load this space.");
      } catch (cause) {
        if (current) setError(cause instanceof Error ? cause.message : "Could not load this space.");
      } finally {
        if (current) setLoading(false);
      }
    }
    if (id) void load();
    else setLoading(false);
    return () => {
      current = false;
    };
  }, [id]);

  return (
    <div className="host-page-section">
      <button type="button" className="host-back-link" onClick={() => router.back()}><ArrowLeft size={16} /> Back to Spaces</button>
      {loading ? <p className="host-state-message" role="status">Loading space…</p>
        : error ? <p className="host-state-error" role="alert">{error}</p>
          : listing && (
            <article className="host-public-space">
              {listing.image && <div className="host-public-space-image"><Image src={listing.image} alt="" fill unoptimized sizes="480px" /></div>}
              {listing.isDemo && <p className="host-preview-notice">Sample space for local UI preview.</p>}
              <h1>{listing.title}</h1>
              <p>{listing.description}</p>
              <div className="host-listing-chips"><span><MapPin size={12} />{listing.city}</span><span>{listing.property_type}</span>{listing.area_value && <span>{listing.area_value} {listing.area_unit}</span>}</div>
              <p className="host-public-space-price">₹{listing.price_amount.toLocaleString("en-IN")}<span>/{listing.price_model.replace("Per ", "")}</span></p>
              <p>{listing.amenities.join(" · ")}</p>
            </article>
          )}
    </div>
  );
}
