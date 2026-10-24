"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { onboardingImages, splashImage } from "@/lib/app-images";

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
      <Image src={splashImage} alt="SpaceYaar, your storage partner" fill priority sizes="100vw" unoptimized />
      <div className="splash-preload" aria-hidden="true">
        {onboardingImages.map((image) => (
          <Image key={image.image} src={image.image} alt="" width={1} height={1} loading="eager" fetchPriority="low" unoptimized />
        ))}
      </div>
    </main>
  );
}
