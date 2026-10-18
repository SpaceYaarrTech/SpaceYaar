import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AssetPayload = {
  photos?: Array<{ storagePath?: unknown; label?: unknown; position?: unknown }>;
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

    if (photos.some((photo) => !validPath(photo.storagePath) || typeof photo.label !== "string")) {
      return NextResponse.json({ error: "One or more photo records are invalid." }, { status: 400 });
    }
    if (documents.some((document) => !validPath(document.storagePath) || typeof document.documentType !== "string")) {
      return NextResponse.json({ error: "One or more document records are invalid." }, { status: 400 });
    }

    if (photos.length) {
      const { error } = await supabase.from("listing_photos").upsert(
        photos.map((photo) => ({
          listing_id: listingId,
          storage_path: photo.storagePath as string,
          label: (photo.label as string).slice(0, 80),
          position: Number.isInteger(photo.position) ? photo.position as number : 0,
        })),
        { onConflict: "storage_path" },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (documents.length) {
      const { error } = await supabase.from("listing_documents").upsert(
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
