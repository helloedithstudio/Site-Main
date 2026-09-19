"use client";

// Button "Base" of the original: pill button whose fill wipes in through a fractal-noise displacement filter on
// hover. The fill is a radial gradient in the hero marble's own colours (theme.hoverStops). Its centre follows the
// pointer on a damped spring, fast movement stretches the glow and drags its hot spot behind the motion, and a slow
// drift keeps it moving when the pointer rests, so the colour behaves like the background rather than sitting flat.
// Touch devices and reduced-motion users get the same gradient, centred and still.

import { useCallback, useEffect, useId, useRef, type MouseEvent, type MouseEventHandler, type ReactNode } from "react";
import { theme } from "@/lib/theme";
import type { LinkItem } from "@/lib/content";
import { resolveLink, isExternal } from "@/lib/links";
import { gsap } from "@/lib/runtime/gsap";
import RouterLink from "./RouterLink";
import { DISCORD } from "./glyphs";

export const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

type Props = {
  to?: string | null;
  item?: LinkItem | null;
  tag?: "a" | "button" | "div" | null;
  className?: string;
  children?: ReactNode;
  iconRight?: ReactNode;
  onClick?: MouseEventHandler;
} & Record<`data-${string}`, string>;

const BASE =
  "relative inline-flex items-center justify-center h-50 px-20 rounded-full type-body-sm leading-none bg-white text-black overflow-hidden";

// Spring on the glow's centre, per second. Damping ratio 14 / (2 * sqrt(120)) = 0.64: under-damped, so the glow
// overshoots a touch and settles, like light catching up with the cursor.
const STIFFNESS = 120;
const DAMPING = 14;
/** How far fast movement pulls the hot spot back along the motion, in seconds of velocity. */
const SMEAR = 0.06;

type Sim = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; w: number; h: number; t: number; on: boolean };

const livePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Button({ to, item, tag, className, children, iconRight, onClick, ...rest }: Props) {
  const uid = cleanId(useId());
  const id = `btn-filter-${uid}`;
  const gradId = `btn-grad-${uid}`;
  const fill = useRef<SVGRectElement>(null);
  const glow = useRef<SVGRadialGradientElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const sim = useRef<Sim>({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, w: 0, h: 0, t: 0, on: false });

  const draw = useCallback(() => {
    const s = sim.current;
    const g = glow.current;
    if (!g) return;
    const speed = Math.hypot(s.vx, s.vy);
    const r = s.w * (0.75 + Math.min(speed / 1500, 0.45));
    // keep the focal point inside the circle however fast the pointer moves
    const k = speed ? Math.min(1, (0.5 * r) / (speed * SMEAR)) : 0;
    g.setAttribute("cx", s.x.toFixed(1));
    g.setAttribute("cy", s.y.toFixed(1));
    g.setAttribute("fx", (s.x - s.vx * SMEAR * k).toFixed(1));
    g.setAttribute("fy", (s.y - s.vy * SMEAR * k).toFixed(1));
    g.setAttribute("r", r.toFixed(1));
  }, []);

  // one physics step per frame, only while hovered or fading out
  const step = useCallback(
    (_time: number, deltaMs: number) => {
      const s = sim.current;
      const dt = Math.min(deltaMs / 1000, 1 / 30);
      s.t += dt;
      // a slow drift keeps the colour alive when the pointer rests, like the marble's own motion
      const tx = s.tx + Math.sin(s.t * 1.3) * s.w * 0.04;
      const ty = s.ty + Math.cos(s.t * 1.1) * s.h * 0.08;
      s.vx += (STIFFNESS * (tx - s.x) - DAMPING * s.vx) * dt;
      s.vy += (STIFFNESS * (ty - s.y) - DAMPING * s.vy) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      draw();
    },
    [draw],
  );

  const stop = useCallback(() => {
    if (!sim.current.on) return;
    gsap.ticker.remove(step);
    sim.current.on = false;
  }, [step]);

  useEffect(() => {
    gsap.set(fill.current, { attr: { width: "0" } });
    return () => {
      tl.current?.kill();
      stop();
    };
  }, [stop]);

  const pointer = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  };

  const defaults = { duration: 1, ease: "power2.out" };
  const onMouseEnter = (e: MouseEvent<HTMLElement>) => {
    const p = pointer(e);
    const s = sim.current;
    s.w = p.w;
    s.h = p.h;
    if (livePointer()) {
      // the glow is born where the pointer came in
      Object.assign(s, { x: p.x, y: p.y, tx: p.x, ty: p.y, vx: 0, vy: 0 });
      if (!s.on) {
        gsap.ticker.add(step);
        s.on = true;
      }
    } else {
      Object.assign(s, { x: p.w / 2, y: p.h / 2, vx: 0, vy: 0 });
    }
    draw();
    tl.current?.kill();
    tl.current = gsap
      .timeline({ defaults })
      .set(displacement.current, { attr: { scale: 150 } })
      .to(fill.current, { attr: { width: "150%" } }, 0)
      .to(displacement.current, { attr: { scale: 40 } }, 0);
  };
  const onMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!sim.current.on) return;
    const p = pointer(e);
    sim.current.tx = p.x;
    sim.current.ty = p.y;
  };
  const onMouseLeave = () => {
    tl.current?.kill();
    tl.current = gsap
      .timeline({ defaults, onComplete: stop })
      .to(fill.current, { attr: { scale: 150 }, duration: 0.5 }, 0)
      .to(fill.current, { attr: { width: "0" } }, 0)
      .to(displacement.current, { attr: { scale: 0 }, duration: 0.5 }, 0.5);
  };

  const content = (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={id} x="-30%" y="-80%" width="200%" height="260%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={4} result="noise" seed={5} />
            <feDisplacementMap
              ref={displacement}
              in="SourceGraphic"
              in2="noise"
              scale={0}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <radialGradient id={gradId} ref={glow} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">
            {theme.hoverStops.map((color, i) => (
              <stop key={color} offset={`${(i / (theme.hoverStops.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </radialGradient>
        </defs>
        <rect
          ref={fill}
          fill={`url(#${gradId})`}
          x="-25%"
          y="-20%"
          width="150%"
          height="140%"
          style={{ filter: `url(#${id})` }}
        />
      </svg>
      <div className="relative z-10 flex items-center gap-x-15">
        {children ?? (item?.label || item?.internal?.title)}
        {iconRight}
      </div>
    </>
  );

  const classes = className ? `${BASE} ${className}` : BASE;
  const handlers = { onMouseEnter, onMouseMove, onMouseLeave, onClick };
  const kind = tag
    ? tag
    : to
      ? isExternal(to)
        ? "a"
        : "router"
      : item?.external
        ? "a"
        : item?.internal
          ? "router"
          : "button";
  const link = resolveLink({ to, item });

  if (kind === "router" && link.href) {
    return (
      <RouterLink href={link.href} className={classes} {...handlers} {...rest}>
        {content}
      </RouterLink>
    );
  }
  if (kind === "a") {
    const external = link as { href?: string; target?: string; rel?: string };
    return (
      <a href={external.href} rel={external.rel} target={external.target} className={classes} {...handlers} {...rest}>
        {content}
      </a>
    );
  }
  if (kind === "div") {
    return (
      <div className={classes} {...handlers} {...rest}>
        {content}
      </div>
    );
  }
  return (
    <button className={classes} {...handlers} {...rest}>
      {content}
    </button>
  );
}

/** The Discord glyph used as the `icon-right` slot on the main call to action. */
export function DiscordIcon() {
  return (
    <svg className="h-20 w-auto" viewBox={DISCORD.viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d={DISCORD.d} className="fill-current" />
    </svg>
  );
}
