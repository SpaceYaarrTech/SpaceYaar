"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Zap } from "lucide-react";

export type RenterListingRecord = {
  id: string;
  title: string;
  description?: string;
  property_type: string;
  area_value: number | null;
  area_unit: string | null;
  price_amount: number;
  price_model: string;
  city: string;
  state?: string;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  amenities: string[];
  created_at?: string;
  listing_photos: Array<{ image_url: string; position: number }>;
};

export function RenterListingCard({
  listing,
  saved,
  onToggleSaved,
  distance,
}: {
  listing: RenterListingRecord;
  saved?: boolean;
  onToggleSaved?: (listing: RenterListingRecord) => void;
  distance?: string;
}) {
  const image = [...listing.listing_photos].sort((a, b) => a.position - b.position)[0]?.image_url;
  const area = listing.area_value
    ? `${Number(listing.area_value).toLocaleString("en-IN")} ${listing.area_unit || "sq ft"}`
    : listing.property_type;
  const metadata = [distance, area, ...listing.amenities.slice(0, 1)].filter(Boolean).join(" · ");
  const unit = listing.price_model.replace(/^Per /, "") || "Day";

  return (
    <article className="renter-listing-card">
      <Link className="renter-listing-image" href={`/listings/${encodeURIComponent(listing.id)}`} aria-label={`View ${listing.title}`}>
        {image
          ? <Image src={image} alt="" fill unoptimized sizes="120px" />
          : <span aria-hidden="true">Warehouse</span>}
        <span className="renter-instant-badge"><Zap size={10} fill="currentColor" /> Instant</span>
      </Link>
      <div className="renter-listing-content">
        <div className="renter-listing-heading">
          <Link href={`/listings/${encodeURIComponent(listing.id)}`} className="renter-listing-title">{listing.title}</Link>
          {onToggleSaved && (
            <button
              type="button"
              className={`renter-heart-button${saved ? " is-saved" : ""}`}
              aria-label={saved ? `Remove ${listing.title} from saved spaces` : `Save ${listing.title}`}
              aria-pressed={saved}
              onClick={() => onToggleSaved(listing)}
            >
              <Heart size={18} fill={saved ? "currentColor" : "none"} />
            </button>
          )}
        </div>
        <p className="renter-listing-meta">{metadata || listing.city}</p>
        <p className="renter-listing-place">{listing.city}{listing.pincode ? ` · ${listing.pincode}` : ""}</p>
        <div className="renter-listing-price">
          <strong>₹{Number(listing.price_amount).toLocaleString("en-IN")}</strong>
          <span>/{unit}</span>
        </div>
      </div>
    </article>
  );
}
