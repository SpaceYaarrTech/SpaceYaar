"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useParams } from "next/navigation";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import { loadHostData, type HostBooking, type HostListing } from "@/lib/owner/host-data";

const STEPS = [
  { title: "Listing Submitted", description: "Listing received by Spaceyaar team", timing: "Just Now" },
  { title: "Document Check", description: "Listing documents are being reviewed", timing: "In 4hrs" },
  { title: "Space Verification Call", description: "Quick call from our verification agent", timing: "In 12hrs" },
  { title: "Listing Goes Live", description: "Your space appears in search results", timing: "In 24hrs" },
  { title: "First Booking", description: "Renters discover and book your space", timing: "In 1–2 days" },
];

function getCurrentStep(listing: HostListing, bookings: HostBooking[]) {
  if (bookings.some((booking) => booking.listing_id === listing.id && booking.status !== "rejected" && booking.status !== "cancelled")) {
    return 5;
  }
  if (listing.status === "published" || listing.status === "archived") return 4;
  if (listing.status === "rejected") return 2;
  return 1;
}

export function ListingSubmitted() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const [listing, setListing] = useState<HostListing | null>(null);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadHostData()
      .then(({ listings, bookings: hostBookings }) => {
        if (cancelled) return;
        setListing(listings.find((item) => item.id === listingId) ?? null);
        setBookings(hostBookings);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load listing status.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const currentStep = listing ? getCurrentStep(listing, bookings) : 1;
  const isSubmitted = Boolean(listing && listing.status !== "draft");
  const isRejected = listing?.status === "rejected";
  const isLive = listing?.status === "published";
  const isArchived = listing?.status === "archived";

  return (
    <main className="listing-success-page">
      <section className="listing-success-card" aria-labelledby="listing-success-title">
        <header className="listing-success-heading">
          <h1 id="listing-success-title">
            {loading ? "Loading listing status…" : error ? "Listing status unavailable" : isSubmitted ? "Listing Submitted Successfully" : "This listing hasn’t been submitted"}
          </h1>
          <p>
            {loading ? "Checking your listing details." : error ? "We couldn’t confirm the current status." : !isSubmitted ? "Finish submitting your listing to start the review process." : isArchived ? "This listing is no longer active." : isRejected ? "Your listing needs an update before it can go live." : isLive ? "Renters can discover your live space." : "Your listing is under review."}
          </p>
          <p className="listing-success-id">Listing ID-{listingId}</p>
        </header>

        {isAuthBypassEnabled() && (
          <p className="host-preview-notice" role="note">
            Local UI preview only. This listing is stored in this browser and was not sent to Spaceyaar.
          </p>
        )}

        {loading ? (
          <p className="host-state-message" role="status">Loading your listing status…</p>
        ) : error ? (
          <p className="host-state-error" role="alert">{error}</p>
        ) : !listing ? (
          <p className="host-state-error" role="alert">We couldn’t find this listing in your account.</p>
        ) : !isSubmitted ? (
          <p className="host-state-message">This draft is not in the review process yet.</p>
        ) : isArchived ? (
          <p className="host-state-message">This listing is archived and is no longer available to renters.</p>
        ) : (
          <ol className="listing-timeline" aria-label="Listing progress">
            {STEPS.map((step, index) => {
              const stepNumber = index + 1;
              const complete = stepNumber < currentStep;
              const active = stepNumber === currentStep;
              return (
                <li
                  key={step.title}
                  className={`listing-timeline-step${complete ? " is-complete" : ""}${active ? " is-current" : ""}`}
                  style={{ animationDelay: `${index * 240}ms` }}
                >
                  <span className="listing-timeline-marker" aria-label={complete || active ? "Complete" : `Step ${stepNumber}`}>
                    {complete || active && !isRejected ? <Check size={15} strokeWidth={3} /> : stepNumber}
                  </span>
                  <span className="listing-timeline-copy">
                    <strong>{isRejected && active ? "Needs your attention" : step.title}</strong>
                    <span>{isRejected && active ? "Review the listing details and contact our support team." : step.description}</span>
                  </span>
                  <span className="listing-timeline-time">{active ? (isRejected ? "Action needed" : step.timing) : step.timing}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="listing-success-actions">
          <Link className="listing-success-primary" href="/owner/dashboard">Go to Dashboard</Link>
          <Link className="listing-success-secondary" href="/owner">Add More</Link>
        </div>
      </section>
    </main>
  );
}
