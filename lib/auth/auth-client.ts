import type { AuthResult } from "@/types/auth";

const NOT_CONFIGURED_MESSAGE = "Authentication is not connected yet. Please try again when SpaceYaar Auth is available.";

export async function signInWithGoogle(): Promise<AuthResult> {
  return unavailableProvider("Google");
}

export async function signInWithFacebook(): Promise<AuthResult> {
  return unavailableProvider("Facebook");
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  void email;
  void password;
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  return { ok: false, message: NOT_CONFIGURED_MESSAGE };
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  void email;
  void password;
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  return { ok: false, message: NOT_CONFIGURED_MESSAGE };
}

async function unavailableProvider(provider: "Google" | "Facebook"): Promise<AuthResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  return { ok: false, message: `${provider} authentication is not connected yet.` };
}