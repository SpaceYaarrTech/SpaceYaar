"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { SpaceYaarLogo } from "@/components/branding/SpaceYaarLogo";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Role = "owner" | "renter";
type Slide = { role: Role; label: string; title: string; body: string; image: string; alt: string; accent: string };

const slides: Slide[] = [
  { role: "owner", label: "For property owners", title: "List. Connect. Earn.", body: "Turn your space into an opportunity. Find the right people and manage your property with ease.", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85", alt: "Sunlit modern living room with a view", accent: "Owner / 01" },
  { role: "renter", label: "For modern renters", title: "Find your next space.", body: "Discover places that fit your lifestyle, budget and needs - all in one place.", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85", alt: "Warm, considered apartment interior", accent: "Renter / 02" },
];

const wrapIndex = (index: number) => (index + slides.length) % slides.length;

export function OnboardingCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback((nextIndex: number, nextDirection?: number) => {
    setDirection(nextDirection ?? (nextIndex > activeIndex ? 1 : -1));
    setActiveIndex(wrapIndex(nextIndex));
  }, [activeIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => goTo(activeIndex + 1, 1), 5000);
    return () => window.clearInterval(timer);
  }, [activeIndex, goTo]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 70 || Math.abs(info.velocity.x) < 150) return;
    goTo(activeIndex + (info.offset.x < 0 ? 1 : -1), info.offset.x < 0 ? 1 : -1);
  };

  const slide = slides[activeIndex];
  const variants = { enter: (value: number) => ({ opacity: 0, x: value * 38 }), center: { opacity: 1, x: 0 }, exit: (value: number) => ({ opacity: 0, x: value * -38 }) };

  return (
    <main className="page-shell onboarding-page">
      <header className="onboarding-header"><SpaceYaarLogo /><span className="header-note">A better way to belong</span></header>
      <div className="onboarding-layout">
        <section className="onboarding-copy">
          <div className="copy-topline"><span className="eyebrow">Your space, your way</span><span className="slide-count">0{activeIndex + 1} / 02</span></div>
          <AnimatePresence custom={direction} mode="wait">
            <motion.div key={slide.role} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <p className="slide-label">{slide.label}</p>
              <h1 className="display-font onboarding-title">{slide.title}</h1>
              <p className="onboarding-body">{slide.body}</p>
              <PrimaryButton onClick={() => { window.sessionStorage.setItem("spaceyaar-role", slide.role); window.location.assign("/login"); }}>
                Continue as {slide.role}<span aria-hidden="true" className="button-arrow">-&gt;</span>
              </PrimaryButton>
            </motion.div>
          </AnimatePresence>
          <div className="onboarding-bottom"><span className="swipe-note">Swipe to explore <span aria-hidden="true">&lt;- -&gt;</span></span><div className="pagination" aria-label="Onboarding slides">{slides.map((item, index) => <button aria-label={`Show ${item.role} slide`} aria-current={index === activeIndex} className={`pagination-dot ${index === activeIndex ? "active" : ""}`} key={item.role} onClick={() => goTo(index)}><span /></button>)}</div></div>
        </section>
        <motion.section className="onboarding-visual" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12} onDragEnd={handleDragEnd} whileTap={{ cursor: "grabbing" }}>
          <AnimatePresence custom={direction} mode="wait">
            <motion.div key={slide.role} className="image-frame" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
              <Image src={slide.image} alt={slide.alt} fill priority={activeIndex === 0} sizes="(max-width: 767px) 92vw, 52vw" className="onboarding-image" />
              <div className="image-wash" />
              <div className="visual-accent"><span>{slide.accent}</span><i /></div>
              <div className="visual-caption"><span>SpaceYaar spaces</span><span>Est. 2026</span></div>
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </div>
    </main>
  );
}