import { NextResponse } from "next/server";
import { isAllowlistedAdmin } from "@/lib/auth/admin-access";
import { isRecord } from "@/lib/api/booking-rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    if (!isAllowlistedAdmin(user.id)) {
      return NextResponse.json({ error: "You are not authorized to review listings." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (!isRecord(body) || (body.decision !== "approved" && body.decision !== "rejected")) {
      return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (body.decision === "rejected" && !reason) {
      return NextResponse.json({ error: "A reason is required when rejecting a listing." }, { status: 400 });
    }
    const { id } = await context.params;

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("moderate_listing", {
      p_listing_id: id,
      p_admin_user_id: user.id,
      p_decision: body.decision,
      p_reason: reason || null,
    });
    if (error) {
      if (error.code === "P0002") return NextResponse.json({ error: "This listing is no longer awaiting review." }, { status: 404 });
      console.error("Could not record listing review:", error.message);
      return NextResponse.json({ error: "Could not update listing review status." }, { status: 500 });
    }
    return NextResponse.json({ listing: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    console.error("Listing review action failed:", error);
    return NextResponse.json({ error: "Could not review this listing." }, { status: 500 });
  }
}
