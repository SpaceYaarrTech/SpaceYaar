import { NextResponse } from "next/server";
import { parseListingDraft } from "@/lib/api/listing-input";
import { listingMediaBucket } from "@/lib/listing-media";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_LISTING_COLUMNS = "id, title, description, property_type, area_value, area_unit, price_amount, price_model, min_booking_days, city, state, pincode, amenities, latitude, longitude, created_at, listing_photos(*)";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.trim().slice(0, 100);
    const propertyType = searchParams.get("type")?.trim().slice(0, 80);
    const minimumParam = searchParams.get("minPrice");
    const maximumParam = searchParams.get("maxPrice");
    const minimumPrice = minimumParam === null ? Number.NaN : Number(minimumParam);
    const maximumPrice = maximumParam === null ? Number.NaN : Number(maximumParam);
    const limitParam = searchParams.get("limit");
    const requestedLimit = limitParam === null ? 24 : Number(limitParam);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 24;

    let query = supabase
      .from("listings")
      .select(PUBLIC_LISTING_COLUMNS)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (city) query = query.ilike("city", `%${city}%`);
    if (propertyType) query = query.eq("property_type", propertyType);
    if (Number.isFinite(minimumPrice) && minimumPrice >= 0) query = query.gte("price_amount", minimumPrice);
    if (Number.isFinite(maximumPrice) && maximumPrice >= 0) query = query.lte("price_amount", maximumPrice);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const listings = (data ?? []).map((listing) => ({
      ...listing,
      listing_photos: [...(listing.listing_photos ?? [])]
        .sort((first, second) => first.position - second.position)
        .map((photo) => ({
          ...photo,
          image_url: supabase.storage.from(listingMediaBucket(photo.media_type)).getPublicUrl(photo.storage_path).data.publicUrl,
        })),
    }));

    return NextResponse.json({ listings });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in before creating a listing." }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "owner") {
      return NextResponse.json({ error: "Choose the Owner role before creating a listing." }, { status: 403 });
    }

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
      .insert({ ...parsed.data, owner_id: user.id, status: "draft" })
      .select("id, status")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ listing: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}
