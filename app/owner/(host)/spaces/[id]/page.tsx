import { Suspense } from "react";
import { HostSpaceDetails } from "@/components/owner/HostSearch";

export default function HostSpaceDetailsPage() {
  return <Suspense fallback={<main className="host-page-section">Loading space…</main>}><HostSpaceDetails /></Suspense>;
}
