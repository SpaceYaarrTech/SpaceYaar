import { Suspense } from "react";
import { HostFilters } from "@/components/owner/HostSearch";

export default function HostFiltersPage() {
  return <Suspense fallback={<main className="host-page-section">Loading filters…</main>}><HostFilters /></Suspense>;
}
