import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAddressInput } from "@/lib/api/address-input";

const ADDRESS_COLUMNS = "id, user_id, label, address_line, landmark, city, state, pincode, phone, is_default, created_at, updated_at";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to view your addresses." }, { status: 401 });

    const { data, error } = await supabase
      .from("addresses")
      .select(ADDRESS_COLUMNS)
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ addresses: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Backend is not configured yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to add an address." }, { status: 401 });

    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const parsed = parseAddressInput(parsedBody);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // Only one default address per user.
    if (parsed.data.is_default) {
      const { error: clearError } = await supabase
        .from("addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_default", true);
      if (clearError) return NextResponse.json({ error: clearError.message }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...parsed.data, user_id: user.id })
      .select(ADDRESS_COLUMNS)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ address: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save the address." }, { status: 500 });
  }
}
