export function isAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";
}
