"use client";

// `useAccordion()` of the original: one open panel at a time, GSAP height tweens,
// closed panels get visibility:hidden once collapsed.

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "./gsap";

export function useAccordion({ duration = 0.5, ease = "snappy", initial = -1 } = {}) {
  const [current, setCurrent] = useState(initial);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const previous = useRef(initial);
  const latest = useRef(initial);
  latest.current = current;

  useEffect(() => {
    panels.current.forEach((el, i) => {
      if (!el) return;
      if (i === initial) gsap.set(el, { height: "auto" });
      else el.style.visibility = "hidden";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prev = previous.current;
    if (prev === current) return;
    previous.current = current;
    const closing = panels.current[prev];
    const opening = panels.current[current];
    if (prev !== -1 && closing) {
      gsap.to(closing, {
        height: 0,
        duration,
        ease,
        onComplete: () => {
          if (latest.current !== prev) closing.style.visibility = "hidden";
        },
      });
    }
    if (current !== -1 && opening) {
      opening.style.visibility = "";
      gsap.to(opening, { height: "auto", duration, ease });
    }
  }, [current, duration, ease]);

  const toggle = useCallback((i: number) => setCurrent((c) => (c === i ? -1 : i)), []);
  const setPanel = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      panels.current[i] = el;
    },
    [],
  );

  return { current, toggle, setPanel };
}
