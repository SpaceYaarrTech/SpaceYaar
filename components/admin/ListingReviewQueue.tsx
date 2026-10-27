"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ReviewStage = { stage: "viewed" | "assets_approved"; created_at: string };

type ReviewListing = {
  id: string;
  title: string;
  description: string;
  property_type: string;
  price_amount: number;
  price_model: string;
  address: string;
  pincode: string | null;
  city: string;
  state: string;
  created_at: string;
  owner: {
    display_name: string | null;
    phone: string | null;
    business_name: string | null;
    business_type: string | null;
  } | null;
  listing_photos: Array<{ id: string; label: string; image_url: string; media_type?: string }>;
  listing_documents: Array<{ id: string; document_type: string; signed_url: string }>;
  review_progress: ReviewStage[];
};

const QUEUE_POLL_MS = 20000;

function hasStage(listing: ReviewListing, stage: ReviewStage["stage"]) {
  return listing.review_progress.some((entry) => entry.stage === stage);
}

function stageTime(listing: ReviewListing, stage: ReviewStage["stage"]) {
  const entry = listing.review_progress.find((item) => item.stage === stage);
  if (!entry) return null;
  return new Date(entry.created_at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ListingReviewQueue() {
  const [listings, setListings] = useState<ReviewListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [busyStageId, setBusyStageId] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ listingId: string; index: number } | null>(null);

  const loadListings = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/listings", { cache: "no-store", signal });
    const result = await response.json() as { listings?: ReviewListing[]; error?: string };
    if (!response.ok) throw new Error(result.error || "Could not load pending listings.");
    setListings(result.listings ?? []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadListings(controller.signal)
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Could not load pending listings.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [loadListings]);

  // Keep the queue fresh so new submissions appear without a manual reload,
  // and long review sessions pick up fresh document links (they expire).
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadListings().catch(() => {
        // Keep the last good snapshot on a transient poll failure.
      });
    }, QUEUE_POLL_MS);
    return () => window.clearInterval(interval);
  }, [loadListings]);

  /**
   * Records a review stage (idempotent server-side) and refreshes that
   * listing's stages from the response so owner-facing progress stays honest.
   */
  const recordStage = useCallback(async (listing: ReviewListing, stage: ReviewStage["stage"]) => {
    if (hasStage(listing, stage)) return true;
    setBusyStageId(`${listing.id}:${stage}`);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/listings/${encodeURIComponent(listing.id)}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const result = await response.json() as { stages?: ReviewStage[]; error?: string };
      if (!response.ok) {
        if (response.status === 404) {
          // The listing already left the queue; refresh to drop it.
          void loadListings().catch(() => undefined);
          return false;
        }
        throw new Error(result.error || "Could not update review progress.");
      }
      setListings((current) => current.map((item) => (
        item.id === listing.id ? { ...item, review_progress: result.stages ?? item.review_progress } : item
      )));
      return true;
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not update review progress.");
      return false;
    } finally {
      setBusyStageId("");
    }
  }, [loadListings]);

  const openPhoto = (listing: ReviewListing, index: number) => {
    setLightbox({ listingId: listing.id, index });
    // Viewing the photos counts as the "viewed" review stage for this listing.
    if (!hasStage(listing, "viewed")) void recordStage(listing, "viewed");
  };

  const approveAssets = async (listing: ReviewListing) => {
    if (!hasStage(listing, "viewed")) await recordStage(listing, "viewed");
    await recordStage(listing, "assets_approved");
  };

  const lightboxListing = lightbox ? listings.find((item) => item.id === lightbox.listingId) ?? null : null;
  const lightboxPhoto = lightboxListing && lightbox ? lightboxListing.listing_photos[lightbox.index] ?? null : null;

  useEffect(() => {
    if (!lightbox || !lightboxListing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowRight") {
        setLightbox((current) => current && {
          ...current,
          index: (current.index + 1) % (lightboxListing?.listing_photos.length || 1),
        });
      }
      if (event.key === "ArrowLeft") {
        setLightbox((current) => current && {
          ...current,
          index: (current.index - 1 + (lightboxListing?.listing_photos.length || 1)) % (lightboxListing?.listing_photos.length || 1),
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox, lightboxListing]);

  const review = async (listingId: string, decision: "approved" | "rejected") => {
    setBusyId(listingId);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/listings/${encodeURIComponent(listingId)}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: rejectionReasons[listingId]?.trim() ?? "",
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save the review decision.");
      setLightbox((current) => (current?.listingId === listingId ? null : current));
      setListings((current) => current.filter((listing) => listing.id !== listingId));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not save the review decision.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <main className="admin-review-page">
      <header className="admin-review-header">
        <div>
          <p>SpaceYaar internal tools</p>
          <h1>Listing review</h1>
        </div>
        <div className="admin-review-header-actions">
          <button type="button" className="admin-review-refresh" onClick={() => void loadListings().catch(() => undefined)} disabled={loading}>
            Refresh
          </button>
          <Link href="/owner/dashboard">Exit review</Link>
        </div>
      </header>
      <p className="admin-review-notice">
        Only the allowlisted admin account can review listings. Opening a photo or document marks it
        as viewed; approving photos advances the owner&apos;s progress before you publish.
      </p>

      {loading ? <p role="status">Loading pending listings…</p>
        : error ? <p className="admin-review-error" role="alert">{error}</p>
          : listings.length === 0 ? <p className="admin-review-empty">No listings are waiting for review.</p>
            : (
              <div className="admin-review-list">
                {listings.map((listing) => {
                  const viewed = hasStage(listing, "viewed");
                  const assetsApproved = hasStage(listing, "assets_approved");
                  const stageBusy = busyStageId.startsWith(`${listing.id}:`);
                  return (
                    <article className="admin-review-card" key={listing.id}>
                      <div className="admin-review-card-heading">
                        <div>
                          <h2>{listing.title}</h2>
                          <p>{listing.property_type} · {listing.city}, {listing.state}</p>
                        </div>
                        <span>Submitted {new Date(listing.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="admin-review-stages" aria-label="Review progress">
                        <span className="admin-review-stage-chip is-done">Submitted ✓</span>
                        <span className={`admin-review-stage-chip${viewed ? " is-done" : ""}`}>
                          {viewed ? `Photos viewed ✓ · ${stageTime(listing, "viewed")}` : "Photos not opened yet"}
                        </span>
                        <span className={`admin-review-stage-chip${assetsApproved ? " is-done" : ""}`}>
                          {assetsApproved ? `Photos approved ✓ · ${stageTime(listing, "assets_approved")}` : "Photos pending approval"}
                        </span>
                      </div>

                      {listing.listing_photos.length > 0 && (
                        <div className="admin-review-photos">
                          {listing.listing_photos.map((photo, index) => (
                            <button
                              key={photo.id}
                              type="button"
                              className="admin-review-photo-button"
                              onClick={() => openPhoto(listing, index)}
                              aria-label={`Open ${photo.label} full size`}
                            >
                              {photo.media_type === "video"
                                ? <video src={photo.image_url} className="admin-review-video-thumb" muted playsInline preload="metadata" />
                                : <Image src={photo.image_url} alt={photo.label} width={160} height={110} unoptimized />}
                            </button>
                          ))}
                        </div>
                      )}
                      <dl className="admin-review-details">
                        <div><dt>Owner</dt><dd>{listing.owner?.business_name || listing.owner?.display_name || "Not provided"}</dd></div>
                        <div><dt>Business type</dt><dd>{listing.owner?.business_type || "Not provided"}</dd></div>
                        <div><dt>Contact</dt><dd>{listing.owner?.phone || "Not provided"}</dd></div>
                        <div><dt>Address</dt><dd>{[listing.address, listing.pincode, listing.city, listing.state].filter(Boolean).join(", ")}</dd></div>
                        <div><dt>Rate</dt><dd>₹{Number(listing.price_amount).toLocaleString("en-IN")} / {listing.price_model.replace(/^Per /, "")}</dd></div>
                      </dl>
                      <p className="admin-review-description">{listing.description || "No description provided."}</p>
                      <div className="admin-review-documents">
                        <strong>Verification documents</strong>
                        {listing.listing_documents.map((document) => (
                          <a
                            key={document.id}
                            href={document.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => { if (!viewed) void recordStage(listing, "viewed"); }}
                          >
                            View {document.document_type}
                          </a>
                        ))}
                      </div>

                      {!assetsApproved && (
                        <div className="admin-review-stage-actions">
                          <button
                            type="button"
                            onClick={() => void approveAssets(listing)}
                            disabled={stageBusy || busyId === listing.id}
                          >
                            {stageBusy ? "Saving…" : "Approve photos & documents"}
                          </button>
                          <span className="admin-review-stage-hint">
                            Advances the owner&apos;s progress to “Photos approved”.
                          </span>
                        </div>
                      )}

                      <label className="admin-review-rejection">
                        Rejection reason (required to reject)
                        <textarea
                          maxLength={500}
                          rows={2}
                          value={rejectionReasons[listing.id] ?? ""}
                          onChange={(event) => setRejectionReasons((current) => ({ ...current, [listing.id]: event.target.value }))}
                        />
                      </label>
                      <div className="admin-review-actions">
                        <button type="button" onClick={() => void review(listing.id, "rejected")} disabled={busyId === listing.id || !rejectionReasons[listing.id]?.trim()}>
                          {busyId === listing.id ? "Saving…" : "Reject"}
                        </button>
                        <button type="button" onClick={() => void review(listing.id, "approved")} disabled={busyId === listing.id || stageBusy}>
                          {busyId === listing.id ? "Saving…" : "Approve and publish"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
      {actionError && <p className="admin-review-error" role="alert">{actionError}</p>}

      {lightbox && lightboxListing && lightboxPhoto && (
        <div className="admin-lightbox" role="dialog" aria-modal="true" aria-label={`${lightboxListing.title} photos`}>
          <div className="admin-lightbox-bar">
            <strong>{lightboxListing.title}</strong>
            <span>{lightbox.index + 1} / {lightboxListing.listing_photos.length}</span>
            <button type="button" onClick={() => setLightbox(null)} aria-label="Close photo viewer">Close ✕</button>
          </div>
          {lightboxPhoto.media_type === "video" ? (
            <video
              key={lightboxPhoto.id}
              src={lightboxPhoto.image_url}
              className="admin-lightbox-video"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <Image
              key={lightboxPhoto.id}
              src={lightboxPhoto.image_url}
              alt={lightboxPhoto.label}
              width={1200}
              height={800}
              unoptimized
              priority
            />
          )}
          <div className="admin-lightbox-controls">
            <button
              type="button"
              onClick={() => setLightbox((current) => current && { ...current, index: (current.index - 1 + lightboxListing.listing_photos.length) % lightboxListing.listing_photos.length })}
              aria-label="Previous photo"
            >
              ←
            </button>
            <span>{lightboxPhoto.label}</span>
            <button
              type="button"
              onClick={() => setLightbox((current) => current && { ...current, index: (current.index + 1) % lightboxListing.listing_photos.length })}
              aria-label="Next photo"
            >
              →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
