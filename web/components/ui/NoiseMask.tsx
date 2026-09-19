"use client";

// Fractal-noise cover in the section colour; `noiseReveal` animates its
// feColorMatrix bias so the image underneath dissolves in on scroll.

import { forwardRef, useId } from "react";
import { cleanId } from "./Button";

const NoiseMask = forwardRef<SVGSVGElement, { className?: string }>(function NoiseMask({ className }, ref) {
  const id = `noise-mask-${cleanId(useId())}`;
  return (
    <svg
      ref={ref}
      className={`absolute top-[-1px] left-[-1px] size-[calc(100%+2px)] z-2 pointer-events-none${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      <defs>
        <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.004" numOctaves={4} result="noise" seed={8} />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  800 0 0 0 800" in="noise" result="mask" />
          <feFlood floodColor="currentColor" result="flood" />
          <feComposite in="flood" in2="mask" operator="in" />
        </filter>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" style={{ filter: `url(#${id})` }} />
    </svg>
  );
});

export default NoiseMask;
