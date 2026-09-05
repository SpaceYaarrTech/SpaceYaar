"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { SpaceYaarLogo } from "@/components/branding/SpaceYaarLogo";

export default function SplashPage() {
  useEffect(() => {
    const timeout = window.setTimeout(() => window.location.assign("/onboarding"), 2200);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <main className="page-shell splash-page" aria-label="Loading SpaceYaar">
      <motion.div className="splash-mark" initial={{ scale: 0.84, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <motion.div className="splash-orbit" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25, duration: 1 }} />
        <SpaceYaarLogo />
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }}>
          Space for what&apos;s next
        </motion.p>
      </motion.div>
      <div className="splash-foot"><span>01</span><span className="splash-rule" /><span>Connect beautifully</span></div>
    </main>
  );
}