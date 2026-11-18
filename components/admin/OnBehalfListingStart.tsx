"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { writeOnBehalfHandoff } from "@/lib/listing/on-behalf";

/**
 * Entry step for the admin "list on behalf of an owner" flow: resolve the
 * owner's SpaceYaar account from their email, park the context for the
 * wizard, and hand over to the shared listing screens at /owner.
 */
export function OnBehalfListingStart() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const startListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const trimmed = email.trim();
    if (!trimmed) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/owners/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const result = await response.json() as { owner?: { email: string; displayName: string }; error?: string };
      if (!response.ok || !result.owner) {
        throw new Error(result.error || "Could not find the owner's account.");
      }
      writeOnBehalfHandoff({ email: result.owner.email, displayName: result.owner.displayName });
      router.push("/owner");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not find the owner's account.");
      setBusy(false);
    }
  };

  return (
    <main className="admin-review-page">
      <header className="admin-review-header">
        <div>
          <p>SpaceYaar internal tools</p>
          <h1>List for an owner</h1>
        </div>
        <div className="admin-review-header-actions">
          <Link href="/admin/review">Back to review</Link>
        </div>
      </header>

      <section className="admin-onbehalf-card">
        <p className="admin-onbehalf-lede">
          Add the property on the owner&apos;s behalf using their SpaceYaar account email. The listing is
          published immediately — it skips the verification queue and appears in renter search right away.
        </p>

        <form className="admin-onbehalf-form" onSubmit={startListing}>
          <label htmlFor="onbehalf-owner-email">Owner&apos;s email</label>
          <input
            id="onbehalf-owner-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@example.com"
            autoComplete="off"
            spellCheck={false}
            required
          />
          <div className="admin-review-actions">
            <button type="submit" disabled={busy || !email.trim()}>
              {busy ? "Finding owner…" : "Continue to listing"}
            </button>
          </div>
        </form>

        {error && <p className="admin-review-error" role="alert">{error}</p>}

        <p className="admin-review-notice">
          The owner keeps the listing in their dashboard and gets a notification when it goes live. If the
          email has no SpaceYaar account yet, ask the owner to sign in once first.
        </p>
      </section>
    </main>
  );
}
