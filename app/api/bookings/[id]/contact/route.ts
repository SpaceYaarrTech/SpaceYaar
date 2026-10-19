import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to contact the owner." }, { status: 401 });

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, owner_id, status")
      .eq("id", id)
      .eq("renter_id", user.id)
      .maybeSingle();
    if (bookingError) {
      console.error("Could not load owner contact booking:", bookingError.message);
      return NextResponse.json({ error: "Could not load this booking." }, { status: 500 });
    }
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status !== "accepted") {
      return NextResponse.json({ error: "Owner contact details are available after a booking is accepted." }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: owner, error: ownerError } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", booking.owner_id)
      .maybeSingle();
    if (ownerError) {
      console.error("Could not load owner phone:", ownerError.message);
      return NextResponse.json({ error: "Could not load owner contact details." }, { status: 500 });
    }
    return NextResponse.json({ phone: owner?.phone ?? null });
  } catch (error) {
    console.error("Owner contact lookup failed:", error);
    return NextResponse.json({ error: "Owner contact is not configured." }, { status: 503 });
  }
}
