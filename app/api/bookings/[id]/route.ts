import { NextResponse } from "next/server";
import { bookingErrorMessage, bookingErrorStatus, isBookingStatus, isRecord } from "@/lib/api/booking-rules";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (!isRecord(body) || !isBookingStatus(body.status)) {
      return NextResponse.json({ error: "Unsupported booking status." }, { status: 400 });
    }
    const nextStatus = body.status;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to update this booking." }, { status: 401 });

    const { data: booking, error } = await supabase.rpc("transition_booking", {
      p_booking_id: id,
      p_next_status: nextStatus,
    });
    if (error) {
      return NextResponse.json(
        { error: bookingErrorMessage(error.message) },
        { status: bookingErrorStatus(error.code, error.message) },
      );
    }
    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Booking transition failed:", error);
    return NextResponse.json({ error: "Could not update booking." }, { status: 500 });
  }
}
