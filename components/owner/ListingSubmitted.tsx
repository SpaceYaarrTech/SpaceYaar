"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useParams } from "next/navigation";
import { isAuthBypassEnabled } from "@/lib/auth/auth-bypass";
import { loadHostData, type HostBooking, type HostListing } from "@/lib/owner/host-data";

/**
 * Review stages mirror the admin portal actions:
 * 1. submitted           -> owner submitted (status pending_review)
 * 2. viewed              -> admin opened the photos/documents
 * 3. assets_approved     -> admin approved the photos/documents
 * 4. published           -> admin approved and published (listing is live)
 * 5. first booking       -> a renter booked the space
 */
const STEPS = [
  { title: "Listing Submitted", description: "Listing received by the SpaceYaar team" },
  { title: "Document Check", description: "Our team opens and checks your photos and documents" },
  { title: "Photos & Documents Approved", description: "Your uploads passed the verification check" },
  { title: "Listing Goes Live", description: "Your space appears in renter search results" },
  { title: "First Booking", description: "Renters discover and book your space" },
] as const;

type StepFlags = {
  complete: boolean[];
  rejected: boolean;
  live: boolean;
  viewed: boolean;
  assetsApproved: boolean;
};

function getStepFlags(listing: HostListing, bookings: HostBooking[]): StepFlags {
  const stages = new Set((listing.review_progress ?? []).map((entry) => entry.stage));
  const viewed = stages.has("viewed");
  const assetsApproved = stages.has("assets_approved");
  const live = listing.status === "published";
  const rejected = listing.status === "rejected";
  const hasBooking = bookings.some(
    (booking) => booking.listing_id === listing.id && booking.status !== "rejected" && booking.status !== "cancelled",
  );
  return {
    // The timeline only renders for submitted listings, so step 1 is done.
    complete: [
      true,
      viewed || assetsApproved || live,
      assetsApproved || live,
      live,
      hasBooking,
    ],
    rejected,
    live,
    viewed,
    assetsApproved,
  };
}

const PENDING_POLL_MS = 6000;
const SETTLED_POLL_MS = 30000;

export function ListingSubmitted() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const [listing, setListing] = useState<HostListing | null>(null);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { listings, bookings: hostBookings } = await loadHostData();
    const found = listings.find((item) => item.id === listingId) ?? null;
    setListing(found);
    setBookings(hostBookings);
    return found;
  }, [listingId]);

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load listing status.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Poll so admin review actions (viewed -> photos approved -> published)
  // advance this timeline live while the owner keeps the page open. Polling
  // is faster while review is in progress, then slows to keep booking status
  // fresh once the listing settles.
  const status = listing?.status ?? "pending_review";
  const pollMs = status === "pending_review" ? PENDING_POLL_MS : SETTLED_POLL_MS;

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh()
        .then(() => setError(""))
        .catch(() => {
          // Transient refresh failures keep the last known state on screen.
        });
    }, pollMs);
    return () => window.clearInterval(interval);
  }, [refresh, pollMs]);

  const flags = listing ? getStepFlags(listing, bookings) : null;
  const isSubmitted = Boolean(listing && listing.status !== "draft");
  const isRejected = listing?.status === "rejected";
  const isLive = listing?.status === "published";
  const isArchived = listing?.status === "archived";
  const rejectionReason = listing?.rejection_reason;

  const currentStep = flags ? flags.complete.findIndex((done) => !done) : -1;
  const activeStepIndex = currentStep === -1 ? STEPS.length : currentStep;

  const stepState = (index: number) => {
    if (!flags) return { complete: false, active: false };
    return { complete: flags.complete[index], active: index === activeStepIndex };
  };

  const stepTiming = (index: number) => {
    const { complete, active } = stepState(index);
    if (active) return isRejected ? "Action needed" : "In progress";
    if (complete) return "Done";
    return "Pending";
  };

  const actions: Array<{ href: string; label: string; primary?: boolean }> = isRejected
    ? [
        { href: `/owner/listings/${encodeURIComponent(listingId)}`, label: "Update listing", primary: true },
        { href: "/owner/dashboard", label: "Go to Dashboard" },
      ]
    : [
        { href: "/owner/dashboard", label: "Go to Dashboard", primary: !isLive },
        { href: "/owner", label: "Add More" },
      ];

  return (
    <main className="listing-success-page">
      <section className="listing-success-card" aria-labelledby="listing-success-title">
        <header className="listing-success-heading">
          <h1 id="listing-success-title">
            {loading ? "Loading listing status…" : error ? "Listing status unavailable" : isLive ? "Your Listing is Now Live" : isSubmitted ? "Listing Submitted Successfully" : "This listing hasn’t been submitted"}
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

        {isLive && !loading && (
          <div className="listing-live-cta">
            <Link className="listing-success-primary" href={`/listings/${encodeURIComponent(listingId)}`}>
              View your listing →
            </Link>
          </div>
        )}

        {isRejected && rejectionReason && (
          <p className="listing-rejection-note" role="status">
            <strong>Reviewer feedback:</strong> {rejectionReason}
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
              const { complete, active } = stepState(index);
              const showCheck = complete || (active && !isRejected);
              return (
                <li
                  key={step.title}
                  className={`listing-timeline-step${complete ? " is-complete" : ""}${active ? " is-current" : ""}`}
                  style={{ animationDelay: `${index * 240}ms` }}
                >
                  <span className="listing-timeline-marker" aria-label={showCheck ? "Complete" : `Step ${stepNumber}`}>
                    {showCheck ? <Check size={15} strokeWidth={3} /> : stepNumber}
                  </span>
                  <span className="listing-timeline-copy">
                    <strong>{isRejected && active ? "Needs your attention" : step.title}</strong>
                    <span>{isRejected && active ? (rejectionReason ?? "Review the listing details and contact our support team.") : step.description}</span>
                  </span>
                  <span className="listing-timeline-time">{stepTiming(index)}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="listing-success-actions">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={action.primary ? "listing-success-primary" : "listing-success-secondary"}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
