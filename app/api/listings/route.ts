import { NextResponse } from "next/server";
import { isRecord } from "@/lib/api/booking-rules";
import { parseListingDraft } from "@/lib/api/listing-input";
import { resolveOwnerForOnBehalfListing } from "@/lib/api/on-behalf";
import { isAdminUser } from "@/lib/auth/admin-access";
import { listingMediaBucket } from "@/lib/listing-media";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_LISTING_COLUMNS = "id, title, description, property_type, area_value, area_unit, price_amount, price_model, min_booking_days, city, state, pincode, amenities, latitude, longitude, created_at, listing_photos(*)";

// The pricing-availability migration adds `max_booking_days` and
// `area_overridden`. If it has not been applied yet, retry the write without
// the new columns instead of failing the whole listing (same approach the
// submit route uses for the missing `media_type` column).
const isNewPricingColumnError = (error: { code?: string; message?: string; details?: string | null; hint?: string | null } | null) =>
  error?.code === "42703" &&
  [error.message, error.details, error.hint].some(
    (value) => value?.includes("max_booking_days") || value?.includes("area_overridden"),
  );

const withoutNewPricingColumns = (data: Record<string, unknown>): Record<string, unknown> => {
  const rest = { ...data };
  delete rest.max_booking_days;
  delete rest.area_overridden;
  return rest;
};

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const parsed = parseListingDraft(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // Admin listing on behalf of an owner: the row belongs to the owner's
    // account (resolved server-side from their email), which the admin's own
    // session can neither insert through RLS nor claim an owner role for —
    // so this path writes through the service client and skips the caller's
    // own owner-role check.
    const onBehalfOf = isRecord(body) && typeof body.onBehalfOf === "string" ? body.onBehalfOf.trim() : "";
    if (onBehalfOf) {
      if (!isAdminUser(user)) {
        return NextResponse.json({ error: "Only SpaceYaar admins can list on behalf of an owner." }, { status: 403 });
      }
      const resolution = await resolveOwnerForOnBehalfListing(onBehalfOf);
      if (!resolution.owner) return NextResponse.json({ error: resolution.error }, { status: resolution.status });

      const service = createAdminClient();
      let { data, error } = await service
        .from("listings")
        .insert({ ...parsed.data, owner_id: resolution.owner.id, status: "draft" })
        .select("id, status")
        .single();
      if (error && isNewPricingColumnError(error)) {
        ({ data, error } = await service
          .from("listings")
          .insert({ ...withoutNewPricingColumns(parsed.data), owner_id: resolution.owner.id, status: "draft" })
          .select("id, status")
          .single());
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ listing: data }, { status: 201 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "owner") {
      return NextResponse.json({ error: "Choose the Owner role before creating a listing." }, { status: 403 });
    }

    let { data, error } = await supabase
      .from("listings")
      .insert({ ...parsed.data, owner_id: user.id, status: "draft" })
      .select("id, status")
      .single();
    if (error && isNewPricingColumnError(error)) {
      ({ data, error } = await supabase
        .from("listings")
        .insert({ ...withoutNewPricingColumns(parsed.data), owner_id: user.id, status: "draft" })
        .select("id, status")
        .single());
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ listing: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}
