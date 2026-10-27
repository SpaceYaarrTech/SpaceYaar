"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type AccessState = "checking" | "allowed" | "unauthorized";

/**
 * Page-level guard for the admin portal. Unauthenticated visitors are sent
 * to /login; signed-in users who are not allowlisted admins see a friendly
 * refusal. Every admin API route re-checks access server-side regardless.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>("checking");

  const checkAccess = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/admin/access", { cache: "no-store", signal });
      if (response.status === 401) {
        setAccess("unauthorized");
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        setAccess("unauthorized");
        return;
      }
      setAccess("allowed");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setAccess("unauthorized");
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    void checkAccess(controller.signal);
    return () => controller.abort();
  }, [checkAccess]);

  if (access === "checking") {
    return (
      <main className="admin-review-page" aria-live="polite">
        <p role="status">Checking admin access…</p>
      </main>
    );
  }

  if (access === "unauthorized") {
    return (
      <main className="admin-review-page">
        <header className="admin-review-header">
          <div>
            <p>SpaceYaar internal tools</p>
            <h1>Listing review</h1>
          </div>
        </header>
        <p className="admin-review-error" role="alert">
          This portal is only available to the allowlisted SpaceYaar admin account. Sign in with the
          approved account, or go back to your dashboard.
        </p>
        <p className="admin-review-notice">
          Access is checked against the admin email allowlist on every request.
        </p>
        <p><Link href="/owner/dashboard">Go to dashboard</Link></p>
      </main>
    );
  }

  return <>{children}</>;
}
