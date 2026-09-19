"use client";

// Header wordmark: the letters (public/images/edith-letters.png) are a CSS mask over a cream rect, with a
// rect in the accent colour that wipes in through a noise displacement filter on hover (mouse only). The red dot is drawn
// on top, outside the mask, so it stays red. Regenerate the assets with scripts/make-logo.cjs.

import { useEffect, useId, useRef } from "react";
import { theme } from "@/lib/theme";
import { gsap } from "@/lib/runtime/gsap";
import { useResizeFlags } from "@/lib/runtime/hooks";
import { LOGO } from "@/lib/logo";
import { cleanId } from "./ui/Button";

const VIEWBOX = `0 0 ${LOGO.width} ${LOGO.height}`;

const url = 'url("/images/edith-letters.png")';
const mask = {
  maskImage: url,
  WebkitMaskImage: url,
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
} as const;

const pct = (n: number, of: number) => `${(n / of) * 100}%`;
const dot = LOGO.dot
  ? {
      left: pct(LOGO.dot.cx - LOGO.dot.r, LOGO.width),
      top: pct(LOGO.dot.cy - LOGO.dot.r, LOGO.height),
      width: pct(LOGO.dot.r * 2, LOGO.width),
      height: pct(LOGO.dot.r * 2, LOGO.height),
    }
  : null;

export default function Logo(props: Record<`data-${string}`, string>) {
  const id = `sl-${cleanId(useId())}`;
  const fill = useRef<SVGRectElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const { mouse } = useResizeFlags();

  useEffect(() => {
    gsap.set(fill.current, { attr: { width: "0" } });
    return () => {
      tl.current?.kill();
    };
  }, []);

  const defaults = { duration: 1, ease: "power2.out" };
  const onMouseEnter = () => {
    tl.current?.kill();
    tl.current = gsap
      .timeline({ defaults })
      .set(displacement.current, { attr: { scale: 150 } })
      .to(fill.current, { attr: { width: "200%" } }, 0)
      .to(displacement.current, { attr: { scale: 40 } }, 0);
  };
  const onMouseLeave = () => {
    tl.current?.kill();
    tl.current = gsap
      .timeline({ defaults })
      .to(displacement.current, { attr: { scale: 150 }, duration: 0.5 }, 0)
      .to(fill.current, { attr: { width: "0" } }, 0)
      .to(displacement.current, { attr: { scale: 0 }, duration: 0.5 }, 0.5);
  };

  return (
    <div className="relative edith-logo" {...props} {...(mouse ? { onMouseEnter, onMouseLeave } : {})}>
      <div className="relative h-full" style={mask}>
        <svg viewBox={VIEWBOX} className="h-full w-auto block" aria-hidden="true">
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
          </defs>
          <rect x="-25%" y="-20%" width="150%" height="140%" fill="#EFEEEB" />
          <rect ref={fill} x="-25%" y="-20%" width="0" height="140%" fill={theme.accent} style={{ filter: `url(#${id})` }} />
        </svg>
      </div>
      {dot ? <span aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ ...dot, background: "#D64238" }} /> : null}
    </div>
  );
}
