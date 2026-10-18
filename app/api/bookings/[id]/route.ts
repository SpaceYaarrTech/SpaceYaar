import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { status?: unknown };
    if (body.status !== "accepted" && body.status !== "rejected" && body.status !== "cancelled") {
      return NextResponse.json({ error: "Unsupported booking status." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to update this booking." }, { status: 401 });

    const { data: booking, error } = await supabase
      .from("bookings")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, renter_id, owner_id, status")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!booking) return NextResponse.json({ error: "Booking not found or you cannot make that change." }, { status: 404 });
    return NextResponse.json({ booking });
  } catch {
    return NextResponse.json({ error: "Could not update booking." }, { status: 400 });
  }
}
