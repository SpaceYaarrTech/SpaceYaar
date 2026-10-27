import { NextResponse } from "next/server";
import { isRecord } from "@/lib/api/booking-rules";
import { createClient } from "@/lib/supabase/server";

/**
 * Marks the caller's notifications as read. With no id, every unread
 * notification for the user is marked read. RLS restricts updates to the
 * caller's own rows.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const id = isRecord(body) && typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;
    const now = new Date().toISOString();

    let query = supabase
      .from("notifications")
      .update({ read_at: now })
      .is("read_at", null);
    query = id ? query.eq("id", id) : query.eq("user_id", user.id);

    const { error } = await query;
    if (error) {
      console.error("Could not mark notifications read:", error.message);
      return NextResponse.json({ error: "Could not update notifications." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mark notifications read failed:", error);
    return NextResponse.json({ error: "Could not update notifications." }, { status: 500 });
  }
}
