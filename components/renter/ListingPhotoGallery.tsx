"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryPhoto = {
  url: string;
  label?: string;
  isVideo?: boolean;
};

type ListingPhotoGalleryProps = {
  photos: GalleryPhoto[];
  title: string;
  startIndex?: number;
  onClose: () => void;
};

/**
 * Full-screen photo viewer for a listing: a snap-scrolling carousel with a
 * position counter, a segmented progress rail, a thumbnail filmstrip for
 * jumping, and keyboard navigation (Esc closes, arrows step). Opening it
 * locks the page behind it and restores the scroll position on close.
 */
export function ListingPhotoGallery({ photos, title, startIndex = 0, onClose }: ListingPhotoGalleryProps) {
  const total = photos.length;
  const initialIndex = Math.min(Math.max(startIndex, 0), Math.max(total - 1, 0));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Lock the page behind the viewer while it is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Land on the tapped photo immediately (no smooth scroll on open).
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollLeft = initialIndex * viewport.clientWidth;
    // Only the opening position matters; later moves go through goTo().
  }, []);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const goTo = (index: number) => {
    const viewport = viewportRef.current;
    const clamped = Math.min(Math.max(index, 0), total - 1);
    setActiveIndex(clamped);
    if (viewport) viewport.scrollTo({ left: clamped * viewport.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(activeIndex + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(activeIndex - 1);
        return;
      }
      if (event.key === "Tab") {
        // Keep focus inside the viewer while it is open.
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(root.querySelectorAll<HTMLElement>("button:not([disabled]), video[controls]"));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        } else if (active instanceof Node && !root.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, total, onClose]);

  // Keep the snapped slide aligned after a resize/orientation change.
  useEffect(() => {
    const onResize = () => {
      const viewport = viewportRef.current;
      if (viewport) viewport.scrollLeft = activeIndex * viewport.clientWidth;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex]);

  // Keep the active thumbnail visible in the filmstrip.
  useEffect(() => {
    thumbRefs.current[activeIndex]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeIndex]);

  const handleScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport || viewport.clientWidth === 0) return;
    const index = Math.min(Math.max(Math.round(viewport.scrollLeft / viewport.clientWidth), 0), total - 1);
    setActiveIndex((current) => (current === index ? current : index));
  };

  if (total === 0) return null;
  const activePhoto = photos[activeIndex];

  return (
    <div
      ref={dialogRef}
      className="photo-gallery-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photo gallery`}
    >
      <div className="photo-gallery-header">
        <button
          ref={closeButtonRef}
          type="button"
          className="photo-gallery-close"
          aria-label="Close photo gallery"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.2} />
        </button>
        <span className="photo-gallery-title">{title}</span>
        <span className="photo-gallery-counter" aria-live="polite">
          <b>{activeIndex + 1}</b> / {total}
        </span>
      </div>

      {total > 1 && (
        <div className="photo-gallery-rail" aria-hidden="true">
          {photos.map((_, index) => (
            <span
              key={index}
              className={`photo-gallery-rail-seg${index === activeIndex ? " is-active" : index < activeIndex ? " is-done" : ""}`}
            />
          ))}
        </div>
      )}

      <div className="photo-gallery-stage">
        <div ref={viewportRef} className="photo-gallery-viewport" onScroll={handleScroll}>
          {photos.map((photo, index) => (
            <figure
              key={`${photo.url}-${index}`}
              className={`photo-gallery-slide${index === activeIndex ? " is-active" : ""}`}
            >
              {photo.isVideo ? (
                <video
                  src={photo.url}
                  controls
                  playsInline
                  preload={Math.abs(index - activeIndex) <= 1 ? "auto" : "none"}
                />
              ) : (
                <Image
                  src={photo.url}
                  alt={`${title} photo ${index + 1}${photo.label ? ` — ${photo.label}` : ""}`}
                  fill
                  sizes="100vw"
                  unoptimized
                  objectFit="contain"
                  loading={Math.abs(index - activeIndex) <= 1 ? "eager" : "lazy"}
                />
              )}
            </figure>
          ))}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              className="photo-gallery-nav photo-gallery-nav--prev"
              aria-label="Previous photo"
              disabled={activeIndex === 0}
              onClick={() => goTo(activeIndex - 1)}
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="photo-gallery-nav photo-gallery-nav--next"
              aria-label="Next photo"
              disabled={activeIndex === total - 1}
              onClick={() => goTo(activeIndex + 1)}
            >
              <ChevronRight size={20} strokeWidth={2.2} />
            </button>
          </>
        )}

        {activePhoto?.label && <span className="photo-gallery-caption">{activePhoto.label}</span>}
      </div>

      {total > 1 && (
        <div className="photo-gallery-filmstrip" aria-label="All photos">
          {photos.map((photo, index) => (
            <button
              key={`${photo.url}-${index}`}
              ref={(element) => {
                thumbRefs.current[index] = element;
              }}
              type="button"
              className={`photo-gallery-thumb${index === activeIndex ? " is-active" : ""}`}
              aria-label={`Go to photo ${index + 1}${photo.label ? `: ${photo.label}` : ""}`}
              aria-current={index === activeIndex}
              onClick={() => goTo(index)}
            >
              {photo.isVideo ? (
                <video src={photo.url} muted playsInline preload="metadata" />
              ) : (
                <Image src={photo.url} alt="" fill sizes="58px" unoptimized loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
