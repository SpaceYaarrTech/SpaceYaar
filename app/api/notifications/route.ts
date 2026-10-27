import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Notifications for the signed-in user (RLS scopes rows to the caller).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

    const { data, error } = await supabase
      .from("notifications")
      .select("id, kind, title, body, link, listing_id, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("Could not load notifications:", error.message);
      return NextResponse.json({ error: "Could not load notifications." }, { status: 500 });
    }

    return NextResponse.json({ notifications: data ?? [] });
  } catch (error) {
    console.error("Notifications request failed:", error);
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500 });
  }
}
