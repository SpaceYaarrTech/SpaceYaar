import { NextResponse } from "next/server";
import { bookingErrorMessage, bookingErrorStatus, isRecord, isValidBookingDate } from "@/lib/api/booking-rules";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view bookings." }, { status: 401 });

    const { data, error } = await supabase
      .from("bookings")
      .select("id, listing_id, renter_id, owner_id, start_date, end_date, message, status, quoted_total, created_at, listings(id, title, city, state, property_type, listing_photos(storage_path, position))")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const bookings = (data ?? []).map((booking) => {
      const listing = Array.isArray(booking.listings) ? booking.listings[0] : booking.listings;
      return {
        ...booking,
        listings: listing ? {
          ...listing,
          listing_photos: [...listing.listing_photos]
            .sort((first, second) => first.position - second.position)
            .map((photo) => ({
              ...photo,
              image_url: supabase.storage.from("listing-photos").getPublicUrl(photo.storage_path).data.publicUrl,
            })),
        } : null,
      };
    });
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || bookings.length === 0) {
      return NextResponse.json({ bookings: bookings.map((booking) => ({ ...booking, payment_status: null })) });
    }

    const admin = createAdminClient();
    const { data: payments, error: paymentsError } = await admin
      .from("razorpay_payments")
      .select("booking_id, status")
      .in("booking_id", bookings.map((booking) => booking.id))
      .eq("status", "captured");
    if (paymentsError) return NextResponse.json({ error: "Could not load booking payment status." }, { status: 500 });
    const paidBookingIds = new Set((payments ?? []).map((payment) => payment.booking_id));
    return NextResponse.json({
      bookings: bookings.map((booking) => ({
        ...booking,
        payment_status: paidBookingIds.has(booking.id) ? "captured" : null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (!isRecord(body) || typeof body.listingId !== "string" || !body.listingId.trim()
      || !isValidBookingDate(body.startDate) || !isValidBookingDate(body.endDate)) {
      return NextResponse.json({ error: "Listing and booking dates are required." }, { status: 400 });
    }

    if (body.endDate <= body.startDate) {
      return NextResponse.json({ error: "Choose a valid booking date range." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to request a booking." }, { status: 401 });

    const { data, error } = await supabase.rpc("create_booking_request", {
      p_listing_id: body.listingId,
      p_start_date: body.startDate,
      p_end_date: body.endDate,
      p_message: typeof body.message === "string" ? body.message.trim().slice(0, 500) : "",
    });
    if (error) {
      return NextResponse.json(
        { error: bookingErrorMessage(error.message) },
        { status: bookingErrorStatus(error.code, error.message) },
      );
    }
    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (error) {
    console.error("Booking request creation failed:", error);
    return NextResponse.json({ error: "Could not create booking request." }, { status: 500 });
  }
}
