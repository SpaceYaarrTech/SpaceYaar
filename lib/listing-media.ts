/**
 * Shared helpers for listing media (photos + videos).
 *
 * Upload rules: videos are hard-capped at 10 MB (checked the moment the file
 * is picked, with no processing); photos are compressed in the browser in the
 * background before upload so owners on slow connections actually send fewer
 * bytes. Nothing here blocks the owner's flow.
 */

export const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // picked limit; compressed before upload

export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/3gpp"];

export const LISTING_MIN_MEDIA = 2;
export const LISTING_MIN_IMAGES = 1;

export type ListingMediaType = "image" | "video";

export function isVideoMediaType(mediaType: string | null | undefined): boolean {
  return mediaType === "video";
}

export function listingMediaBucket(mediaType: string | null | undefined): "listing-photos" | "listing-videos" {
  return isVideoMediaType(mediaType) ? "listing-videos" : "listing-photos";
}

export function isValidVideoMime(file: File): boolean {
  return VIDEO_MIME_TYPES.includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Compresses an image in the browser (max 1920px long edge, JPEG ~82%).
 * Returns the original file whenever compression is impossible (unsupported
 * format, decode failure) so the upload never breaks.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const maxEdge = 1920;
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
