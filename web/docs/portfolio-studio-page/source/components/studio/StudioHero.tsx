"use client";

import { useEffect, useRef } from "react";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * StudioHero — full-viewport film frame, Apple keynote grammar.
 * The reel is the room; the wordmark stands in the middle of it.
 * On scroll the title drifts up and dissolves while the film scales and
 * deepens — one lerped rAF loop so the hand-off into the page has mass.
 * Scoped .scene-dark: the nav above it is pinned dark on this route too
 * (see Nav.tsx), so the top blend must resolve to the same fixed dark
 * --bg regardless of the site's light/dark toggle, or a light gap opens
 * between navbar and film.
 */
export function StudioHero({
  title,
  tagline,
}: {
  title: string;
  tagline: string;
}) {
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

    // Decoder respect: the film only plays while the hero is on screen —
    // and resumes when the tab comes back (IO alone misses that hand-off).
    let onScreen = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen && document.visibilityState === "visible")
          video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 }
    );
    io.observe(root);

    const onVis = () => {
      if (document.visibilityState === "visible" && onScreen)
        video.play().catch(() => {});
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
      if (window.scrollY > vh * 1.3) return; // hero fully gone — idle

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
    <section
      ref={rootRef}
      className="scene-dark relative flex h-[100svh] min-h-[560px] items-center justify-center overflow-hidden"
    >
      <video
        ref={videoRef}
        src="/studio1.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover will-change-transform"
        style={{ animation: "hero-film-in 1.6s ease-out both" }}
      />

      {/* constant scrim for type legibility — the film stays the subject */}
      <div aria-hidden className="absolute inset-0 bg-black/25" />
      {/* deepens as you scroll, handing the eye to the page */}
      <div
        ref={veilRef}
        aria-hidden
        className="absolute inset-0 bg-black opacity-0"
      />
      {/* top blend: fixed nav is pinned dark on Studio, so this matches */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-bg to-transparent"
      />

      <div
        ref={overlayRef}
        className="relative z-10 px-6 text-center will-change-transform"
      >
        <h1
          className="text-[clamp(3.75rem,9vw,6.75rem)] font-medium leading-[1.02] tracking-[-0.03em]"
          // globals.css sets h1 color unlayered, which outranks layered
          // utilities — the film demands white in both themes, so inline it
          style={{ color: "#fff" }}
        >
          <span className="line-mask">
            <span style={{ ["--line-delay" as string]: "250ms" }}>
              {title}
              <span className="text-white/40">.</span>
            </span>
          </span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-[36ch] text-lede text-white/80"
          style={{
            animation: "page-in 1s cubic-bezier(0.16,1,0.3,1) 650ms both",
          }}
        >
          {tagline}
        </p>
      </div>
    </section>
  );
}
