import { NextResponse } from "next/server";
import { isAllowlistedAdmin } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (!isAllowlistedAdmin(user.id)) {
    return { error: NextResponse.json({ error: "You are not authorized to review listings." }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  try {
    const access = await getAdminUser();
    if ("error" in access) return access.error;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("listings")
      .select("id, owner_id, title, description, property_type, price_amount, price_model, address, pincode, city, state, created_at, listing_photos(id, storage_path, label, position), listing_documents(id, storage_path, document_type)")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(50);
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
