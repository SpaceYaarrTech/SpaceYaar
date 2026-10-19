import { NextResponse } from "next/server";
import { parseListingDraft } from "@/lib/api/listing-input";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_COLUMNS = "id, title, description, property_type, area_value, area_unit, price_amount, price_model, min_booking_days, city, state, pincode, amenities, latitude, longitude, listing_photos(id, storage_path, label, position)";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data, error } = await supabase.from("listings").select(PUBLIC_COLUMNS).eq("id", id).eq("status", "published").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    const listing = {
      ...data,
      listing_photos: [...(data.listing_photos ?? [])]
        .sort((first, second) => first.position - second.position)
        .map((photo) => ({
          ...photo,
          image_url: supabase.storage.from("listing-photos").getPublicUrl(photo.storage_path).data.publicUrl,
        })),
    };
    return NextResponse.json({ listing });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to update this listing." }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const parsed = parseListingDraft(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { data, error } = await supabase
      .from("listings")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", user.id)
      .in("status", ["draft", "pending_review", "rejected"])
      .select("id, status")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Editable listing not found." }, { status: 404 });
    return NextResponse.json({ listing: data });
  } catch {
    return NextResponse.json({ error: "Could not update listing." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to delete this listing." }, { status: 401 });

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, listing_photos(storage_path), listing_documents(storage_path)")
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("status", "draft")
      .maybeSingle();
    if (listingError) return NextResponse.json({ error: listingError.message }, { status: 400 });
    if (!listing) return NextResponse.json({ error: "Draft listing not found." }, { status: 404 });

    const photoPaths = listing.listing_photos.map((photo) => photo.storage_path);
    const documentPaths = listing.listing_documents.map((document) => document.storage_path);
    if (photoPaths.length) {
      const { error } = await supabase.storage.from("listing-photos").remove(photoPaths);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (documentPaths.length) {
      const { error } = await supabase.storage.from("kyc-documents").remove(documentPaths);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { error } = await supabase.from("listings").delete().eq("id", id).eq("owner_id", user.id).eq("status", "draft");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Could not delete draft listing." }, { status: 400 });
  }
}
