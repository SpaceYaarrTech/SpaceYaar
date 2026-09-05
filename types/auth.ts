export type AuthProvider = "google" | "facebook";

export type AuthResult =
  | { ok: true }
  | { ok: false; message: string };

export type AuthErrorCode = "not_configured" | "invalid_credentials" | "network" | "cancelled";