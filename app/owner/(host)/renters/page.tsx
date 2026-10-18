import { HostRenters } from "@/components/owner/HostSections";
import { Suspense } from "react";

export default function HostRentersPage() {
  return <Suspense fallback={<main className="host-page-section">Loading renter requests…</main>}><HostRenters /></Suspense>;
}
