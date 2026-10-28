import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const errorMessage = (error: { message: string } | null, fallback: string) =>
  error?.message.trim() || fallback;

const isMissingMediaTypeColumn = (error: { code?: string; message: string; details?: string | null; hint?: string | null }) =>
  error.code === "42703" || [error.message, error.details, error.hint].some((value) => value?.includes("media_type"));

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to submit this listing." }, { status: 401 });

    const { data: editableListing, error: listingError } = await supabase
      .from("listings")
      .select("id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .in("status", ["draft", "rejected"])
      .maybeSingle();
    if (listingError) {
      return NextResponse.json({ error: errorMessage(listingError, "Could not verify this listing.") }, { status: 400 });
    }
    if (!editableListing) {
      return NextResponse.json({
        error: "This listing was not found or is no longer an editable draft. Refresh your listings and try again.",
      }, { status: 409 });
    }

    const admin = createAdminClient();
    let { data: photos, error: photoError } = await admin
      .from("listing_photos")
      .select("id, media_type")
      .eq("listing_id", id);
    if (photoError && isMissingMediaTypeColumn(photoError)) {
      const fallback = await admin
        .from("listing_photos")
        .select("id")
        .eq("listing_id", id);
      photos = fallback.data?.map((photo) => ({ ...photo, media_type: "image" })) ?? null;
      photoError = fallback.error;
    }
    if (photoError) {
      console.error("Could not verify listing photos:", photoError);
      return NextResponse.json({ error: errorMessage(photoError, "Could not verify listing photos.") }, { status: 400 });
    }
    const photoCount = photos?.length ?? 0;
    const imageCount = photos?.filter((photo) => !("media_type" in photo) || photo.media_type === "image").length ?? 0;

    const { count: aadhaarCount, error: aadhaarError } = await admin
      .from("listing_documents")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id)
      .eq("document_type", "Aadhaar Card");
    if (aadhaarError) {
      console.error("Could not verify Aadhaar document:", aadhaarError);
      return NextResponse.json({ error: errorMessage(aadhaarError, "Could not verify the Aadhaar document. Please try again.") }, { status: 400 });
    }

    if (photoCount < 2 || imageCount < 2) {
      return NextResponse.json({ error: "Add at least two space photos before submitting." }, { status: 400 });
    }

    if (!aadhaarCount) {
      return NextResponse.json({ error: "Upload your Aadhaar card before submitting." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("listings")
      .update({
        status: "pending_review",
        updated_at: new Date().toISOString(),
        rejection_reason: null,
        reviewed_at: null,
      })
      .eq("id", id)
      .eq("owner_id", user.id)
      .in("status", ["draft", "rejected"])
      .select("id, status")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: errorMessage(error, "Could not update this listing. Please refresh and try again.") }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({
        error: "This listing was not found or is no longer an editable draft. Refresh your listings and try again.",
      }, { status: 409 });
    }

    // A resubmission starts a fresh review: drop review-stage rows from any
    // previous round so the owner's progress screen begins from step one.
    try {
      const { error: progressError } = await admin
        .from("listing_review_progress")
        .delete()
        .eq("listing_id", id);
      if (progressError) {
        console.error("Could not reset listing review progress:", progressError.message);
      }
    } catch (cause) {
      console.error("Could not reset listing review progress:", cause);
    }

    return NextResponse.json({ listing: data });
  } catch (cause) {
    console.error("Could not submit listing:", cause);
    return NextResponse.json({ error: "Could not submit listing. Please try again or contact support." }, { status: 503 });
  }
}
