import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;

    const admin = createAdminClient();
    const reviewProgressEmbed = "listing_review_progress(stage, created_at)";
    const baseSelect = "id, owner_id, title, description, property_type, price_amount, price_model, address, pincode, city, state, created_at, listing_photos(id, storage_path, label, position), listing_documents(id, storage_path, document_type)";
    let { data, error } = await admin
      .from("listings")
      .select(`${baseSelect}, ${reviewProgressEmbed}`)
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error && error.message.includes("listing_review_progress")) {
      // Review-progress migration not applied yet: serve the queue without stages.
      const fallback = await admin
        .from("listings")
        .select(baseSelect)
        .eq("status", "pending_review")
        .order("created_at", { ascending: true })
        .limit(50);
      data = fallback.data as typeof data;
      error = fallback.error;
    }
    if (error) {
      console.error("Could not load pending listing reviews:", error.message);
      return NextResponse.json({ error: "Could not load pending listings." }, { status: 500 });
    }

    const ownerIds = [...new Set((data ?? []).map((listing) => listing.owner_id))];
    const { data: owners, error: ownersError } = ownerIds.length
      ? await admin.from("profiles").select("id, display_name, phone, business_name, business_type").in("id", ownerIds)
      : { data: [], error: null };
    if (ownersError) {
      console.error("Could not load listing owner details:", ownersError.message);
      return NextResponse.json({ error: "Could not load listing owner details." }, { status: 500 });
    }
    const ownerById = new Map((owners ?? []).map((owner) => [owner.id, owner]));

    const reviewedListings = await Promise.all((data ?? []).map(async (listing) => {
      const documents = await Promise.all(listing.listing_documents.map(async (document) => {
        const { data: signed, error: signedError } = await admin.storage
          .from("kyc-documents")
          .createSignedUrl(document.storage_path, 600);
        if (signedError) throw new Error(`Could not create a review link for ${document.document_type}.`);
        return { id: document.id, document_type: document.document_type, signed_url: signed.signedUrl };
      }));

      return {
        ...listing,
        owner: ownerById.get(listing.owner_id) ?? null,
        review_progress: listing.listing_review_progress ?? [],
        listing_photos: [...listing.listing_photos]
          .sort((first, second) => first.position - second.position)
          .map((photo) => ({
            ...photo,
            image_url: admin.storage.from("listing-photos").getPublicUrl(photo.storage_path).data.publicUrl,
          })),
        listing_documents: documents,
      };
    }));

    return NextResponse.json({ listings: reviewedListings });
  } catch (error) {
    console.error("Listing review queue failed:", error);
    return NextResponse.json({ error: "Could not load listing reviews." }, { status: 500 });
  }
}
