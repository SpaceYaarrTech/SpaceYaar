import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAddressInput } from "@/lib/api/address-input";

const ADDRESS_COLUMNS = "id, user_id, label, address_line, landmark, city, state, pincode, phone, is_default, created_at, updated_at";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to update this address." }, { status: 401 });

    const { data: existing, error: lookupError } = await supabase
      .from("addresses")
      .select("id, is_default")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
    if (!existing) return NextResponse.json({ error: "Address not found." }, { status: 404 });

    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    // Lightweight "set as default" update: { is_default: true } only.
    if (parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)
      && Object.keys(parsedBody).length === 1 && (parsedBody as Record<string, unknown>).is_default === true) {
      const { error: clearError } = await supabase
        .from("addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_default", true);
      if (clearError) return NextResponse.json({ error: clearError.message }, { status: 400 });
      const { data: promoted, error: promoteError } = await supabase
        .from("addresses")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .select(ADDRESS_COLUMNS)
        .single();
      if (promoteError) return NextResponse.json({ error: promoteError.message }, { status: 400 });
      return NextResponse.json({ address: promoted });
    }

    const parsed = parseAddressInput(parsedBody);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // Only one default address per user; demote the old default first.
    if (parsed.data.is_default && !existing.is_default) {
      const { error: clearError } = await supabase
        .from("addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_default", true);
      if (clearError) return NextResponse.json({ error: clearError.message }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("addresses")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select(ADDRESS_COLUMNS)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ address: data });
  } catch {
    return NextResponse.json({ error: "Could not update the address." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to delete this address." }, { status: 401 });

    const { data: existing, error: lookupError } = await supabase
      .from("addresses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
    if (!existing) return NextResponse.json({ error: "Address not found." }, { status: 404 });

    // Deleting the default address does not auto-promote another address —
    // the next address saved (or explicitly set) becomes the default.
    const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ deleted: true, id });
  } catch {
    return NextResponse.json({ error: "Could not delete the address." }, { status: 500 });
  }
}
