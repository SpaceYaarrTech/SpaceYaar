"use client";

import { useEffect, useState } from "react";
import { RazorpayCheckoutButton } from "@/components/renter/RazorpayCheckoutButton";

type Booking = {
  id: string;
  start_date: string;
  end_date: string;
  status: "requested" | "accepted" | "rejected" | "cancelled" | "completed";
  quoted_total: number;
  payment_status: "created" | "captured" | "failed" | null;
  listings: { title: string; city: string; property_type: string } | null;
};

export default function HistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    fetch("/api/bookings", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { bookings?: Booking[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load bookings.");
        if (current) setBookings(result.bookings ?? []);
      })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : "Could not load bookings.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  return (
    <main style={{ background: "#f7f8f7", minHeight: "100svh", padding: "32px 20px", color: "#17221f" }}>
      <section style={{ maxWidth: 680, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 32 }}>Booking history</h1>
        <p style={{ color: "#62716b", margin: "0 0 24px" }}>Track your requests and pay securely after a booking is accepted.</p>
        {loading && <p role="status">Loading bookings…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && bookings.length === 0 && <p>You have no bookings yet.</p>}
        <div style={{ display: "grid", gap: 14 }}>
          {bookings.map((booking) => (
            <article key={booking.id} style={{ background: "#fff", border: "1px solid #e2e8e5", borderRadius: 14, padding: 18 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 19 }}>{booking.listings?.title ?? "Storage booking"}</h2>
              <p style={{ margin: "0 0 8px", color: "#62716b" }}>
                {booking.listings?.city ?? "Location unavailable"} · {new Date(booking.start_date).toLocaleDateString()} – {new Date(booking.end_date).toLocaleDateString()}
              </p>
              <p style={{ margin: "0 0 12px" }}>
                Status: <strong>{booking.status}</strong> · ₹{Number(booking.quoted_total).toLocaleString("en-IN")}
              </p>
              {booking.status === "accepted" && booking.payment_status !== "captured" && (
                <RazorpayCheckoutButton bookingId={booking.id} />
              )}
              {booking.payment_status === "captured" && <p role="status">Payment received.</p>}
              {booking.status === "requested" && <p style={{ marginBottom: 0, color: "#62716b" }}>Payment will be available after the owner accepts.</p>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
