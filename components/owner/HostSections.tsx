"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Building2, Check, ChevronLeft, Pencil, Search, UserRound } from "lucide-react";
import { formatHostPrice, useHostData, type HostBooking } from "@/lib/owner/host-data";

function HostState({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p className="host-state-message" role="status">Loading…</p>;
  if (error) return <p className="host-state-error" role="alert">{error}</p>;
  return null;
}

export function HostSpaces() {
  const { data, loading, error } = useHostData();
  const listings = data?.listings ?? [];

  return (
    <div className="host-page-section">
      <header className="host-page-heading">
        <div><p className="host-greeting">Your spaces</p><h1>Active Listings</h1></div>
        <Link href="/owner" className="host-add-button">+ Add</Link>
      </header>
      <HostState loading={loading} error={error} />
      {!loading && !error && (listings.length ? listings.map((listing) => (
        <article className="host-record-card host-space-row" key={listing.id}>
          {listing.listing_photos[0] ? <Image src={listing.listing_photos[0].image_url} alt="" width={56} height={56} unoptimized /> : <span className="host-space-icon"><Building2 size={21} /></span>}
          <div className="host-space-info">
            <strong>{listing.title}</strong>
            <span>{listing.city} · {statusText(listing.status)}</span>
            <span>{formatHostPrice(listing.price_amount, listing.price_model)}</span>
          </div>
          <Link href={`/owner/listings/${encodeURIComponent(listing.id)}`} aria-label={`${listing.status === "published" ? "View" : "Edit"} ${listing.title}`}><Pencil size={17} /></Link>
        </article>
      )) : <div className="host-empty-state"><Building2 size={28} /><p>No listings found.</p><Link href="/owner">Create your first space</Link></div>)}
    </div>
  );
}

export function HostRenters() {
  const { data, loading, error } = useHostData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const bookings = data?.bookings ?? [];
  const view = searchParams.get("view") || "all";
  const counts = {
    all: bookings.length,
    new: bookings.filter((booking) => booking.status === "requested").length,
    chat: 0,
    booked: bookings.filter((booking) => booking.status === "accepted" || booking.status === "completed").length,
  };
  const tabs = [
    { id: "all", label: "All", count: counts.all },
    { id: "new", label: "New", count: counts.new },
    { id: "chat", label: "In Chat", count: counts.chat },
    { id: "booked", label: "Booked", count: counts.booked },
  ];
  const visibleBookings = bookings.filter((booking) => {
    const matchesView = view === "new" ? booking.status === "requested"
      : view === "booked" ? booking.status === "accepted" || booking.status === "completed"
        : view === "chat" ? false : true;
    const person = booking.profiles?.display_name || "";
    const phone = booking.profiles?.phone || "";
    const searchable = `${person} ${phone}`.toLowerCase();
    return matchesView && (!query.trim() || searchable.includes(query.trim().toLowerCase()));
  });

  const selectTab = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") params.delete("view");
    else params.set("view", id);
    router.push(`/owner/renters${params.size ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="host-page-section">
      <header className="host-renters-heading"><h1>Renters</h1></header>
      <div className="host-renter-tabs" role="tablist" aria-label="Filter renter requests">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={view === tab.id} className={view === tab.id ? "is-active" : ""} onClick={() => selectTab(tab.id)}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <label className="host-renter-search">
        <Search size={17} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search renters by name or phone" aria-label="Search renters by name or phone" />
      </label>
      <HostState loading={loading} error={error} />
      {!loading && !error && (visibleBookings.length ? (
        <div className="host-renter-list">
          {visibleBookings.map((booking, index) => {
            const name = booking.profiles?.display_name || "Renter";
            const status = booking.status === "requested" ? "New"
              : booking.status === "accepted" || booking.status === "completed" ? "Booked"
                : "Closed";
            const area = booking.listings?.area_value
              ? `${Number(booking.listings.area_value).toLocaleString("en-IN")} ${booking.listings.area_unit || "sq ft"}`
              : `${booking.listings?.property_type || "space"} space`;
            return (
              <Link className="host-renter-row" href={`/owner/renters/${encodeURIComponent(booking.id)}`} key={booking.id}>
                <span className={`host-renter-avatar renter-avatar-${index % 5}`}>{name.charAt(0).toUpperCase()}</span>
                <span className="host-renter-info">
                  <strong>{name}</strong>
                  <span>{booking.listings?.city || "Location unavailable"}</span>
                  <span>Interested in {area}</span>
                </span>
                <span className="host-renter-meta">
                  <span className={`host-renter-badge renter-status-${status.toLowerCase()}`}>{status}</span>
                  <span>{relativeTime(booking.created_at)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="host-renter-empty">
          <UserRound size={25} />
          <p>{query ? "No renter requests match your search." : view === "chat" ? "Conversations aren’t available yet." : view === "new" ? "No new renter requests." : view === "booked" ? "No confirmed bookings yet." : "No renter requests yet."}</p>
        </div>
      ))}
    </div>
  );
}

export function HostRenterDetails() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error } = useHostData();
  const booking = data?.bookings.find((item) => item.id === params.id);
  const [currentStatus, setCurrentStatus] = useState<HostBooking["status"] | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (booking) setCurrentStatus(booking.status);
  }, [booking]);

  const updateStatus = async (status: "accepted" | "rejected") => {
    if (!booking || saving) return;
    setSaving(true);
    setActionError("");
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update this booking.");
      setCurrentStatus(status);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not update this booking.");
    } finally {
      setSaving(false);
    }
  };

  const name = booking?.profiles?.display_name || "Renter";
  const status = currentStatus || booking?.status;
  const area = booking?.listings?.area_value
    ? `${Number(booking.listings.area_value).toLocaleString("en-IN")} ${booking.listings.area_unit || "sq ft"}`
    : booking?.listings?.property_type || "Space";

  return (
    <div className="host-page-section">
      <button type="button" className="host-back-link" onClick={() => router.back()}><ChevronLeft size={17} /> Back to Renters</button>
      <HostState loading={loading} error={error} />
      {!loading && !error && !booking && <p className="host-state-error" role="alert">This renter request wasn’t found in your account.</p>}
      {booking && (
        <article className="host-renter-detail">
          <span className="host-renter-avatar renter-avatar-0">{name.charAt(0).toUpperCase()}</span>
          <h1>{name}</h1>
          {booking.profiles?.phone && <a href={`tel:${booking.profiles.phone}`}>{booking.profiles.phone}</a>}
          <p>{booking.listings?.city || "Location unavailable"} · Interested in {area}</p>
          <p>Space: {booking.listings?.title || "Unavailable"}</p>
          <p>Requested dates: {new Date(booking.start_date).toLocaleDateString()} – {new Date(booking.end_date).toLocaleDateString()}</p>
          <p>Status: <strong>{status?.replaceAll("_", " ")}</strong></p>
          <p>Request received {relativeTime(booking.created_at)}</p>
          {booking.message && <blockquote>{booking.message}</blockquote>}
          {status === "requested" && (
            <div className="host-renter-detail-actions">
              <button type="button" onClick={() => void updateStatus("rejected")} disabled={saving}>Decline</button>
              <button type="button" onClick={() => void updateStatus("accepted")} disabled={saving}><Check size={15} /> Accept booking</button>
            </div>
          )}
          {actionError && <p className="host-state-error" role="alert">{actionError}</p>}
        </article>
      )}
    </div>
  );
}

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (!Number.isFinite(elapsed)) return "Time unavailable";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function HostAnalytics() {
  const { data, loading, error } = useHostData();
  const ownBookings = data?.bookings.filter((booking) => booking.owner_id === data.profile?.id) ?? [];
  const accepted = ownBookings.filter((booking) => booking.status === "accepted" || booking.status === "completed");

  return (
    <div className="host-page-section">
      <header className="host-page-heading"><div><p className="host-greeting">Your business</p><h1>Analytics</h1></div></header>
      <HostState loading={loading} error={error} />
      {!loading && !error && (
        <>
          <div className="host-stat-list">
            <article><span>Listings</span><strong>{data?.listings.filter((listing) => listing.status === "published").length ?? 0}</strong></article>
            <article><span>Booking requests</span><strong>{ownBookings.length}</strong></article>
            <article><span>Accepted bookings</span><strong>{accepted.length}</strong></article>
            <article><span>Listing views</span><strong>Not tracked</strong></article>
            <article><span>Payouts</span><strong>Not tracked</strong></article>
          </div>
          <p className="host-data-note">Analytics are limited to information currently recorded by Spaceyaar.</p>
        </>
      )}
    </div>
  );
}

export function HostListingDetails() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error } = useHostData();
  const listing = data?.listings.find((item) => item.id === params.id);
  const canEdit = listing?.status === "draft" || listing?.status === "pending_review" || listing?.status === "rejected";
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [resubmitError, setResubmitError] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState("");
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);

  useEffect(() => {
    if (!listing) return;
    setCity(listing.city);
    setAddress(listing.address);
    setDescription(listing.description);
    setRate(String(listing.price_amount));
    setAvailabilityDays(listing.availability_days);
  }, [listing]);

  const toggleAvailability = (day: string) => {
    setAvailabilityDays((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day]);
  };

  const save = async (): Promise<boolean> => {
    if (!listing || !canEdit || saving) return false;
    setSaving(true);
    setSaveError("");
    setSaved(false);
    const duration = listing.min_booking_days >= 7 ? "1 Week" : listing.min_booking_days >= 3 ? "3 Days" : "1 Day";
    const payload = {
      propertyType: listing.property_type,
      floorLevel: listing.floor_level,
      areaValue: listing.area_value === null ? "" : String(listing.area_value),
      areaUnit: listing.area_unit || "Sq. Feet",
      description,
      usageTypes: listing.usage_types,
      length: listing.length === null ? "" : String(listing.length),
      breadth: listing.breadth === null ? "" : String(listing.breadth),
      height: listing.height === null ? "" : String(listing.height),
      dimensionUnit: listing.dimension_unit || "Ft",
      temperature: listing.temperature === null ? "" : String(listing.temperature),
      temperatureUnit: listing.temperature_unit || "Celsius",
      loadingFeatures: listing.loading_features,
      amenities: listing.amenities,
      priceModel: listing.price_model,
      rate,
      securityAmount: String(listing.security_amount),
      refundDays: String(listing.refund_within_days),
      availabilityDays,
      minimumBookingDuration: duration,
      address,
      pincode: listing.pincode || "",
      city,
      state: listing.state,
      accessInstructions: listing.access_instructions || "",
      latitude: listing.latitude,
      longitude: listing.longitude,
    };
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(listing.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update this listing.");
      setSaved(true);
      return true;
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Could not update this listing.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Rejected listings: apply the owner's edits, then send the listing back
  // into review. The submit route resets the previous round's review stages.
  const resubmit = async () => {
    if (!listing || saving) return;
    setSaved(false);
    setResubmitError("");
    const savedOk = await save();
    if (!savedOk) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(listing.id)}/submit`, { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not resubmit this listing.");
      router.replace(`/owner/submitted/${encodeURIComponent(listing.id)}`);
    } catch (cause) {
      setResubmitError(cause instanceof Error ? cause.message : "Could not resubmit this listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="host-page-section">
      <header className="host-page-heading"><div><p className="host-greeting">Listing details</p><h1>{listing?.title || "Your listing"}</h1></div></header>
      <HostState loading={loading} error={error} />
      {!loading && !error && !listing && <p className="host-state-error" role="alert">This listing wasn’t found in your account.</p>}
      {listing && (
        <section className="host-editor-card">
          {listing.listing_photos[0] && <div className="host-editor-image"><Image src={listing.listing_photos[0].image_url} alt={`${listing.title} warehouse`} fill unoptimized sizes="(max-width: 480px) 100vw, 480px" /></div>}
          <p className="host-editor-status">{statusText(listing.status)}</p>
          {listing.status === "rejected" && listing.rejection_reason && (
            <p className="listing-rejection-note" role="status">
              <strong>Reviewer feedback:</strong> {listing.rejection_reason}
            </p>
          )}
          {canEdit ? (
            <>
              <label>City<input value={city} onChange={(event) => setCity(event.target.value)} /></label>
              <label>Address<input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
              <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></label>
              <label>Rate (₹)<input type="number" min="1" value={rate} onChange={(event) => setRate(event.target.value)} /></label>
              <fieldset className="host-availability-field">
                <legend>Available days</legend>
                <div>
                  {["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <button
                      type="button"
                      key={day}
                      className={availabilityDays.includes(day) ? "is-selected" : ""}
                      aria-pressed={availabilityDays.includes(day)}
                      onClick={() => toggleAvailability(day)}
                    >{day}</button>
                  ))}
                </div>
              </fieldset>
              <div className="host-editor-actions">
                <button type="button" className="host-editor-save" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
                {listing.status === "rejected" && (
                  <button
                    type="button"
                    className="host-editor-save host-editor-resubmit"
                    onClick={() => void resubmit()}
                    disabled={saving}
                  >
                    {saving ? "Resubmitting…" : "Save & resubmit for review"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="host-readonly-listing">
              <p>{listing.address}</p>
              <p>{listing.description}</p>
              <p>{formatHostPrice(listing.price_amount, listing.price_model)} · {listing.area_value ? `${listing.area_value} ${listing.area_unit}` : listing.property_type}</p>
              <p>{listing.status === "published" ? "Published listings are live and cannot be edited from this screen." : "This listing status cannot be edited from this screen."}</p>
            </div>
          )}
          {saved && <p className="host-success-message" role="status">Listing changes saved.</p>}
          {saveError && <p className="host-state-error" role="alert">{saveError}</p>}
          {resubmitError && <p className="host-state-error" role="alert">{resubmitError}</p>}
        </section>
      )}
      <button type="button" className="host-back-link" onClick={() => router.push("/owner/spaces")}>Back to Spaces</button>
    </div>
  );
}

function statusText(status: string) {
  return status.replaceAll("_", " ");
}
