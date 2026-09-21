"use client";

// One "live" item out of `count`, advancing on its own until the visitor chooses one (Apple's auto-playing highlights).
// The CSS does the timing: the live item's hairline draws left to right with an animation, and `next` is called from its
// `animationend`, so autoplay pauses with the animation (off screen, on hover) and never runs under reduced motion
// (the CSS drops the animation, so `animationend` never fires). `setAuto` backs a visible pause / play button.

import { useCallback, useEffect, useRef, useState } from "react";

export function useLitCycle(count: number) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** A visitor's choice: select it and stop autoplay for good. */
  const pick = useCallback((i: number) => {
    setAuto(false);
    setActive(i);
  }, []);

  const next = useCallback(() => setActive((a) => (a + 1) % count), [count]);

  return { root, active, auto, setAuto, inView, pick, next };
}
