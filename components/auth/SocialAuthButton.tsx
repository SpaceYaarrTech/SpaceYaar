import { motion } from "motion/react";
import type { AuthProvider } from "@/types/auth";

type SocialAuthButtonProps = { provider: AuthProvider; loading?: boolean; disabled?: boolean; onClick: () => void };

function ProviderIcon({ provider }: { provider: AuthProvider }) {
  if (provider === "google") return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.95h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.88-1.73 2.99-4.28 2.99-7.39Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.38l-3.22-2.51c-.9.6-2.04.96-3.39.96-2.61 0-4.82-1.76-5.62-4.13H3.05v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.38 13.94A6 6 0 0 1 6.07 12c0-.67.12-1.32.31-1.94V7.47H3.05A10 10 0 0 0 2 12c0 1.63.39 3.17 1.05 4.53l3.33-2.59Z" /><path fill="#EA4335" d="M12 5.93c1.47 0 2.8.5 3.84 1.5l2.88-2.88C16.96 2.91 14.7 2 12 2a10 10 0 0 0-8.95 5.47l3.33 2.59C7.18 7.69 9.39 5.93 12 5.93Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#1877F2" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.5-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.48h-1.26c-1.25 0-1.64.78-1.64 1.58v1.87h2.8l-.45 2.91h-2.35V22c4.78-.76 8.44-4.92 8.44-9.94Z" /></svg>;
}

export function SocialAuthButton({ provider, loading = false, disabled = false, onClick }: SocialAuthButtonProps) {
  const label = provider === "google" ? "Continue with Google" : "Continue with Facebook";
  return <motion.button type="button" className="social-auth-button focus-ring" onClick={onClick} disabled={disabled || loading} whileHover={{ y: -1 }} whileTap={{ scale: .98 }} aria-label={loading ? `${label}, connecting` : label}><ProviderIcon provider={provider} /><span>{loading ? "Connecting..." : label}</span></motion.button>;
}