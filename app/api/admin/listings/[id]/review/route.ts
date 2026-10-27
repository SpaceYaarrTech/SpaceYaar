import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { isRecord } from "@/lib/api/booking-rules";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (!isRecord(body) || (body.decision !== "approved" && body.decision !== "rejected")) {
      return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
    }
    const decision = body.decision;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (decision === "rejected" && !reason) {
      return NextResponse.json({ error: "A reason is required when rejecting a listing." }, { status: 400 });
    }
    const { id } = await context.params;

    const admin = createAdminClient();
    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, owner_id, title, status")
      .eq("id", id)
      .maybeSingle();
    if (listingError) {
      console.error("Could not load listing for review:", listingError.message);
      return NextResponse.json({ error: "Could not update listing review status." }, { status: 500 });
    }
    if (!listing || listing.status !== "pending_review") {
      return NextResponse.json({ error: "This listing is no longer awaiting review." }, { status: 404 });
    }

    const { data, error } = await admin.rpc("moderate_listing", {
      p_listing_id: id,
      p_admin_user_id: guard.user.id,
      p_decision: decision,
      p_reason: reason || null,
    });
    if (error) {
      if (error.code === "P0002") return NextResponse.json({ error: "This listing is no longer awaiting review." }, { status: 404 });
      console.error("Could not record listing review:", error.message);
      return NextResponse.json({ error: "Could not update listing review status." }, { status: 500 });
    }

    // Store the reviewer outcome on the listing so the owner can see it on
    // their progress screen (cleared again when the listing is resubmitted).
    const { error: outcomeError } = await admin
      .from("listings")
      .update({
        rejection_reason: decision === "rejected" ? reason : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (outcomeError) {
      console.error("Could not store listing review outcome:", outcomeError.message);
    }

    // Notify the owner. Failures here never fail the decision itself — the
    // moderation event is already recorded and the status already changed.
    if (listing.owner_id) {
      const notification = decision === "approved"
        ? {
            user_id: listing.owner_id,
            kind: "listing_approved",
            title: "Your listing is now live",
            body: `“${listing.title}” passed review and is visible to renters in search.`,
            link: `/listings/${id}`,
            listing_id: id,
          }
        : {
            user_id: listing.owner_id,
            kind: "listing_rejected",
            title: "Your listing needs an update",
            body: reason,
            link: `/owner/submitted/${id}`,
            listing_id: id,
          };
      const { error: notifyError } = await admin.from("notifications").insert(notification);
      if (notifyError) {
        console.error("Could not create listing review notification:", notifyError.message);
      }
    }

    return NextResponse.json({ listing: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    console.error("Listing review action failed:", error);
    return NextResponse.json({ error: "Could not review this listing." }, { status: 500 });
  }
}
