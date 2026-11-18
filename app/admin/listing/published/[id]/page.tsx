import Link from "next/link";

/**
 * Landing after an admin publishes a listing on behalf of an owner. The
 * normal /owner/submitted verification timeline never applies here — the
 * listing went live on submit — so this confirmation offers the exits that
 * matter: the live listing, another on-behalf listing, or the review queue.
 */
export default async function AdminListingPublishedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listingId = encodeURIComponent(id);

  return (
    <main className="admin-review-page">
      <header className="admin-review-header">
        <div>
          <p>SpaceYaar internal tools</p>
          <h1>Listing published</h1>
        </div>
      </header>

      <section className="admin-onbehalf-card">
        <p className="admin-onbehalf-lede">
          The listing is live on SpaceYaar. It skipped verification because it was created on behalf of an
          owner, and renters can find it in search now.
        </p>
        <div className="admin-review-actions">
          <Link href={`/listings/${listingId}`} className="admin-onbehalf-primary">View listing</Link>
          <Link href="/admin/listing">List for another owner</Link>
          <Link href="/admin/review">Back to review</Link>
        </div>
      </section>
    </main>
  );
}
