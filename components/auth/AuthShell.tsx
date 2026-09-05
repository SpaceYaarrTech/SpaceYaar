import type { ReactNode } from "react";
import { SpaceYaarLogo } from "@/components/branding/SpaceYaarLogo";

type AuthShellProps = { eyebrow: string; title: string; description: string; children: ReactNode };

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return <main className="auth-page"><aside className="auth-aside"><SpaceYaarLogo light href="/onboarding" /><div className="auth-aside-content"><span className="eyebrow auth-aside-eyebrow">SpaceYaar / your next chapter</span><h1 className="display-font">Make room for what&apos;s next.</h1><p>One place to find the space, people, and possibilities that fit your life.</p></div><div className="login-aside-footer"><span>Space for what&apos;s next</span><span>01 / 02</span></div></aside><section className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">{eyebrow}</span><h2 className="display-font">{title}</h2><p className="auth-subtitle">{description}</p>{children}</div></section></main>;
}