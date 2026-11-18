/**
 * Handoff context for an admin listing a property on behalf of an owner.
 *
 * /admin/listing resolves the owner's email, parks the context here for a
 * one-shot handoff, and the wizard folds it into the persisted draft
 * (ListingDraft.onBehalf) so a refresh mid-flow keeps the mode while the
 * sessionStorage flag is consumed on first read.
 */

export type ListingOnBehalf = {
  email: string;
  displayName?: string;
};

export const ON_BEHALF_HANDOFF_KEY = "spaceyaar-listing-on-behalf";

export function readOnBehalfHandoff(): ListingOnBehalf | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ON_BEHALF_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: unknown; displayName?: unknown };
    if (!parsed || typeof parsed.email !== "string" || !parsed.email.trim()) return null;
    return {
      email: parsed.email.trim(),
      displayName: typeof parsed.displayName === "string" && parsed.displayName.trim()
        ? parsed.displayName.trim()
        : undefined,
    };
  } catch {
    return null;
  }
}

export function writeOnBehalfHandoff(next: ListingOnBehalf): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ON_BEHALF_HANDOFF_KEY, JSON.stringify(next));
  } catch {
    // Storage may be full/blocked — the wizard simply starts without context.
  }
}

export function clearOnBehalfHandoff(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ON_BEHALF_HANDOFF_KEY);
  } catch {
    // Best effort.
  }
}
