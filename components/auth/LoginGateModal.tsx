"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth/auth-client";

type LoginGateModalProps = {
  title: string;
  description: string;
  /** In-app path to resume after the Google OAuth round trip completes. */
  nextPath: string;
  onClose: () => void;
};

/**
 * Shown to guest users when they reach an action that needs an account
 * (booking a space, saving it, or submitting a listing). Signing in with
 * Google returns the guest to the exact step they were on.
 */
export function LoginGateModal({ title, description, nextPath, onClose }: LoginGateModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    if (isSigningIn) return;
    setError("");
    setIsSigningIn(true);
    const result = await signInWithGoogle(nextPath);
    if (!result.ok) {
      setError(result.message);
      setIsSigningIn(false);
    }
  };

  return (
    <div
      className="login-gate-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSigningIn) onClose();
      }}
    >
      <div className="login-gate-dialog" role="dialog" aria-modal="true" aria-labelledby="login-gate-title">
        <div className="login-gate-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
        </div>

        <h2 id="login-gate-title">{title}</h2>
        <p className="login-gate-copy">{description}</p>

        <button type="button" className="google-button" onClick={handleGoogleLogin} disabled={isSigningIn}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.95h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.88-1.73 2.99-4.28 2.99-7.39Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.38l-3.22-2.51c-.9.6-2.04.96-3.39.96-2.61 0-4.82-1.76-5.62-4.13H3.05v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.38 13.94A6 6 0 0 1 6.07 12c0-.67.12-1.32.31-1.94V7.47H3.05A10 10 0 0 0 2 12c0 1.63.39 3.17 1.05 4.53l3.33-2.59Z" />
            <path fill="#EA4335" d="M12 5.93c1.47 0 2.8.5 3.84 1.5l2.88-2.88C16.96 2.91 14.7 2 12 2a10 10 0 0 0-8.95 5.47l3.33 2.59C7.18 7.69 9.39 5.93 12 5.93Z" />
          </svg>
          <span>{isSigningIn ? "Redirecting to Google..." : "Continue with Google"}</span>
        </button>

        {error && <p className="login-gate-error" role="alert">{error}</p>}

        <button type="button" className="login-gate-later" onClick={onClose} disabled={isSigningIn}>
          Not now
        </button>
      </div>
    </div>
  );
}
