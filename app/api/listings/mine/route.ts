import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view your listings." }, { status: 401 });

    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_photos(id, storage_path, label, position), listing_documents(id, storage_path, document_type)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const listings = await Promise.all((data ?? []).map(async (listing) => {
      const documents = await Promise.all(listing.listing_documents.map(async (document: { id: string; storage_path: string; document_type: string }) => {
        const { data: signedFile, error: signedUrlError } = await supabase.storage
          .from("kyc-documents")
          .createSignedUrl(document.storage_path, 300);
        return { ...document, signed_url: signedUrlError ? null : signedFile.signedUrl };
      }));

      return {
        ...listing,
        listing_photos: listing.listing_photos.map((photo: { id: string; storage_path: string; label: string; position: number }) => ({
          ...photo,
          image_url: supabase.storage.from("listing-photos").getPublicUrl(photo.storage_path).data.publicUrl,
        })),
        listing_documents: documents,
      };
    }));

    return NextResponse.json({ listings });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}
