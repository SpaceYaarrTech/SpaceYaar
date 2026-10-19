"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, MapPin, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";

type ListingDetails = {
  id: string;
  title: string;
  description: string;
  property_type: string;
  area_value: number | null;
  area_unit: string | null;
  price_amount: number;
  price_model: string;
  min_booking_days: number;
  city: string;
  state: string;
  pincode: string | null;
  amenities: string[];
  listing_photos: Array<{ image_url: string; label: string; position: number }>;
};

export default function ListingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const [listingResponse, favoritesResponse] = await Promise.all([
          fetch(`/api/listings/${encodeURIComponent(id)}`, { cache: "no-store" }),
          fetch("/api/favorites", { cache: "no-store" }),
        ]);
        const result = await listingResponse.json() as { listing?: ListingDetails; error?: string };
        if (!listingResponse.ok || !result.listing) throw new Error(result.error || "Could not load this space.");
        if (current) setListing(result.listing);
        if (favoritesResponse.ok) {
          const favorites = await favoritesResponse.json() as { favorites?: Array<{ listing_id: string }> };
          if (current) setSaved((favorites.favorites ?? []).some((favorite) => favorite.listing_id === id));
        }
      } catch (cause) {
        if (current) setError(cause instanceof Error ? cause.message : "Could not load this space.");
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    return () => {
      current = false;
    };
  }, [id]);

  const toggleSaved = async () => {
    if (!listing || saving) return;
    setSaving(true);
    setActionError("");
    try {
      const response = await fetch(saved ? `/api/favorites?listingId=${encodeURIComponent(id)}` : "/api/favorites", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        ...(saved ? {} : { body: JSON.stringify({ listingId: id }) }),
      });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update saved spaces.");
      setSaved(Boolean(result.saved));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not update saved spaces.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="renter-flow-page"><p className="renter-flow-state" role="status">Loading space…</p><RenterBottomNavigation /></main>;
  if (error || !listing) return <main className="renter-flow-page"><p className="renter-flow-error" role="alert">{error || "Space not found."}</p><Link className="renter-detail-back" href="/search"><ArrowLeft size={16} />Back to Search</Link><RenterBottomNavigation /></main>;

  const images = [...listing.listing_photos].sort((a, b) => a.position - b.position);
  return (
    <main className="renter-flow-page renter-listing-detail-page">
      <header className="renter-detail-toolbar">
        <button type="button" onClick={() => router.back()} aria-label="Go back"><ArrowLeft size={19} /></button>
        <Link href="/search">Find a Space</Link>
        <button type="button" onClick={() => void toggleSaved()} disabled={saving} aria-label={saved ? "Remove from saved spaces" : "Save this space"} aria-pressed={saved}>
          <Heart size={20} fill={saved ? "currentColor" : "none"} />
        </button>
      </header>
      {images[0] && <div className="renter-detail-image"><Image src={images[0].image_url} alt={images[0].label || listing.title} fill unoptimized sizes="480px" priority /></div>}
      <section className="renter-detail-copy">
        <span className="renter-detail-verified"><ShieldCheck size={14} /> Verified listing</span>
        <h1>{listing.title}</h1>
        <p className="renter-detail-location"><MapPin size={15} /> {[listing.city, listing.state, listing.pincode].filter(Boolean).join(", ")}</p>
        <p className="renter-detail-description">{listing.description || "Contact the owner for more information about this storage space."}</p>
        <div className="renter-detail-stats">
          <span><strong>{listing.area_value ? `${Number(listing.area_value).toLocaleString("en-IN")} ${listing.area_unit || "sq ft"}` : listing.property_type}</strong>Space</span>
          <span><strong>₹{Number(listing.price_amount).toLocaleString("en-IN")}/{listing.price_model.replace(/^Per /, "")}</strong>Rate</span>
          <span><strong>{listing.min_booking_days} days</strong>Minimum stay</span>
        </div>
        {listing.amenities.length > 0 && (
          <div className="renter-detail-amenities">
            <h2>Features</h2>
            <div>{listing.amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}</div>
          </div>
        )}
        {actionError && <p className="renter-flow-error" role="alert">{actionError}</p>}
        <button type="button" className="renter-detail-book" onClick={() => router.push(`/renter?bookListing=${encodeURIComponent(listing.id)}`)}>Request to book</button>
      </section>
      <RenterBottomNavigation />
    </main>
  );
}
