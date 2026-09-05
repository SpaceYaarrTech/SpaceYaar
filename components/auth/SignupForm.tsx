"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SocialAuthButton } from "@/components/auth/SocialAuthButton";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { signInWithFacebook, signInWithGoogle, signUpWithEmail } from "@/lib/auth/auth-client";
import { validateEmail, validatePassword } from "@/lib/auth/validation";
import type { AuthProvider } from "@/types/auth";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [message, setMessage] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = { email: validateEmail(email) ?? undefined, password: validatePassword(password) ?? undefined, confirmPassword: confirmPassword !== password ? "Passwords do not match." : undefined };
    setErrors(nextErrors);
    setMessage("");
    if (nextErrors.email || nextErrors.password || nextErrors.confirmPassword) return;
    setIsSubmitting(true);
    const result = await signUpWithEmail(email, password);
    if (!result.ok) setMessage(result.message);
    setIsSubmitting(false);
  };

  const connectSocial = async (provider: AuthProvider) => {
    if (loadingProvider || isSubmitting) return;
    setLoadingProvider(provider);
    const result = provider === "google" ? await signInWithGoogle() : await signInWithFacebook();
    if (!result.ok) setMessage(result.message);
    setLoadingProvider(null);
  };

  return <>
    <div className="social-auth-stack"><SocialAuthButton provider="google" loading={loadingProvider === "google"} disabled={Boolean(loadingProvider || isSubmitting)} onClick={() => connectSocial("google")} /><SocialAuthButton provider="facebook" loading={loadingProvider === "facebook"} disabled={Boolean(loadingProvider || isSubmitting)} onClick={() => connectSocial("facebook")} /></div>
    <AuthDivider />
    <form onSubmit={handleSubmit} noValidate>
      <div className="auth-field"><label htmlFor="signup-email">Email</label><input id="signup-email" type="email" autoComplete="email" placeholder="Enter your email" value={email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "signup-email-error" : undefined} onChange={(event) => setEmail(event.target.value)} />{errors.email && <span className="auth-error" id="signup-email-error" role="alert">{errors.email}</span>}</div>
      <PasswordInput label="Password" name="password" autoComplete="new-password" placeholder="Create a password" value={password} error={errors.password} onChange={setPassword} />
      <PasswordInput label="Confirm password" name="confirm-password" autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} error={errors.confirmPassword} onChange={setConfirmPassword} />
      <PrimaryButton className="login-submit" type="submit" disabled={isSubmitting || Boolean(loadingProvider)}>{isSubmitting ? "Creating account..." : "Create account"}<span aria-hidden="true" className="button-arrow">-&gt;</span></PrimaryButton>
      {message && <p className="auth-message" role="status">{message}</p>}
    </form>
    <p className="auth-switch">Already have an account? <Link className="text-link focus-ring" href="/login">Log in</Link></p>
  </>;
}