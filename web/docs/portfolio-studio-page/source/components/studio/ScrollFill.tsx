"use client";

import { useEffect, useMemo, useRef } from "react";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * ScrollFill — the Apple manifesto effect: words sit dim on the page and
 * take ink as you scroll through them, one after another. Scroll-linked
 * (not time-linked) so reading speed belongs to the reader. Lerped rAF;
 * reduced motion renders full ink immediately.
 */
export function ScrollFill({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const words = useMemo(() => text.split(/\s+/), [text]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const spans = Array.from(
      root.querySelectorAll<HTMLSpanElement>("[data-word]")
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spans.forEach((s) => (s.style.opacity = "1"));
      return;
    }

    let raf = 0;
    let current = -1;
    const n = spans.length;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight;

      // fill runs while the block travels from 88% to 38% of the viewport
      const target = clamp((vh * 0.88 - r.top) / (vh * 0.5), 0, 1);
      current = current < 0 ? target : current + (target - current) * 0.18;
      if (Math.abs(target - current) < 0.0006) current = target;

      const ramp = 2.5; // words wide the soft edge is
      for (let i = 0; i < n; i++) {
        const o = clamp((current * (n + ramp) - i) / ramp, 0, 1);
        spans[i].style.opacity = (0.16 + o * 0.84).toFixed(3);
      }
    };
    // the loop runs only while the block is near the viewport
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!raf) raf = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "100px 0px" }
    );
    io.observe(root);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [words]);

  return (
    <p ref={rootRef} className={className}>
      {/* Full sentence for assistive tech (and the contrast/agent trees); the
          animated per-word spans below are decorative. A <p> carries the
          "paragraph" role, which prohibits aria-label — so the accessible
          name lives in real text here instead. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} data-word style={{ opacity: 0.16 }}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </p>
  );
}
