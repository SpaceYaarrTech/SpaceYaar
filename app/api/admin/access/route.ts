import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";

/**
 * Lightweight access check used by the admin layout before rendering the
 * portal. Real enforcement still happens on every admin API route.
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;
    return NextResponse.json({ isAdmin: true });
  } catch (error) {
    console.error("Admin access check failed:", error);
    return NextResponse.json({ error: "Could not verify admin access." }, { status: 500 });
  }
}
