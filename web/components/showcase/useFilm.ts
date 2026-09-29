"use client";

// One Showcase film: picks the cut that suits the screen, plays it on a canvas as the visitor scrolls, and keeps the
// canvas sharp on high-density screens. The caller decides how scroll progress maps to frames.

import { useEffect, useRef, type RefObject } from "react";
import { getRuntime } from "@/lib/runtime";
import { createFrameSequence, type FrameSequence } from "@/lib/runtime/frameSequence";
import { frameUrl, type Film, type FilmVariant } from "@/lib/showcase";
import type { Tier } from "@/lib/runtime/tier";

export const portraitScreen = () => typeof window !== "undefined" && window.innerHeight > window.innerWidth * 1.05;

/** The best cut for this screen: portrait on phones, 2560 wide on large high-density screens, 1920 otherwise. */
export function pickVariant(film: Film, tier: Tier): FilmVariant {
  const v = film.variants;
  const wide = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  const order = portraitScreen()
    ? ["portrait", "desktop-1920", "desktop"]
    : tier === "high" && wide > 2100
      ? ["desktop-2560", "desktop-1920", "desktop"]
      : ["desktop-1920", "desktop", "desktop-2560"];
  for (const name of order) if (v[name]) return v[name];
  return Object.values(v)[0];
}

/** Where the monolith sits in each cut, so cropping to other screen shapes never cuts it off. */
const FOCUS = { landscape: { x: 0.64, y: 0.5 }, portrait: { x: 0.5, y: 0.62 } };

export function useFilm(
  enabled: boolean,
  film: Film,
  tier: Tier,
  canvas: RefObject<HTMLCanvasElement | null>,
  near: RefObject<HTMLElement | null>,
  opts: { eager?: boolean; onFirstDraw?: () => void } = {},
) {
  const seq = useRef<FrameSequence | null>(null);
  const variant = useRef<FilmVariant | null>(null);
  const onFirstDraw = useRef(opts.onFirstDraw);
  useEffect(() => {
    onFirstDraw.current = opts.onFirstDraw;
  });

  useEffect(() => {
    if (!enabled || !canvas.current) return;
    const { resize } = getRuntime();
    const v = pickVariant(film, tier);
    variant.current = v;
    const s = createFrameSequence({
      count: v.count,
      src: (i) => frameUrl(v, i),
      canvas: canvas.current,
      frame: { w: v.w, h: v.h },
      fit: "cover",
      focus: v.h > v.w ? FOCUS.portrait : FOCUS.landscape,
      concurrency: opts.eager ? 6 : 4,
      idleStart: opts.eager ? undefined : 7000,
      near: opts.eager ? null : near.current,
      nearMargin: "250% 0px 250% 0px",
      window: 10,
      onFirstDraw: () => onFirstDraw.current?.(),
    });
    seq.current = s;
    const dpr = Math.min(window.devicePixelRatio || 1, tier === "high" ? 2 : 1.5);
    const onResize = (ww: number, wh: number) => s.resize(ww, wh, dpr);
    resize.add(onResize);
    return () => {
      resize.remove(onResize);
      s.destroy();
      seq.current = null;
    };
    // the film and tier are fixed for the life of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { seq, variant };
}

/** `t` mapped from [a, b] to [0, 1], clamped. */
export const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
export const ease = (t: number) => t * t * (3 - 2 * t);
