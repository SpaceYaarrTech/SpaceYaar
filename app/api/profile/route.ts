import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PROFILE_COLUMNS = "id, display_name, phone, role, business_name, business_type, gst_number, address, profile_photo_path, date_of_birth, gender, created_at, updated_at";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GENDER_VALUES = ["male", "female", "other"] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function profileResponse(supabase: Awaited<ReturnType<typeof createClient>>, profile: Record<string, unknown>, email: string | undefined) {
  const photoPath = typeof profile.profile_photo_path === "string" ? profile.profile_photo_path : null;
  return {
    ...profile,
    email: email ?? null,
    profile_photo_url: photoPath
      ? supabase.storage.from("profile-photos").getPublicUrl(photoPath).data.publicUrl
      : null,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ profile: data ? profileResponse(supabase, data, user.email) : null });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "Profile details must be an object." }, { status: 400 });
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });

    if (Object.keys(body).length === 1 && typeof body.role === "string") {
      if (body.role !== "owner" && body.role !== "renter") {
        return NextResponse.json({ error: "Choose a supported profile role." }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ role: body.role, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select(PROFILE_COLUMNS)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ profile: profileResponse(supabase, data, user.email) });
    }

    if ("role" in body) {
      return NextResponse.json({ error: "Update role separately from business profile details." }, { status: 400 });
    }

    const updates: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    // Personal information fields (renter profile edit).
    if (body.display_name !== undefined) {
      if (typeof body.display_name !== "string" || !body.display_name.trim() || body.display_name.trim().length > 120) {
        return NextResponse.json({ error: "Enter a name of 120 characters or fewer." }, { status: 400 });
      }
      updates.display_name = body.display_name.trim();
    }
    if (body.phone !== undefined) {
      if (typeof body.phone !== "string" || !/^[+0-9][0-9\s-]{6,19}$/.test(body.phone.trim())) {
        return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
      }
      updates.phone = body.phone.trim();
    }
    if (body.date_of_birth !== undefined) {
      const dob = body.date_of_birth;
      if (dob !== null && (typeof dob !== "string" || !DATE_PATTERN.test(dob) || Number.isNaN(Date.parse(dob)) || dob > new Date().toISOString().slice(0, 10))) {
        return NextResponse.json({ error: "Enter a valid date of birth that is not in the future." }, { status: 400 });
      }
      updates.date_of_birth = dob as string | null;
    }
    if (body.gender !== undefined) {
      const gender = body.gender;
      if (gender !== null && (typeof gender !== "string" || !GENDER_VALUES.includes(gender as typeof GENDER_VALUES[number]))) {
        return NextResponse.json({ error: "Choose a valid gender option." }, { status: 400 });
      }
      updates.gender = gender as string | null;
    }

    // Business fields: only validated and updated when provided so the
    // existing host edit flow keeps working unchanged.
    if (body.business_name !== undefined) {
      if (typeof body.business_name !== "string" || !body.business_name.trim() || body.business_name.trim().length > 120) {
        return NextResponse.json({ error: "Enter a business name of 120 characters or fewer." }, { status: 400 });
      }
      updates.business_name = body.business_name.trim();
    }
    if (body.business_type !== undefined) {
      if (typeof body.business_type !== "string" || !body.business_type.trim() || body.business_type.trim().length > 100) {
        return NextResponse.json({ error: "Enter a business type of 100 characters or fewer." }, { status: 400 });
      }
      updates.business_type = body.business_type.trim();
    }
    if (body.address !== undefined) {
      if (typeof body.address !== "string" || !body.address.trim() || body.address.trim().length > 500) {
        return NextResponse.json({ error: "Enter an address of 500 characters or fewer." }, { status: 400 });
      }
      updates.address = body.address.trim();
    }
    if (body.gst_number !== undefined && typeof body.gst_number !== "string") {
      return NextResponse.json({ error: "GST number must be text." }, { status: 400 });
    }
    const gstNumber = typeof body.gst_number === "string" ? body.gst_number.trim().toUpperCase() : "";
    if (gstNumber && !GSTIN_PATTERN.test(gstNumber)) {
      return NextResponse.json({ error: "Enter a valid 15-character GSTIN or leave it empty." }, { status: 400 });
    }
    if (body.gst_number !== undefined) {
      updates.gst_number = gstNumber || null;
    }
    if (
      body.profile_photo_path !== undefined
      && body.profile_photo_path !== null
      && (
        typeof body.profile_photo_path !== "string"
        || !body.profile_photo_path.startsWith(`${user.id}/profile/`)
        || body.profile_photo_path.length > 500
      )
    ) {
      return NextResponse.json({ error: "Profile photo path is invalid." }, { status: 400 });
    }
    if (body.profile_photo_path !== undefined) {
      updates.profile_photo_path = body.profile_photo_path as string | null;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "No profile changes were provided." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Changing the sign-in email goes through Supabase auth (which handles
    // verification emails). The profile row keeps the confirmed email.
    let responseEmail = user.email;
    if (typeof body.email === "string" && body.email.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
      const { error: emailError } = await supabase.auth.updateUser({ email: body.email.trim().toLowerCase() });
      if (emailError) return NextResponse.json({ error: `Could not update email: ${emailError.message}` }, { status: 400 });
      responseEmail = body.email.trim().toLowerCase();
    }

    return NextResponse.json({ profile: profileResponse(supabase, data, responseEmail) });
  } catch {
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}
