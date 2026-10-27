import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { isRecord } from "@/lib/api/booking-rules";
import { createAdminClient } from "@/lib/supabase/admin";

const STAGES = ["viewed", "assets_approved"] as const;
type ReviewStage = (typeof STAGES)[number];

/**
 * Records a granular review stage for a listing that is awaiting review.
 * Idempotent: recording a stage twice keeps the original timestamp and the
 * owner only sees each stage once. The owner's progress screen reads these
 * rows (through RLS) to advance its steps.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (!isRecord(body) || typeof body.stage !== "string" || !STAGES.includes(body.stage as ReviewStage)) {
      return NextResponse.json({ error: "Choose a valid review stage." }, { status: 400 });
    }
    const stage = body.stage as ReviewStage;
    const { id } = await context.params;

    const admin = createAdminClient();
    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();
    if (listingError) {
      console.error("Could not load listing for review progress:", listingError.message);
      return NextResponse.json({ error: "Could not update review progress." }, { status: 500 });
    }
    if (!listing || listing.status !== "pending_review") {
      return NextResponse.json({ error: "This listing is no longer awaiting review." }, { status: 404 });
    }

    const { error: upsertError } = await admin
      .from("listing_review_progress")
      .upsert(
        { listing_id: id, stage, admin_user_id: guard.user.id },
        { onConflict: "listing_id,stage", ignoreDuplicates: true },
      );
    if (upsertError) {
      console.error("Could not record listing review progress:", upsertError.message);
      return NextResponse.json({ error: "Could not update review progress." }, { status: 500 });
    }

    const { data: stages, error: stagesError } = await admin
      .from("listing_review_progress")
      .select("stage, created_at")
      .eq("listing_id", id)
      .order("created_at", { ascending: true });
    if (stagesError) {
      console.error("Could not load listing review progress:", stagesError.message);
      return NextResponse.json({ error: "Could not update review progress." }, { status: 500 });
    }

    return NextResponse.json({ stage, stages: stages ?? [] });
  } catch (error) {
    console.error("Listing review progress failed:", error);
    return NextResponse.json({ error: "Could not update review progress." }, { status: 500 });
  }
}
