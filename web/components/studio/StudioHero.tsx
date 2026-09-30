"use client";

import { useEffect, useRef } from "react";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Scene 1 of the Studio page: a full-viewport film with the title standing in the middle of it. On scroll the title
// drifts up and dissolves while the film scales and darkens, all from one lerped requestAnimationFrame loop so the
// hand-off into the page has some weight. The film only plays while the hero is on screen.
export function StudioHero({ title, tagline }: { title: string; tagline: string }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    const veil = veilRef.current;
    const overlay = overlayRef.current;
    if (!root || !video || !veil || !overlay) return;

    // The intersection observer alone misses a tab coming back into view, so the visibility event resumes the film too.
    let onScreen = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen && document.visibilityState === "visible") video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(root);

    const onVis = () => {
      if (document.visibilityState === "visible" && onScreen) video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
      };
    }

    let raf = 0;
    let current = -1;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight;
      if (window.scrollY > vh * 1.3) return; // the hero is fully gone, so idle

      const target = clamp(window.scrollY / (vh * 0.85), 0, 1);
      current = current < 0 ? target : current + (target - current) * 0.16;
      if (Math.abs(target - current) < 0.0004) current = target;

      video.style.transform = `scale(${(1 + current * 0.08).toFixed(4)})`;
      veil.style.opacity = (current * 0.5).toFixed(3);
      overlay.style.transform = `translateY(${(current * -12).toFixed(3)}vh)`;
      overlay.style.opacity = clamp(1 - current * 1.3, 0, 1).toFixed(3);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <section ref={rootRef} className="sp-hero sp-dark">
      <video
        ref={videoRef}
        src="/studio-page/studio1.mp4"
        className="sp-hero-film"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      />
      {/* a constant scrim keeps the type legible while the film stays the subject */}
      <div aria-hidden className="sp-hero-scrim" />
      {/* it deepens as you scroll, handing the eye to the page */}
      <div ref={veilRef} aria-hidden className="sp-hero-veil" />
      {/* the top blend matches the dark scene, so no lighter band opens under the header */}
      <div aria-hidden className="sp-hero-blend" />

      <div ref={overlayRef} className="sp-hero-copy">
        <h1 className="sp-hero-title">
          <span className="sp-line-mask">
            <span style={{ ["--sp-line-delay" as string]: "250ms" }}>
              {title}
              <span className="sp-hero-title-dot">.</span>
            </span>
          </span>
        </h1>
        <p className="sp-lede sp-hero-tagline">{tagline}</p>
      </div>
    </section>
  );
}
