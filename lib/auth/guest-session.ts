import { createClient } from "@/lib/supabase/client";

const GUEST_STORAGE_KEY = "spaceyaar-guest";

/** Marks the current session as a guest so gated actions can prompt for login. */
export function setGuestMode(): void {
  if (typeof window !== "undefined") window.sessionStorage.setItem(GUEST_STORAGE_KEY, "1");
}

export function isGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(GUEST_STORAGE_KEY) === "1";
}

export function clearGuestMode(): void {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
}

/**
 * Returns true when the current visitor is a guest and must sign in before continuing.
 * If the guest already signed in (for example after an OAuth round trip), the guest
 * flag is cleared automatically so the flow proceeds without a prompt.
 */
export async function isGuestLoginRequired(): Promise<boolean> {
  if (!isGuestMode()) return false;
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (user) {
      clearGuestMode();
      return false;
    }
  } catch {
    // Supabase not configured — still treat the visitor as a guest.
  }
  return true;
}
