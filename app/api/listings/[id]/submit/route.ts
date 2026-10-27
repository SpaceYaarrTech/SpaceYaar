import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to submit this listing." }, { status: 401 });

    const { count: photoCount, error: photoError } = await supabase
      .from("listing_photos")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id);
    if (photoError) return NextResponse.json({ error: photoError.message }, { status: 400 });

    const { count: documentCount, error: documentError } = await supabase
      .from("listing_documents")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id);
    if (documentError) return NextResponse.json({ error: documentError.message }, { status: 400 });

    if (!photoCount || !documentCount) {
      return NextResponse.json({ error: "Add at least one space photo and one KYC document before submitting." }, { status: 400 });
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
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // A resubmission starts a fresh review: drop review-stage rows from any
    // previous round so the owner's progress screen begins from step one.
    try {
      const admin = createAdminClient();
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
  } catch {
    return NextResponse.json({ error: "Could not submit listing." }, { status: 400 });
  }
}
