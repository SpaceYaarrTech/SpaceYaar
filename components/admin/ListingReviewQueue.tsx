"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
  listing_photos: Array<{ id: string; label: string; image_url: string }>;
  listing_documents: Array<{ id: string; document_type: string; signed_url: string }>;
};

export function ListingReviewQueue() {
  const [listings, setListings] = useState<ReviewListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

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
        <Link href="/owner/dashboard">Exit review</Link>
      </header>
      <p className="admin-review-notice">Only user IDs configured in `SPACEYAAR_ADMIN_USER_IDS` can access this queue.</p>

      {loading ? <p role="status">Loading pending listings…</p>
        : error ? <p className="admin-review-error" role="alert">{error}</p>
          : listings.length === 0 ? <p className="admin-review-empty">No listings are waiting for review.</p>
            : (
              <div className="admin-review-list">
                {listings.map((listing) => (
                  <article className="admin-review-card" key={listing.id}>
                    <div className="admin-review-card-heading">
                      <div>
                        <h2>{listing.title}</h2>
                        <p>{listing.property_type} · {listing.city}, {listing.state}</p>
                      </div>
                      <span>Submitted {new Date(listing.created_at).toLocaleDateString()}</span>
                    </div>
                    {listing.listing_photos.length > 0 && (
                      <div className="admin-review-photos">
                        {listing.listing_photos.map((photo) => (
                          <Image key={photo.id} src={photo.image_url} alt={photo.label} width={160} height={110} unoptimized />
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
                        <a key={document.id} href={document.signed_url} target="_blank" rel="noreferrer">
                          View {document.document_type}
                        </a>
                      ))}
                    </div>
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
                      <button type="button" onClick={() => void review(listing.id, "approved")} disabled={busyId === listing.id}>
                        {busyId === listing.id ? "Saving…" : "Approve and publish"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
      {actionError && <p className="admin-review-error" role="alert">{actionError}</p>}
    </main>
  );
}
