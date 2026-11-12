/**
 * GA4 custom event helper (handoff §19).
 *
 * No-ops until gtag has loaded and swallows its own errors so analytics can
 * never break the product flow. Never pass KYC contents or other sensitive
 * data in `params`.
 */
export function track(event: string, params?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", event, params ?? {});
  } catch {
    // Analytics must never break the app.
  }
}
