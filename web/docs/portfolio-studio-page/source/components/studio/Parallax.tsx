"use client";

import { useEffect, useRef } from "react";

/**
 * Parallax — depth on scroll, direct drive. No internal easing: Lenis
 * already gives the scroll its mass, so the offset maps 1:1 to scroll
 * position and the depth never wobbles out of phase with the page.
 * The element's own translate is subtracted before measuring, so the
 * offset never feeds back into itself.
 */
export function Parallax({
  speed = 0.15,
  className,
  children,
}: {
  speed?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let applied = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const rawTop = r.top - applied;
      const center = rawTop + r.height / 2 - vh / 2;
      const target = -center * speed;
      if (Math.abs(target - applied) > 0.01) {
        applied = target;
        el.style.transform = `translate3d(0, ${applied.toFixed(2)}px, 0)`;
      }
    };

    // the loop runs only while the element is near the viewport
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!raf) raf = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
