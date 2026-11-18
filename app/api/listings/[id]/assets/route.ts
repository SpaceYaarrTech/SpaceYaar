import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/auth/admin-access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AssetPayload = {
  photos?: Array<{ storagePath?: unknown; label?: unknown; position?: unknown; mediaType?: unknown }>;
  documents?: Array<{ storagePath?: unknown; documentType?: unknown }>;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to attach listing files." }, { status: 401 });

    const body = await request.json() as AssetPayload;
    const photos = (Array.isArray(body.photos) ? body.photos : []).slice(0, 12);
    const documents = (Array.isArray(body.documents) ? body.documents : []).slice(0, 10);
    const validPath = (path: unknown) => typeof path === "string" && path.startsWith(`${user.id}/${listingId}/`) && path.length <= 500;
    const validMediaType = (mediaType: unknown) => mediaType === undefined || mediaType === "image" || mediaType === "video";

    if (photos.some((photo) => !validPath(photo.storagePath) || typeof photo.label !== "string" || !validMediaType(photo.mediaType))) {
      return NextResponse.json({ error: "One or more photo records are invalid." }, { status: 400 });
    }
    if (documents.some((document) => !validPath(document.storagePath) || typeof document.documentType !== "string")) {
      return NextResponse.json({ error: "One or more document records are invalid." }, { status: 400 });
    }

    // Photo/document rows are RLS-tied to the listing owner. When an admin
    // attaches files to an on-behalf listing (owned by someone else), the
    // session write would be filtered out — fall back to the service client
    // once the path checks above have already proven where the files live.
    let writeClient = supabase;
    if (isAdminUser(user)) {
      try {
        const admin = createAdminClient();
        const { data: listing } = await admin
          .from("listings")
          .select("owner_id")
          .eq("id", listingId)
          .maybeSingle();
        if (listing && listing.owner_id !== user.id) writeClient = admin;
      } catch (cause) {
        console.error("Could not open service client for on-behalf assets:", cause);
      }
    }

    if (photos.length) {
      let { error } = await writeClient.from("listing_photos").upsert(
        photos.map((photo) => ({
          listing_id: listingId,
          storage_path: photo.storagePath as string,
          label: (photo.label as string).slice(0, 80),
          position: Number.isInteger(photo.position) ? photo.position as number : 0,
          media_type: photo.mediaType === "video" ? "video" : "image",
        })),
        { onConflict: "storage_path" },
      );
      if (error && error.message.includes("media_type")) {
        // media_type migration not applied yet: store rows without it.
        const fallback = await writeClient.from("listing_photos").upsert(
          photos.map((photo) => ({
            listing_id: listingId,
            storage_path: photo.storagePath as string,
            label: (photo.label as string).slice(0, 80),
            position: Number.isInteger(photo.position) ? photo.position as number : 0,
          })),
          { onConflict: "storage_path" },
        );
        error = fallback.error;
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (documents.length) {
      const { error } = await writeClient.from("listing_documents").upsert(
        documents.map((document) => ({
          listing_id: listingId,
          storage_path: document.storagePath as string,
          document_type: (document.documentType as string).slice(0, 80),
        })),
        { onConflict: "storage_path" },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ savedPhotos: photos.length, savedDocuments: documents.length });
  } catch {
    return NextResponse.json({ error: "Could not save listing file records." }, { status: 400 });
  }
}
