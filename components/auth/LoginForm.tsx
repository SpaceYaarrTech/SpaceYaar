"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SocialAuthButton } from "@/components/auth/SocialAuthButton";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { signInWithEmail, signInWithFacebook, signInWithGoogle } from "@/lib/auth/auth-client";
import { validateEmail, validatePassword } from "@/lib/auth/validation";
import type { AuthProvider } from "@/types/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [message, setMessage] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const connectSocial = async (provider: AuthProvider) => {
    if (loadingProvider || isSubmitting) return;
    setMessage("");
    setLoadingProvider(provider);
    const result = provider === "google" ? await signInWithGoogle() : await signInWithFacebook();
    if (!result.ok) setMessage(result.message);
    setLoadingProvider(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = { email: validateEmail(email) ?? undefined, password: validatePassword(password) ?? undefined };
    setErrors(nextErrors);
    setMessage("");
    if (nextErrors.email || nextErrors.password) return;
    setIsSubmitting(true);
    const result = await signInWithEmail(email, password);
    if (!result.ok) setMessage(result.message);
    setIsSubmitting(false);
  };

  return <>
    <div className="social-auth-stack"><SocialAuthButton provider="google" loading={loadingProvider === "google"} disabled={Boolean(loadingProvider || isSubmitting)} onClick={() => connectSocial("google")} /><SocialAuthButton provider="facebook" loading={loadingProvider === "facebook"} disabled={Boolean(loadingProvider || isSubmitting)} onClick={() => connectSocial("facebook")} /></div>
    <AuthDivider />
    <form onSubmit={handleSubmit} noValidate>
      <div className="auth-field"><label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "login-email-error" : undefined} onChange={(event) => setEmail(event.target.value)} />{errors.email && <span className="auth-error" id="login-email-error" role="alert">{errors.email}</span>}</div>
      <PasswordInput label="Password" name="password" autoComplete="current-password" placeholder="Enter your password" value={password} error={errors.password} onChange={setPassword} />
      <div className="auth-options"><Link className="text-link focus-ring" href="#forgot-password">Forgot password?</Link></div>
      <PrimaryButton className="login-submit" type="submit" disabled={isSubmitting || Boolean(loadingProvider)}>{isSubmitting ? "Signing in..." : "Log in"}<span aria-hidden="true" className="button-arrow">-&gt;</span></PrimaryButton>
      {message && <p className="auth-message" role="status">{message}</p>}
    </form>
    <p className="auth-switch">Don&apos;t have an account? <Link className="text-link focus-ring" href="/signup">Sign up</Link></p>
  </>;
}