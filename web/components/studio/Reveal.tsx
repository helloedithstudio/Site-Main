"use client";

import { useRef, useEffect } from "react";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

// Rise-in on scroll, with no animation library. The content is in the server HTML, so nothing on screen waits for
// JavaScript. Only elements that start below the fold are hidden (at mount, while off screen, so the reader never sees
// them vanish) and they rise in on first intersection: 0.6s, 14px of travel, no blur.
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;

    el.style.opacity = "0";
    let anim: Animation | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        el.style.opacity = "";
        anim = el.animate(
          [
            { opacity: 0, transform: `translateY(${y}px)` },
            { opacity: 1, transform: "none" },
          ],
          { duration: 600, delay: delay * 1000, easing: EASE, fill: "backwards" },
        );
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.cancel();
      el.style.opacity = "";
    };
  }, [delay, y]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} data-reveal className={className}>
      {children}
    </Tag>
  );
}
