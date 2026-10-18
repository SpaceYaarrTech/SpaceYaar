import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view renter requests." }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
    if (profile?.role !== "owner") return NextResponse.json({ error: "Choose the Owner role to view renter requests." }, { status: 403 });

    const { data, error } = await supabase
      .from("bookings")
      .select("id, listing_id, renter_id, owner_id, start_date, end_date, message, status, quoted_total, created_at, listings(title, city, property_type, area_value, area_unit), profiles!bookings_renter_id_fkey(display_name, phone)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ bookings: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}
