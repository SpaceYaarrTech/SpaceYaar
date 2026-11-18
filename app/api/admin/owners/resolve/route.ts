import { NextResponse } from "next/server";
import { isRecord } from "@/lib/api/booking-rules";
import { resolveOwnerForOnBehalfListing } from "@/lib/api/on-behalf";
import { requireAdmin } from "@/lib/auth/admin-guard";

/**
 * Resolves the owner email an admin wants to list a property for. Used by
 * /admin/listing before handing the flow over to the listing wizard, which
 * repeats this resolution server-side at create time.
 */
export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (!isRecord(body) || typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json({ error: "Enter the owner's email address." }, { status: 400 });
    }

    const resolution = await resolveOwnerForOnBehalfListing(body.email);
    if (!resolution.owner) {
      return NextResponse.json({ error: resolution.error }, { status: resolution.status });
    }

    return NextResponse.json({
      owner: { email: resolution.owner.email, displayName: resolution.owner.displayName },
    });
  } catch (cause) {
    console.error("On-behalf owner resolve failed:", cause);
    return NextResponse.json({ error: "Could not look up the owner's account." }, { status: 500 });
  }
}
