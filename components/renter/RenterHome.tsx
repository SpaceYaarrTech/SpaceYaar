"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Search,
  ShieldCheck,
  Tag,
  UserRound,
  Zap,
} from "lucide-react";
import { LISTINGS, type Listing } from "@/data/listings";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";
import { getSelectedRole, setSelectedRole } from "@/lib/roles/role-storage";
import type { UserRole } from "@/types/roles";

type FilterKey =
  | "priceRange"
  | "availability"
  | "within1km"
  | "for15Days"
  | "threeMonths"
  | "discount";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "priceRange", label: "Price Range" },
  { key: "availability", label: "Availability" },
  { key: "within1km", label: "Within 1KM" },
  { key: "for15Days", label: "For 15 Days" },
  { key: "threeMonths", label: "3 Months" },
  { key: "discount", label: "Discount" },
];

const INITIAL_FILTERS: Record<FilterKey, boolean> = {
  priceRange: true,
  availability: false,
  within1km: false,
  for15Days: false,
  threeMonths: false,
  discount: false,
};

type PublicListing = {
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
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  listing_photos: Array<{ image_url: string; label: string; position: number; media_type?: string }>;
};

type RenterListing = Listing & { minimumBookingDays: number };

const FALLBACK_LISTING_IMAGE = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80";

function distanceInKm(from: [number, number], to: [number, number]) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const [fromLatitude, fromLongitude] = from.map(radians);
  const [toLatitude, toLongitude] = to.map(radians);
  const latitudeDelta = toLatitude - fromLatitude;
  const longitudeDelta = toLongitude - fromLongitude;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mapPublicListing(listing: PublicListing, origin: [number, number] | null): RenterListing {
  const amount = Number(listing.price_amount) || 0;
  const priceUnit = listing.price_model.replace("Per ", "").toLowerCase();
  const perDayAmount = listing.price_model === "Per Week"
    ? amount / 7
    : listing.price_model === "Per Month"
      ? amount / 30
      : amount;
  const distanceValue = origin && listing.latitude !== null && listing.longitude !== null
    ? distanceInKm(origin, [listing.latitude, listing.longitude])
    : Number.POSITIVE_INFINITY;

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    image: (listing.listing_photos.find((photo) => photo.media_type !== "video") ?? listing.listing_photos[0])?.image_url || FALLBACK_LISTING_IMAGE,
    distance: Number.isFinite(distanceValue) ? `${distanceValue.toFixed(1)} km away` : listing.city,
    distanceValue,
    feature: listing.amenities[0] || listing.property_type,
    area: listing.area_value ? `${listing.area_value} ${listing.area_unit || ""}`.trim() : listing.property_type,
    pricePerDay: `₹${amount.toLocaleString("en-IN")}/${priceUnit}`,
    priceValue: perDayAmount,
    badge: { label: "Reviewed", type: "verified" },
    minimumBookingDays: listing.min_booking_days,
  };
}

function getBadgeClasses(type: Listing["badge"]["type"]) {
  switch (type) {
    case "instant":
      return "listing-badge listing-badge--instant";
    case "cheapest":
      return "listing-badge listing-badge--cheapest";
    default:
      return "listing-badge listing-badge--verified";
  }
}

function getBadgeIcon(type: Listing["badge"]["type"]) {
  switch (type) {
    case "instant":
      return <Zap size={10} strokeWidth={2.2} />;
    case "cheapest":
      return <Tag size={10} strokeWidth={2.2} />;
    default:
      return <ShieldCheck size={10} strokeWidth={2.2} />;
  }
}

function ListingCard({
  listing,
  onBook,
  isDemo,
}: {
  listing: RenterListing;
  onBook: (listing: RenterListing) => void;
  isDemo: boolean;
}) {
  return (
    <article className="listing-card" aria-label={listing.title}>
      <div className="listing-image-wrap">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          sizes="(max-width: 390px) 100vw, 390px"
          className="listing-image"
        />
        <div className={getBadgeClasses(listing.badge.type)}>
          {getBadgeIcon(listing.badge.type)}
          <span>{listing.badge.label}</span>
        </div>
      </div>

      <div className="listing-body">
        <h3>{listing.title}</h3>
        <p>{listing.description}</p>

        <div className="listing-meta">
          <span className="meta-chip">{listing.distance}</span>
          <span className="meta-chip">{listing.feature}</span>
          <span className="meta-chip">{listing.area}</span>
        </div>

        <div className="listing-footer">
          <span className="listing-price">{listing.pricePerDay}</span>
          <button
            type="button"
            className="book-button"
            aria-label={isDemo ? `${listing.title} is a demo listing` : `Request booking for ${listing.title}`}
            disabled={isDemo}
            onClick={() => onBook(listing)}
          >
            {isDemo ? "Demo" : "Book"}
          </button>
        </div>
      </div>
    </article>
  );
}

type RenterHomeProps = {
  onRoleChange?: (nextRole: UserRole) => void;
};

export function RenterHome({ onRoleChange }: RenterHomeProps = {}) {
  const router = useRouter();
  const [selectedRole, setSelectedRoleState] = useState<UserRole>(() => getSelectedRole() ?? "renter");
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterKey, boolean>>(INITIAL_FILTERS);
  const [listings, setListings] = useState<RenterListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [isDemoListings, setIsDemoListings] = useState(false);
  const [bookingListing, setBookingListing] = useState<RenterListing | null>(null);
  const [bookingStartDate, setBookingStartDate] = useState("");
  const [bookingEndDate, setBookingEndDate] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const handledRebookId = useRef<string | null>(null);

  useEffect(() => {
    const storedRole = getSelectedRole();
    if (storedRole && storedRole !== selectedRole) {
      setSelectedRoleState(storedRole);
    }
  }, [selectedRole]);

  useEffect(() => {
    let isCurrent = true;

    const loadListings = async () => {
      setIsLoadingListings(true);
      setListingsError("");
      try {
        const response = await fetch("/api/listings?limit=24", { cache: "no-store" });
        const result = await response.json() as { listings?: PublicListing[]; error?: string };
        if (result.error === "Backend is not configured yet.") {
          if (isCurrent) {
            setListings(LISTINGS.map((listing) => ({ ...listing, minimumBookingDays: 1 })));
            setIsDemoListings(true);
          }
          return;
        }
        if (!response.ok) throw new Error(result.error || "Could not load spaces.");

        let origin: [number, number] | null = null;
        const storedLocation = window.sessionStorage.getItem("spaceyaar-selected-location");
        if (storedLocation) {
          try {
            const location = JSON.parse(storedLocation) as { latitude?: number; longitude?: number };
            if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
              origin = [location.latitude as number, location.longitude as number];
            }
          } catch {
            origin = null;
          }
        }

        if (isCurrent) {
          setListings((result.listings ?? []).map((listing) => mapPublicListing(listing, origin)));
          setIsDemoListings(false);
        }
      } catch (error) {
        if (isCurrent) setListingsError(error instanceof Error ? error.message : "Could not load spaces.");
      } finally {
        if (isCurrent) setIsLoadingListings(false);
      }
    };

    void loadListings();
    return () => {
      isCurrent = false;
    };
  }, []);

  const openBookingRequest = (listing: RenterListing) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + listing.minimumBookingDays);
    setBookingListing(listing);
    setBookingStartDate(formatDateInput(startDate));
    setBookingEndDate(formatDateInput(endDate));
    setBookingNote("");
    setBookingError("");
    setBookingSuccess("");
  };

  useEffect(() => {
    if (isLoadingListings || !listings.length) return;
    const listingId = new URLSearchParams(window.location.search).get("bookListing");
    if (!listingId || handledRebookId.current === listingId) return;
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) return;
    handledRebookId.current = listingId;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + listing.minimumBookingDays);
    setBookingListing(listing);
    setBookingStartDate(formatDateInput(startDate));
    setBookingEndDate(formatDateInput(endDate));
    setBookingNote("");
    setBookingError("");
    setBookingSuccess("");
  }, [isLoadingListings, listings]);

  const submitBookingRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookingListing || isSubmittingBooking) return;
    setIsSubmittingBooking(true);
    setBookingError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: bookingListing.id,
          startDate: bookingStartDate,
          endDate: bookingEndDate,
          message: bookingNote,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not send booking request.");
      setBookingSuccess("Your booking request was sent to the owner.");
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Could not send booking request.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const filteredListings = useMemo(() => {
    const active = Object.entries(selectedFilters).filter(([, isSelected]) => isSelected);

    if (!active.length) {
      return listings;
    }

    let next = [...listings];

    if (selectedFilters.within1km) {
      next = next.filter((listing) => listing.distanceValue <= 1);
    }

    if (selectedFilters.discount) {
      next = next.filter((listing) => listing.priceValue <= 500);
    }

    if (selectedFilters.for15Days) {
      next = next.filter((listing) => listing.priceValue <= 700);
    }

    if (selectedFilters.threeMonths) {
      next = next.filter((listing) => listing.priceValue >= 350);
    }

    if (selectedFilters.availability) {
      next = next.filter((listing) => listing.feature !== "24/7 Security");
    }

    if (selectedFilters.priceRange) {
      return next;
    }

    return next.length ? next : [];
  }, [listings, selectedFilters]);

  const handleRoleChange = (nextRole: UserRole) => {
    setSelectedRoleState(nextRole);
    setSelectedRole(nextRole);

    if (onRoleChange) {
      onRoleChange(nextRole);
      return;
    }

    if (nextRole === "owner") {
      router.replace("/owner");
      return;
    }
    router.replace("/renter");
  };

  const toggleFilter = (filterKey: FilterKey) => {
    setSelectedFilters((current) => {
      const next = { ...current, [filterKey]: !current[filterKey] };
      if (filterKey === "priceRange" && next.priceRange === false) {
        next.priceRange = true;
      }
      if (filterKey !== "priceRange") {
        next.priceRange = false;
      }
      return next;
    });
  };

  return (
    <main className="renter-home-page" aria-label="Renter home screen">
      <div className="status-bar" aria-hidden="true">
        <span className="status-time">9:30</span>
        <div className="status-icons">
          <svg viewBox="0 0 24 24" className="status-signal" aria-hidden="true">
            <path d="M3 15.5h2.2l1.8-3.2 2 5 2.2-4.8 1.8 2.5H21" />
          </svg>
          <svg viewBox="0 0 24 24" className="status-network" aria-hidden="true">
            <path d="M3 10.5h16v8H3z" />
            <path d="M18.5 13.5h2.5v5h-2.5" />
          </svg>
          <span className="battery-indicator" aria-hidden="true" />
        </div>
      </div>

      <div className="renter-toolbar">
        <div className="role-switcher" role="tablist" aria-label="Choose your role">
          <button
            type="button"
            className={selectedRole === "renter" ? "role-option role-option--active" : "role-option"}
            aria-pressed={selectedRole === "renter"}
            onClick={() => handleRoleChange("renter")}
          >
            Renter
          </button>
          <button
            type="button"
            className={selectedRole === "owner" ? "role-option role-option--active" : "role-option"}
            aria-pressed={selectedRole === "owner"}
            onClick={() => handleRoleChange("owner")}
          >
            Owner
          </button>
        </div>

        <button
          type="button"
          className="search-button"
          aria-label="Search"
          onClick={() => router.push("/search")}
        >
          <Search size={15} strokeWidth={2.2} />
        </button>
      </div>

      <div className="header-row">
        <div className="location-greeting">
          <div className="location-line">
            <span>Industrial estate Dada nagar, Kanpur</span>
            <MapPin size={10} strokeWidth={2.3} />
          </div>
          <h1>Hey! Swad?</h1>
        </div>

        <button
          type="button"
          className="profile-button"
          aria-label="Open profile"
          onClick={() => router.push("/profile")}
        >
          <UserRound size={14} strokeWidth={2.2} />
        </button>
      </div>

      <div className="filter-row" aria-label="Filter options">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={selectedFilters[key] ? "filter-chip filter-chip--selected" : "filter-chip"}
            aria-pressed={selectedFilters[key]}
            onClick={() => toggleFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="section-heading">Explore Near by</div>

      <div className="listing-stack">
        {isLoadingListings ? (
          <div className="empty-state" role="status">Loading available spaces...</div>
        ) : listingsError ? (
          <div className="empty-state" role="alert">{listingsError}</div>
        ) : (
          <>
            {isDemoListings && (
              <div className="empty-state" role="status">
                Demo spaces only. Connect Supabase to load live listings and enable booking.
              </div>
            )}
            {filteredListings.length ? (
              filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} onBook={openBookingRequest} isDemo={isDemoListings} />
              ))
            ) : (
              <div className="empty-state">No spaces match this filter yet.</div>
            )}
          </>
        )}
      </div>

      {bookingListing && (
        <div
          className="booking-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBookingListing(null);
          }}
        >
          <form className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title" onSubmit={submitBookingRequest}>
            <div className="booking-dialog-header">
              <div>
                <h2 id="booking-dialog-title">Request this space</h2>
                <p>{bookingListing.title}</p>
              </div>
              <button type="button" className="booking-dialog-close" aria-label="Close" onClick={() => setBookingListing(null)}>×</button>
            </div>

            <div className="booking-dialog-dates">
              <label>
                Start date
                <input type="date" value={bookingStartDate} min={formatDateInput(new Date())} onChange={(event) => setBookingStartDate(event.target.value)} required />
              </label>
              <label>
                End date
                <input type="date" value={bookingEndDate} min={bookingStartDate} onChange={(event) => setBookingEndDate(event.target.value)} required />
              </label>
            </div>

            <p className="booking-dialog-helper">Minimum booking: {bookingListing.minimumBookingDays} days · Rate: {bookingListing.pricePerDay}</p>
            <label className="booking-dialog-note">
              Note to owner
              <textarea value={bookingNote} maxLength={500} onChange={(event) => setBookingNote(event.target.value)} placeholder="What will you store?" />
            </label>

            {bookingError && <p className="booking-dialog-error" role="alert">{bookingError}</p>}
            {bookingSuccess && <p className="booking-dialog-success" role="status">{bookingSuccess}</p>}

            <div className="booking-dialog-actions">
              <button type="button" className="booking-dialog-cancel" onClick={() => setBookingListing(null)}>Close</button>
              <button type="submit" className="booking-dialog-submit" disabled={isSubmittingBooking || Boolean(bookingSuccess)}>
                {isSubmittingBooking ? "Sending..." : bookingSuccess ? "Request sent" : "Send request"}
              </button>
            </div>
          </form>
        </div>
      )}

      <RenterBottomNavigation />
    </main>
  );
}
