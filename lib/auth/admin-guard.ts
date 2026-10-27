import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";

export type AdminGuard = { user: User; response?: undefined } | { response: NextResponse; user?: undefined };

/**
 * Shared server-side guard for admin API routes: requires an authenticated
 * Supabase session whose email (or user id) is allowlisted for admin access.
 * Every admin route must call this before doing any work.
 */
export async function requireAdmin(): Promise<AdminGuard> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };
  }
  if (!isAdminUser(user)) {
    return { response: NextResponse.json({ error: "You are not authorized to review listings." }, { status: 403 }) };
  }
  return { user };
}
