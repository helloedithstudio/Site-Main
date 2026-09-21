"use client";

// Social icon link: the glyph is used as a CSS mask over a cream rect, and a
// rect filled with the marble gradient wipes across through a noise displacement filter on hover (mouse only).

import { useEffect, useId, useRef } from "react";
import { gsap } from "@/lib/runtime/gsap";
import { useResizeFlags } from "@/lib/runtime/hooks";
import { cleanId } from "./Button";
import MarbleGradient from "./MarbleGradient";
import { DISCORD, INSTAGRAM, LINKEDIN } from "./glyphs";
import { socialLinks } from "@/lib/brand";

const ICONS = {
  discord: {
    viewBox: DISCORD.viewBox,
    cls: "h-16 w-auto block",
    d: DISCORD.d,
  },
  instagram: { viewBox: INSTAGRAM.viewBox, cls: "h-16 w-auto block", d: INSTAGRAM.d },
  linkedin: { viewBox: LINKEDIN.viewBox, cls: "h-16 w-auto block", d: LINKEDIN.d },
} as const;

export type SocialId = keyof typeof ICONS;

export const socials = socialLinks;

const maskStyle = (viewBox: string, d: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'><path d='${d}'/></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return {
    maskImage: url,
    WebkitMaskImage: url,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
  } as const;
};

export default function Social({ id, href, "aria-label": ariaLabel }: { id: SocialId; href: string; "aria-label"?: string }) {
  const icon = ICONS[id];
  const filterId = `sf-${cleanId(useId())}`;
  const gradId = `${filterId}-g`;
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

  const defaults = { duration: 0.7, ease: "power2.out" };
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative inline-block"
      style={maskStyle(icon.viewBox, icon.d)}
      aria-label={ariaLabel}
      {...(mouse ? { onMouseEnter, onMouseLeave } : {})}
    >
      <svg viewBox={icon.viewBox} className={icon.cls} aria-hidden="true">
        <defs>
          <filter id={filterId} x="-30%" y="-80%" width="200%" height="260%">
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
          <MarbleGradient id={gradId} />
        </defs>
        <rect x="-25%" y="-20%" width="150%" height="140%" fill="#ECE7E0" />
        <rect
          ref={fill}
          x="-25%"
          y="-20%"
          width="0"
          height="140%"
          fill={`url(#${gradId})`}
          style={{ filter: `url(#${filterId})` }}
        />
      </svg>
    </a>
  );
}
