"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";

type Slide = { image: string; alt: string };

const slides: Slide[] = [
  { image: "https://pyhpkmxtsvsramxrbsyc.supabase.co/storage/v1/object/public/app-images/2.png", alt: "SpaceYaar onboarding screen about finding nearby storage" },
  { image: "https://pyhpkmxtsvsramxrbsyc.supabase.co/storage/v1/object/public/app-images/3.png", alt: "SpaceYaar onboarding screen about verified and secure bookings" },
  { image: "https://pyhpkmxtsvsramxrbsyc.supabase.co/storage/v1/object/public/app-images/4.png", alt: "SpaceYaar onboarding screen about growing a business with flexible storage" },
];

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
      <header className="cinematic-header"><span className="cinematic-brand"><b>S</b> SPACEYAAR</span></header>
      {activeIndex > 0 && <button className="cinematic-back" type="button" onClick={() => goTo(activeIndex - 1, -1)} aria-label="Go back to previous onboarding step"><span aria-hidden="true">&#8592;</span></button>}
      <footer className="cinematic-footer">
        <div className="cinematic-progress" aria-label={`Onboarding step ${activeIndex + 1} of ${slides.length}`}>
          {slides.map((item, index) => <button key={item.image} type="button" className={index === activeIndex ? "active" : ""} aria-label={`Go to onboarding step ${index + 1}`} aria-current={index === activeIndex ? "step" : undefined} onClick={() => goTo(index)} />)}
        </div>
        <button className="cinematic-next" type="button" onClick={next} aria-label={activeIndex === slides.length - 1 ? "Finish onboarding" : "Next onboarding step"}><span aria-hidden="true">&#8594;</span></button>
      </footer>
    </main>
  );
}