import type { AuthResult } from "@/types/auth";
import { createClient } from "@/lib/supabase/client";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Authentication is temporarily unavailable. Please try again.";

export async function signInWithGoogle(nextPath?: string): Promise<AuthResult> {
  try {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      callbackUrl.searchParams.set("next", nextPath);
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function signInWithFacebook(): Promise<AuthResult> {
  try {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { ok: false, message: error.message };
    return data.session
      ? { ok: true }
      : { ok: true, message: "Account created. Check your email to confirm your address." };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function requestOtp(phone: string): Promise<AuthResult> {
  try {
    const { error } = await createClient().auth.signInWithOtp({ phone });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<AuthResult> {
  try {
    const { error } = await createClient().auth.verifyOtp({ phone, token: otp, type: "sms" });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}
