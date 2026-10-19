import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view saved spaces." }, { status: 401 });

    const { data, error } = await supabase
      .from("favorites")
      .select("listing_id, created_at, listings(id, title, description, property_type, area_value, area_unit, price_amount, price_model, city, state, pincode, amenities, latitude, longitude, listing_photos(storage_path, label, position))")
      .eq("renter_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const favorites = (data ?? []).map((favorite) => {
      const listing = Array.isArray(favorite.listings) ? favorite.listings[0] : favorite.listings;
      return {
        ...favorite,
        listings: listing ? {
        ...listing,
        listing_photos: [...(listing.listing_photos ?? [])]
          .sort((first, second) => first.position - second.position)
          .map((photo) => ({
            ...photo,
            image_url: supabase.storage.from("listing-photos").getPublicUrl(photo.storage_path).data.publicUrl,
          })),
        } : null,
      };
    });

    return NextResponse.json({ favorites });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { listingId?: unknown };
    if (typeof body.listingId !== "string") return NextResponse.json({ error: "A listing ID is required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to save a space." }, { status: 401 });

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id")
      .eq("id", body.listingId)
      .eq("status", "published")
      .maybeSingle();
    if (listingError || !listing) return NextResponse.json({ error: "Published listing not found." }, { status: 404 });

    const { error } = await supabase.from("favorites").insert({ renter_id: user.id, listing_id: listing.id });
    if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "Could not save this space." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const listingId = new URL(request.url).searchParams.get("listingId");
    if (!listingId) return NextResponse.json({ error: "A listing ID is required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to remove a saved space." }, { status: 401 });

    const { error } = await supabase.from("favorites").delete().eq("renter_id", user.id).eq("listing_id", listingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ saved: false });
  } catch {
    return NextResponse.json({ error: "Could not remove this saved space." }, { status: 400 });
  }
}
