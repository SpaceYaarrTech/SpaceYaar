const DEFAULT_ADMIN_EMAILS = ["spaceyaarr@gmail.com"];

export function isAllowlistedAdmin(userId: string): boolean {
  const allowedUserIds = process.env.SPACEYAAR_ADMIN_USER_IDS
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];
  return allowedUserIds.includes(userId);
}

/**
 * Admin accounts by email. When SPACEYAAR_ADMIN_EMAILS is configured it
 * replaces the default list; otherwise the built-in default applies so the
 * admin portal works without extra environment setup.
 */
export function adminEmailAllowlist(): string[] {
  const configured = process.env.SPACEYAAR_ADMIN_EMAILS;
  const source = configured?.trim() ? configured : DEFAULT_ADMIN_EMAILS.join(",");
  return source
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: { id: string; email?: string | null }): boolean {
  const email = user.email?.trim().toLowerCase();
  if (email && adminEmailAllowlist().includes(email)) return true;
  return isAllowlistedAdmin(user.id);
}
