import type { UserRole } from "@/types/roles";

const ROLE_STORAGE_KEY = "spaceyaar-role";

const isUserRole = (value: string | null): value is UserRole => value === "owner" || value === "renter";

export function getSelectedRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  const storedRole = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
  return isUserRole(storedRole) ? storedRole : null;
}

export function setSelectedRole(role: UserRole): void {
  if (typeof window !== "undefined") window.sessionStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function clearSelectedRole(): void {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
}