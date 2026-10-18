"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Banknote,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Eye,
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { formatHostPrice, useHostData } from "@/lib/owner/host-data";

type QuickAction = {
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  notification?: number;
};

const QUICK_ACTIONS: QuickAction[] = [
  { title: "Manage Bookings", subtitle: "View & accept requests", href: "/owner/renters", icon: CalendarDays },
  { title: "Rent Enquiries", subtitle: "Booking requests", href: "/owner/renters", icon: MessageCircle },
  { title: "Update Availability", subtitle: "Manage your spaces", href: "/owner/my-spaces", icon: Clock3 },
  { title: "View Analytics", subtitle: "Traffic & performance", href: "/owner/analytics", icon: ChartNoAxesCombined },
  { title: "Payout Settings", subtitle: "Account & profile", href: "/owner/profile/payout", icon: Banknote },
  { title: "Edit Listing", subtitle: "Manage your spaces", href: "/owner/my-spaces", icon: Pencil },
];

function statusLabel(status: string) {
  if (status === "published") return "LIVE";
  if (status === "pending_review") return "IN REVIEW";
  if (status === "rejected") return "ACTION NEEDED";
  return status.replaceAll("_", " ").toUpperCase();
}

export function HostDashboard() {
  const { data, loading, error } = useHostData();
  const activeListings = data?.listings.filter((listing) => ["published", "pending_review", "rejected"].includes(listing.status)) ?? [];
  const pendingBookings = data?.bookings.filter((booking) =>
    booking.owner_id === data.profile?.id && booking.status === "requested",
  ) ?? [];
  const today = new Date().toDateString();
  const todayBookings = data?.bookings.filter((booking) =>
    booking.owner_id === data.profile?.id && new Date(booking.created_at).toDateString() === today,
  ).length ?? 0;
  const hasLiveListing = activeListings.some((listing) => listing.status === "published");
  const bannerListing = activeListings.find((listing) => listing.status === "published")
    ?? activeListings.find((listing) => listing.status === "pending_review" || listing.status === "rejected");

  return (
    <div className="host-dashboard">
      <header className="host-header">
        <div>
          <p className="host-greeting">{data?.profile?.display_name ? `${data.profile.display_name.split(" ")[0]},` : "Maalik,"}</p>
          <h1>Host Dashboard</h1>
        </div>
        <Link href="/owner/profile" className="host-avatar-button" aria-label="Open profile">
          {data?.profile?.profile_photo_url
            ? <Image src={data.profile.profile_photo_url} alt="" width={44} height={44} className="host-dashboard-avatar-photo" unoptimized />
            : <UserRound size={24} strokeWidth={1.7} aria-hidden="true" />}
        </Link>
      </header>

      {loading ? (
        <p className="host-state-message" role="status">Loading your dashboard…</p>
      ) : error ? (
        <p className="host-state-error" role="alert">{error}</p>
      ) : (
        <>
          {data?.isPreview && (
            <p className="host-preview-notice" role="note">
              Local UI preview only. Dashboard data is stored in this browser, not in Supabase.
            </p>
          )}

          {bannerListing && (
            <section className={`host-status-banner${hasLiveListing ? " is-live" : ""}`}>
              <span className="host-status-banner-icon">
                {hasLiveListing ? <ShieldCheck size={20} /> : <Clock3 size={19} />}
              </span>
              <div>
                <h2>{hasLiveListing ? "Yaaay! Your Listing is now LIVE!" : bannerListing.status === "rejected" ? "Your listing needs an update" : "Your listing is under review"}</h2>
                <p>{hasLiveListing ? "Renters can now discover and book your space." : `Current status: ${statusLabel(bannerListing.status).toLowerCase()}. We’ll update you when it changes.`}</p>
              </div>
            </section>
          )}

          <section className="host-section">
            <div className="host-section-heading">
              <h2>Today’s Performance</h2>
              <span>Today</span>
            </div>
            <div className="host-performance-grid">
              <article className="host-performance-card">
                <strong className="performance-red">{todayBookings}</strong>
                <span>Bookings</span>
              </article>
              <article className="host-performance-card">
                <strong className="performance-purple"><Eye size={23} aria-label="Views" />—</strong>
                <span>Views</span>
              </article>
              <article className="host-performance-card">
                <strong className="performance-cyan">—</strong>
                <span>Earnings</span>
              </article>
            </div>
            <p className="host-data-note">Views and payout totals aren’t available in the current data yet.</p>
          </section>

          <section className="host-section">
            <div className="host-section-heading">
              <h2>Active Listings</h2>
              <Link href="/owner/my-spaces">View all</Link>
            </div>
            {activeListings.length ? (
              <div className="host-listing-stack">
                {activeListings.map((listing) => {
                  const photo = [...listing.listing_photos].sort((a, b) => a.position - b.position)[0];
                  return (
                    <article className="host-listing-card" key={listing.id}>
                      <Link href={`/owner/listings/${encodeURIComponent(listing.id)}`} className="host-listing-photo" aria-label={`View ${listing.title}`}>
                        {photo ? <Image src={photo.image_url} alt="" fill unoptimized sizes="120px" /> : <span className="host-listing-placeholder"><Building2 size={24} /></span>}
                        <span className={`host-listing-badge ${listing.status === "published" ? "is-live" : ""}`}>{statusLabel(listing.status)}</span>
                      </Link>
                      <div className="host-listing-content">
                        <Link href={`/owner/listings/${encodeURIComponent(listing.id)}`} className="host-listing-title">{listing.title}</Link>
                        <div className="host-listing-chips">
                          <span><MapPin size={11} />{listing.city}</span>
                          {listing.amenities.slice(0, 1).map((amenity) => <span key={amenity}>{amenity}</span>)}
                          {listing.area_value && <span>{Number(listing.area_value).toLocaleString("en-IN")} {listing.area_unit}</span>}
                        </div>
                        <div className="host-listing-footer">
                          <span>{formatHostPrice(listing.price_amount, listing.price_model)} · Min {listing.min_booking_days} days</span>
                          <Link href={`/owner/listings/${encodeURIComponent(listing.id)}`} aria-label={`${listing.status === "draft" || listing.status === "pending_review" || listing.status === "rejected" ? "Edit" : "View"} ${listing.title}`}><Pencil size={14} /> {listing.status === "draft" || listing.status === "pending_review" || listing.status === "rejected" ? "Edit" : "View"}</Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="host-empty-state">
                <Building2 size={24} />
                <p>No active listings yet.</p>
                <Link href="/owner">Create a listing</Link>
              </div>
            )}
          </section>

          <section className="host-section">
            <h2 className="host-section-title">Quick Actions</h2>
            <div className="host-quick-grid">
              {QUICK_ACTIONS.map(({ title, subtitle, href, icon: Icon }) => (
                <Link className="host-quick-card" href={href} key={title}>
                  <span className="host-quick-icon"><Icon size={19} /></span>
                  <span className="host-quick-copy">
                    <strong>{title}</strong>
                    <span>{title === "Rent Enquiries" && pendingBookings.length ? `${pendingBookings.length} new request${pendingBookings.length === 1 ? "" : "s"}` : subtitle}</span>
                  </span>
                  {title === "Rent Enquiries" && pendingBookings.length > 0 && <span className="host-notification-badge">{pendingBookings.length}</span>}
                </Link>
              ))}
            </div>
          </section>

          <aside className="host-recommendation">
            <Info size={18} aria-hidden="true" />
            <span>Add clear, helpful photos to make your space easier for renters to evaluate.</span>
            <Link href="/owner/my-spaces" aria-label="Manage listing photos"><Plus size={17} /></Link>
          </aside>
        </>
      )}
    </div>
  );
}
