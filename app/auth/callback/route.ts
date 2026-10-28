import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_auth_code", request.url));
  }

  // Optional in-app destination so a guest can resume the flow they were in
  // (for example booking a space or submitting a listing) after signing in.
  const next = request.nextUrl.searchParams.get("next");
  const nextDestination = next && /^\/(?!\/)/.test(next) && !next.startsWith("/api") ? next : null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
    }

    return NextResponse.redirect(new URL(nextDestination ?? "/role-selection", request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth_not_configured", request.url));
  }
}
