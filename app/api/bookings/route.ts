import { NextResponse } from "next/server";
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
    const body = await request.json() as { listingId?: unknown; startDate?: unknown; endDate?: unknown; message?: unknown };
    if (typeof body.listingId !== "string" || typeof body.startDate !== "string" || typeof body.endDate !== "string") {
      return NextResponse.json({ error: "Listing and booking dates are required." }, { status: 400 });
    }

    const startTime = Date.parse(`${body.startDate}T00:00:00Z`);
    const endTime = Date.parse(`${body.endDate}T00:00:00Z`);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
      return NextResponse.json({ error: "Choose a valid booking date range." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to request a booking." }, { status: 401 });

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, owner_id, price_amount, price_model, min_booking_days")
      .eq("id", body.listingId)
      .eq("status", "published")
      .maybeSingle();
    if (listingError || !listing) return NextResponse.json({ error: "Published listing not found." }, { status: 404 });
    if (listing.owner_id === user.id) return NextResponse.json({ error: "You cannot book your own listing." }, { status: 400 });

    const days = Math.ceil((endTime - startTime) / 86_400_000);
    if (days < listing.min_booking_days) {
      return NextResponse.json({ error: `Minimum booking duration is ${listing.min_booking_days} days.` }, { status: 400 });
    }

    const billingUnits = listing.price_model === "Per Week"
      ? Math.ceil(days / 7)
      : listing.price_model === "Per Month"
        ? Math.ceil(days / 30)
        : days;
    const quotedTotal = Number(listing.price_amount) * billingUnits;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        listing_id: listing.id,
        renter_id: user.id,
        owner_id: listing.owner_id,
        start_date: body.startDate,
        end_date: body.endDate,
        message,
        quoted_total: quotedTotal,
      })
      .select("id, listing_id, start_date, end_date, status, quoted_total, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ booking: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create booking request." }, { status: 400 });
  }
}
