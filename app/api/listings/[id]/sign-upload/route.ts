import { NextResponse } from "next/server";
import { isRecord } from "@/lib/api/booking-rules";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNABLE_BUCKETS = new Set(["listing-photos", "listing-videos", "kyc-documents"]);

/**
 * Returns a signed upload token for one listing file on an on-behalf listing.
 *
 * Normal owners upload straight from the browser because storage RLS lets the
 * listing owner write their own folder — an admin uploading for someone else
 * fails those checks. The signed URL keeps the file bytes on the direct
 * browser→storage path (routing15 MB photos through the app server would hit
 * serverless body limits) while the server stays in charge of who may upload
 * where.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;

    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const bucket = isRecord(body) && typeof body.bucket === "string" ? body.bucket : "";
    const path = isRecord(body) && typeof body.path === "string" ? body.path : "";
    if (!SIGNABLE_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "This file type cannot be uploaded." }, { status: 400 });
    }
    if (!path.startsWith(`${guard.user.id}/${id}/`) || path.length > 500) {
      return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (listingError) {
      console.error("Could not load listing for signed upload:", listingError.message);
      return NextResponse.json({ error: "Could not sign this upload." }, { status: 500 });
    }
    if (!listing) {
      return NextResponse.json({ error: "This listing does not exist." }, { status: 404 });
    }

    const { data: signed, error: signError } = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (signError || !signed?.token) {
      console.error("Could not sign listing upload:", signError?.message);
      return NextResponse.json({ error: "Could not sign this upload. Try again." }, { status: 500 });
    }

    return NextResponse.json({ path: signed.path || path, token: signed.token });
  } catch (cause) {
    console.error("Signed listing upload failed:", cause);
    return NextResponse.json({ error: "Could not sign this upload. Try again." }, { status: 500 });
  }
}
