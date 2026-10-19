export function isAllowlistedAdmin(userId: string): boolean {
  const allowedUserIds = process.env.SPACEYAAR_ADMIN_USER_IDS
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];
  return allowedUserIds.includes(userId);
}
