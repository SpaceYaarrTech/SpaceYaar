import { HostSearch } from "@/components/owner/HostSearch";
import { Suspense } from "react";

export default function HostSpacesPage() {
  return <Suspense fallback={<main className="host-page-section">Loading spaces…</main>}><HostSearch /></Suspense>;
}
