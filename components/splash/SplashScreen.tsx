"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

const features = [
  { label: "Verified Space", icon: "check" },
  { label: "Secured Payments", icon: "shield" },
  { label: "Instant Bookings", icon: "bolt" },
] as const;

function FeatureIcon({ type }: { type: (typeof features)[number]["icon"] }) {
  if (type === "shield") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5.5c0 4.25-2.85 7.72-7 9.5-4.15-1.78-7-5.25-7-9.5V6l7-3Z" /><path d="m9.2 12 1.8 1.8 3.8-4" /></svg>;
  }

  if (type === "bolt") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.2 2-8 11h6l-.4 9 8-11h-6l.4-9Z" /></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.3 4.3L19 6.6" /></svg>;
}

function SplashIllustration() {
  return (
    <motion.div className="splash-illustration" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
      <svg viewBox="0 0 520 300" role="img" aria-label="Illustration of a storage warehouse, boxes and delivery">
        <path className="illustration-ground" d="M0 263c67-20 105-12 165-15 85-4 129-28 218-12 52 9 88 22 137 17v47H0Z" />
        <path className="illustration-building" d="M94 105 254 52l173 54v126H94Z" />
        <path className="illustration-roof" d="m75 113 179-66 192 61-19 19-173-51-164 57Z" />
        <path className="illustration-door" d="M238 132h93v103h-93z" />
        <path className="illustration-door-line" d="M284 132v103" />
        <path className="illustration-window" d="M123 134h69v43h-69zM344 134h69v43h-69z" />
        <path className="illustration-window-line" d="M157 134v43M123 155h69M378 134v43M344 155h69" />
        <path className="illustration-box illustration-box-back" d="m39 220 57-20 48 18-57 22Z" />
        <path className="illustration-box illustration-box-front" d="m40 220 47 20v40l-47-19ZM87 240l57-22v39l-57 23Z" />
        <path className="illustration-box illustration-box-side" d="m87 240 57-22-14 42-43 18Z" />
        <path className="illustration-box illustration-box-small" d="m367 211 61-22 42 17-61 24Z" />
        <path className="illustration-box illustration-box-front" d="m367 211 42 19v36l-42-17ZM409 230l61-24v35l-61 25Z" />
        <path className="illustration-person" d="M184 206c0-14 10-25 23-25s23 11 23 25l-4 33h-39Z" />
        <circle className="illustration-skin" cx="207" cy="166" r="17" />
        <path className="illustration-hair" d="M191 166c1-15 8-22 18-22 12 0 17 8 17 18-10-4-19-6-35 4Z" />
        <path className="illustration-limb" d="m195 207-25 28M220 207l28 20" />
        <path className="illustration-cart" d="m163 234 52-3 9 34h-59Z" />
        <path className="illustration-cart-line" d="m163 234-10-12M173 265v9M213 265v9" />
        <circle className="illustration-wheel" cx="176" cy="276" r="5" /><circle className="illustration-wheel" cx="211" cy="276" r="5" />
        <path className="illustration-van" d="M376 247h111v35H376Z" />
        <path className="illustration-van-cab" d="M487 257h22l11 25h-33Z" />
        <path className="illustration-van-window" d="M491 261h15l5 12h-20Z" />
        <circle className="illustration-wheel" cx="397" cy="283" r="8" /><circle className="illustration-wheel" cx="497" cy="283" r="8" />
        <path className="illustration-plant" d="m58 257-4-48M54 232c-12-8-15-17-13-26 11 3 16 11 13 26ZM56 244c12-10 19-10 27-6-5 11-14 14-27 6Z" />
      </svg>
    </motion.div>
  );
}

export function SplashScreen() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const goToOnboarding = () => {
    try {
      router.replace("/onboarding");
    } catch {
      window.location.assign("/onboarding");
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(goToOnboarding, prefersReducedMotion ? 900 : 1800);
    return () => window.clearTimeout(timeout);
  }, [prefersReducedMotion, router]);

  return (
    <main className="splash-screen" aria-label="SpaceYaar">
      <div className="splash-content">
        <motion.div className="splash-brand" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
          <span className="splash-brand-mark">S</span>
          <span className="splash-brand-name">SPACEYAAR</span>
        </motion.div>
        <motion.div className="splash-message" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
          <h1>Godam aur Storage<br />bookings krein</h1>
          <div className="splash-features" aria-label="SpaceYaar features">
            {features.map((feature, index) => (
              <motion.div key={feature.label} className="splash-feature" initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.7 + index * 0.28, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
                <motion.span className="splash-feature-icon" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ delay: 0.82 + index * 0.28, type: "spring", stiffness: 300, damping: 18 }}><FeatureIcon type={feature.icon} /></motion.span>
                <span>{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      <SplashIllustration />
    </main>
  );
}