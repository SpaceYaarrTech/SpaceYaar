"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronUp, MessageCircle, Phone, Timer } from "lucide-react";
import { RazorpayCheckoutButton } from "@/components/renter/RazorpayCheckoutButton";
import { RenterBottomNavigation } from "@/components/renter/RenterBottomNavigation";

type Booking = {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  status: "requested" | "accepted" | "rejected" | "cancelled" | "completed";
  quoted_total: number;
  payment_status: "created" | "captured" | "failed" | null;
  listings: {
    id: string;
    title: string;
    city: string;
    state: string;
    property_type: string;
    listing_photos: Array<{ image_url: string; position: number }>;
  } | null;
};

type BookingTab = "active" | "upcoming" | "past" | "cancelled";
type BookingGroup = BookingTab | "pending";
const DAY_MS = 86_400_000;

function utcDay(value: string) {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getBookingGroup(booking: Booking, today: number): BookingGroup {
  if (booking.status === "cancelled" || booking.status === "rejected") return "cancelled";
  if (booking.status === "completed") return "past";
  if (booking.status === "requested") return "pending";
  const start = utcDay(booking.start_date);
  const end = utcDay(booking.end_date);
  if (start === null || end === null || end <= start) return "past";
  if (start > today) return "upcoming";
  if (end <= today) return "past";
  return "active";
}

function formatDate(value: string) {
  const timestamp = utcDay(value);
  return timestamp === null ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}

function BookingCard({
  booking,
  variant,
  onCallOwner,
  onChat,
  onPaid,
}: {
  booking: Booking;
  variant: BookingGroup;
  onCallOwner?: (booking: Booking) => void;
  onChat?: (booking: Booking) => void;
  onPaid?: () => void;
}) {
  const [contactError, setContactError] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const image = booking.listings?.listing_photos[0]?.image_url;
  const isActive = variant === "active";
  const statusLabel = variant === "pending" ? "Awaiting owner"
    : booking.status === "completed" ? "Completed"
      : booking.status === "cancelled" ? "Cancelled"
        : booking.status === "rejected" ? "Declined"
          : variant === "active" ? "Currently Active"
            : variant === "upcoming" ? "Upcoming"
              : "Past";

  const start = utcDay(booking.start_date);
  const end = utcDay(booking.end_date);
  const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  const duration = start !== null && end !== null && end > start ? Math.ceil((end - start) / DAY_MS) : null;
  const active = variant === "active" && start !== null && duration !== null;
  const elapsed = active ? Math.max(0, Math.min(duration, Math.floor((today - start) / DAY_MS))) : 0;
  const remaining = active && end !== null ? Math.max(0, Math.ceil((end - today) / DAY_MS)) : null;
  const progress = active && duration ? Math.round((elapsed / duration) * 100) : 0;

  const callOwner = async () => {
    setContactError("");
    setContactLoading(true);
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}/contact`, { cache: "no-store" });
      const result = await response.json() as { phone?: string | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load owner contact details.");
      if (!result.phone) throw new Error("The owner has not added a phone number.");
      window.location.href = `tel:${result.phone}`;
      onCallOwner?.(booking);
    } catch (cause) {
      setContactError(cause instanceof Error ? cause.message : "Could not contact the owner.");
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <article className={`renter-booking-card${isActive ? " is-active-booking" : ""}${variant === "past" ? " is-past-booking" : ""}`}>
      {isActive && (
        <div className="renter-booking-card-top">
          <span className="renter-booking-status is-active"><span />Currently Active</span>
          <span className="renter-booking-id">#{booking.id.slice(0, 8).toUpperCase()}</span>
        </div>
      )}
      {!isActive && (
        <div className="renter-booking-card-top">
          <span className={`renter-booking-status is-${variant}`}>
            {variant === "past" && booking.status === "completed" && <Check size={12} />}
            {statusLabel}
          </span>
          <span className="renter-booking-id">#{booking.id.slice(0, 8).toUpperCase()}</span>
        </div>
      )}
      <div className="renter-booking-main">
        <div className="renter-booking-image">
          {image ? <Image src={image} alt="" fill unoptimized sizes="82px" /> : <CalendarDays size={25} />}
        </div>
        <div className="renter-booking-info">
          <h3>{booking.listings?.title ?? "Storage booking"}</h3>
          <p>{[booking.listings?.city, booking.listings?.state].filter(Boolean).join(", ") || "Location unavailable"}</p>
          <p>{formatDate(booking.start_date)} – {formatDate(booking.end_date)}</p>
          <strong className="renter-booking-amount">₹{Number(booking.quoted_total).toLocaleString("en-IN")} <small>Total</small></strong>
        </div>
      </div>

      {active && (
        <div className="renter-booking-progress">
          <div className="renter-progress-heading">
            <span>Days Remaining</span>
            <strong>{remaining === null ? "Dates unavailable" : `${remaining} ${remaining === 1 ? "Day" : "Days"} Left`}</strong>
          </div>
          {duration && (
            <>
              <div className="renter-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="renter-progress-caption">
                <span>Day {Math.min(duration, elapsed + 1)} of {duration}</span>
                <span>{progress}% Completed</span>
              </div>
            </>
          )}
          {!duration && <p className="renter-booking-warning">Booking dates are missing or invalid.</p>}
        </div>
      )}

      <div className="renter-booking-actions">
        {isActive && (
          <>
            <button type="button" className="renter-call-owner" onClick={() => void callOwner()} disabled={contactLoading}>
              <Phone size={15} />{contactLoading ? "Loading…" : "Call Owner"}
            </button>
            <button type="button" className="renter-chat-owner" onClick={() => {
              setChatMessage("In-app messaging is not available yet.");
              onChat?.(booking);
            }}>
              <MessageCircle size={15} />Chat Owner
            </button>
          </>
        )}
        {booking.status === "accepted" && booking.payment_status !== "captured" && (
          <RazorpayCheckoutButton bookingId={booking.id} onPaid={onPaid} />
        )}
        {booking.payment_status === "captured" && <span className="renter-payment-confirmed"><Check size={14} />Paid</span>}
        {variant === "past" && booking.listing_id && (
          <Link href={`/renter?bookListing=${encodeURIComponent(booking.listing_id)}`} className="renter-rebook-link">
            Re-book <ChevronUp size={15} />
          </Link>
        )}
      </div>
      {contactError && <p className="renter-booking-inline-error" role="alert">{contactError}</p>}
      {chatMessage && <p className="renter-booking-inline-error" role="status">{chatMessage}</p>}
    </article>
  );
}

export default function HistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<BookingTab>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/bookings", { cache: "no-store", signal });
    const result = await response.json() as { bookings?: Booking[]; error?: string };
    if (!response.ok) throw new Error(result.error || "Could not load bookings.");
    setBookings(result.bookings ?? []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadBookings(controller.signal)
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Could not load bookings.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [loadBookings]);

  const grouped = useMemo(() => {
    const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
    return bookings.reduce<Record<BookingGroup, Booking[]>>((groups, booking) => {
      groups[getBookingGroup(booking, today)].push(booking);
      return groups;
    }, { active: [], upcoming: [], past: [], cancelled: [], pending: [] });
  }, [bookings]);

  const list = tab === "active" ? grouped.active
    : tab === "upcoming" ? [...grouped.upcoming, ...grouped.pending]
      : grouped[tab];

  return (
    <main className="renter-flow-page renter-bookings-page">
      <header className="renter-page-header"><h1>My Bookings Space</h1></header>
      <div className="renter-segmented-control renter-booking-tabs" role="tablist" aria-label="Filter bookings">
        {([
          ["active", "Active"],
          ["upcoming", "Upcoming"],
          ["past", "Past"],
          ["cancelled", "Cancelled"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{label}</button>
        ))}
      </div>

      <div className="renter-booking-summaries" aria-label="Booking counts">
        <span className="summary-active"><strong>{grouped.active.length}</strong> Active</span>
        <span className="summary-upcoming"><strong>{grouped.upcoming.length}</strong> Upcoming</span>
        <span className="summary-past"><strong>{grouped.past.length}</strong> Past</span>
      </div>

      {error && <p className="renter-flow-error" role="alert">{error}</p>}
      {loading ? <p className="renter-flow-state" role="status">Loading bookings…</p>
        : (
          <>
            {list.length ? (
              <section className="renter-booking-list">
                {tab === "upcoming" && grouped.pending.length > 0 && (
                  <div className="renter-booking-section-label"><Timer size={15} />Waiting for owner response</div>
                )}
                {list.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    variant={getBookingGroup(booking, Math.floor(Date.now() / DAY_MS) * DAY_MS)}
                    onPaid={() => void loadBookings().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not refresh bookings."))}
                  />
                ))}
              </section>
            ) : <p className="renter-flow-empty">{tab === "active" ? "You have no active bookings." : `No ${tab} bookings to show.`}</p>}
            {tab === "active" && grouped.past.length > 0 && (
              <section className="renter-booking-preview">
                <h2>Past Bookings</h2>
                <div className="renter-booking-list">
                  {grouped.past.slice(0, 3).map((booking) => <BookingCard key={booking.id} booking={booking} variant="past" />)}
                </div>
              </section>
            )}
          </>
        )}
      <RenterBottomNavigation />
    </main>
  );
}
