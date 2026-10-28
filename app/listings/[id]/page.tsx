"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, MapPin, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginGateModal } from "@/components/auth/LoginGateModal";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { isGuestLoginRequired } from "@/lib/auth/guest-session";

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
  listing_photos: Array<{ image_url: string; label: string; position: number; media_type?: string }>;
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
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [loginGate, setLoginGate] = useState<{ nextPath: string } | null>(null);

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
        if (current) {
          setListing(result.listing);
          setActiveMediaIndex(0);
        }
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
    if (await isGuestLoginRequired()) {
      setLoginGate({ nextPath: `/listings/${encodeURIComponent(id)}` });
      return;
    }
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

  const handleRequestToBook = async () => {
    const nextPath = `/renter?bookListing=${encodeURIComponent(id)}`;
    if (await isGuestLoginRequired()) {
      setLoginGate({ nextPath });
      return;
    }
    router.push(nextPath);
  };

  if (loading) return <main className="renter-flow-page"><p className="renter-flow-state" role="status">Loading space…</p><RenterBottomNavigation /></main>;
  if (error || !listing) return <main className="renter-flow-page"><p className="renter-flow-error" role="alert">{error || "Space not found."}</p><Link className="renter-detail-back" href="/search"><ArrowLeft size={16} />Back to Search</Link><RenterBottomNavigation /></main>;

  const media = [...listing.listing_photos].sort((a, b) => a.position - b.position);
  const activeIndex = Math.min(activeMediaIndex, Math.max(0, media.length - 1));
  const activeMedia = media[activeIndex] ?? null;
  return (
    <main className="renter-flow-page renter-listing-detail-page">
      <header className="renter-detail-toolbar">
        <button type="button" onClick={() => router.back()} aria-label="Go back"><ArrowLeft size={19} /></button>
        <Link href="/search">Find a Space</Link>
        <button type="button" onClick={() => void toggleSaved()} disabled={saving} aria-label={saved ? "Remove from saved spaces" : "Save this space"} aria-pressed={saved}>
          <Heart size={20} fill={saved ? "currentColor" : "none"} />
        </button>
      </header>
      {activeMedia && (
        <div className="renter-detail-image">
          {activeMedia.media_type === "video" ? (
            <video key={activeMedia.image_url} src={activeMedia.image_url} className="renter-detail-video" controls playsInline preload="metadata" />
          ) : (
            <Image src={activeMedia.image_url} alt={activeMedia.label || listing.title} fill unoptimized sizes="480px" priority />
          )}
        </div>
      )}
      {media.length > 1 && (
        <div className="renter-detail-gallery" aria-label="Photos and videos">
          {media.map((item, index) => (
            <button
              key={item.image_url}
              type="button"
              className={`renter-detail-thumb${index === activeIndex ? " is-active" : ""}`}
              onClick={() => setActiveMediaIndex(index)}
              aria-label={`View ${item.label || (item.media_type === "video" ? "video" : "photo")} ${index + 1}`}
            >
              {item.media_type === "video"
                ? <video src={item.image_url} muted playsInline preload="metadata" />
                : <Image src={item.image_url} alt="" width={72} height={54} unoptimized />}
            </button>
          ))}
        </div>
      )}
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
        <button type="button" className="renter-detail-book" onClick={handleRequestToBook}>Request to book</button>
      </section>
      {loginGate && (
        <LoginGateModal
          title="Continue with booking"
          description="Please log in to request this space. Continue with Google and you'll pick up right where you left off."
          nextPath={loginGate.nextPath}
          onClose={() => setLoginGate(null)}
        />
      )}
      <RenterBottomNavigation />
    </main>
  );
}
