"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";

type IconName = "search" | "shield" | "money";
type Slide = { title: string; body: string; image: string; alt: string; icon: IconName };

const slides: Slide[] = [
  { title: "Khali Jagah\nPayein,turant", body: "Outgrew your shop? Get secure, pay-as-you-go storage right in your neighborhood. No rigid 11-month leases or heavy deposits required.", image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2200&q=88", alt: "Warmly lit commercial storage warehouse", icon: "search" },
  { title: "100% Payment Safe hai.", body: "Every godown, shed, and basement is strictly KYC-verified. Store your raw materials and bulk goods with complete peace of mind.", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2200&q=88", alt: "Secure payment card held in a hand", icon: "shield" },
  { title: "Bhaadhaa ar Bachat bro!", body: "Book flexible local storage for your business, list your empty commercial space to start earning today.", image: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=2200&q=88", alt: "Dramatic warehouse aisle with stacked boxes", icon: "money" },
];

function SlideIcon({ name }: { name: IconName }) {
  if (name === "shield") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5.5c0 4.25-2.85 7.72-7 9.5-4.15-1.78-7-5.25-7-9.5V6l7-3Z" /><path d="m9.2 12 1.8 1.8 3.8-4" /></svg>;
  if (name === "money") return <span aria-hidden="true">$</span>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 5 5" /></svg>;
}

function wrapIndex(index: number) { return (index + slides.length) % slides.length; }

export function OnboardingCarousel() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const slide = slides[activeIndex];

  const goTo = (nextIndex: number, nextDirection = nextIndex >= activeIndex ? 1 : -1) => {
    setDirection(nextDirection);
    setActiveIndex(wrapIndex(nextIndex));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "Enter") goTo(activeIndex + 1, 1);
      if (event.key === "ArrowLeft" && activeIndex > 0) goTo(activeIndex - 1, -1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 60) return;
    if (info.offset.x < 0 && activeIndex < slides.length - 1) goTo(activeIndex + 1, 1);
    if (info.offset.x > 0 && activeIndex > 0) goTo(activeIndex - 1, -1);
  };

  const next = () => activeIndex === slides.length - 1 ? router.push("/language") : goTo(activeIndex + 1, 1);
  const variants = { enter: (value: number) => ({ opacity: 0, x: prefersReducedMotion ? 0 : value * 34 }), center: { opacity: 1, x: 0 }, exit: (value: number) => ({ opacity: 0, x: prefersReducedMotion ? 0 : value * -34 }) };

  return (
    <main className="cinematic-onboarding" aria-label="SpaceYaar onboarding">
      <motion.div className="cinematic-backdrop" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={handleDragEnd}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div key={activeIndex} className="cinematic-image" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <Image src={slide.image} alt={slide.alt} fill priority={activeIndex === 0} sizes="100vw" />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div className="cinematic-overlay" />
      <header className="cinematic-header"><span className="cinematic-brand"><b>S</b> SPACEYAAR</span><span className="cinematic-count">0{activeIndex + 1} / 03</span></header>
      {activeIndex > 0 && <button className="cinematic-back" type="button" onClick={() => goTo(activeIndex - 1, -1)} aria-label="Go back to previous onboarding step"><span aria-hidden="true">&#8592;</span></button>}
      <section className="cinematic-content" aria-live="polite">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div key={activeIndex} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <div className="cinematic-icon"><SlideIcon name={slide.icon} /></div>
            <h1>{slide.title.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
            <p>{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </section>
      <footer className="cinematic-footer">
        <div className="cinematic-progress" aria-label={`Onboarding step ${activeIndex + 1} of ${slides.length}`}>
          {slides.map((item, index) => <button key={item.title} type="button" className={index === activeIndex ? "active" : ""} aria-label={`Go to onboarding step ${index + 1}`} aria-current={index === activeIndex ? "step" : undefined} onClick={() => goTo(index)} />)}
        </div>
        <button className="cinematic-next" type="button" onClick={next} aria-label={activeIndex === slides.length - 1 ? "Finish onboarding" : "Next onboarding step"}><span aria-hidden="true">&#8594;</span></button>
      </footer>
    </main>
  );
}