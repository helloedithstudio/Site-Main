"use client";

// Round burger toggle (client-only, like the original). Its marble-gradient noise fill wipes in
// while the store flag it controls is on; the three lines morph into a cross.

import { useEffect, useId, useRef, type MouseEventHandler } from "react";
import { gsap } from "@/lib/runtime/gsap";
import { useFlag, type Flags } from "@/lib/runtime/store";
import ClientOnly from "./ui/ClientOnly";
import { cleanId } from "./ui/Button";
import MarbleGradient from "./ui/MarbleGradient";

const scope = { "data-v-90a5d995": "" };

function Toggle({
  label,
  flag,
  className,
  onClick,
  scopeAttrs,
}: {
  label: string;
  flag: keyof Flags;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  scopeAttrs?: Record<string, string>;
}) {
  const active = useFlag(flag);
  const id = `toggle-filter-${cleanId(useId())}`;
  const gradId = `${id}-g`;
  const fill = useRef<SVGRectElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const first = useRef(true);

  useEffect(() => {
    gsap.set(fill.current, { attr: { width: "0" } });
    return () => {
      tl.current?.kill();
    };
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const defaults = { duration: 1, ease: "power2.out" };
    tl.current?.kill();
    tl.current = active
      ? gsap
          .timeline({ defaults })
          .set(displacement.current, { attr: { scale: 150 } })
          .to(fill.current, { attr: { width: "150%" } }, 0)
          .to(displacement.current, { attr: { scale: 40 } }, 0)
      : gsap
          .timeline({ defaults })
          .to(fill.current, { attr: { scale: 150 }, duration: 0.5 }, 0)
          .to(fill.current, { attr: { width: "0" } }, 0)
          .to(displacement.current, { attr: { scale: 0 }, duration: 0.5 }, 0.5);
  }, [active]);

  return (
    <button
      type="button"
      className={`relative h-40 s:h-50 min-w-40 s:min-w-50 rounded-full bg-white flex items-center justify-center overflow-hidden${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      aria-label={active ? `Close ${label}` : `Open ${label}`}
      aria-expanded={active}
      onClick={onClick}
      {...scopeAttrs}
      {...scope}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" {...scope}>
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
          <MarbleGradient id={gradId} />
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
      <div className="relative z-10 lines h-1 min-w-15" {...scope}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="lines__line absolute inset-0 bg-black" {...scope} />
        ))}
      </div>
    </button>
  );
}

export default function MenuToggle(props: {
  label?: string;
  flag?: keyof Flags;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  scopeAttrs?: Record<string, string>;
}) {
  const { label = "menu", flag = "menuMobile", className, onClick, scopeAttrs } = props;
  return (
    <ClientOnly placeholder={{ className, ...scopeAttrs, ...scope }}>
      <Toggle label={label} flag={flag} className={className} onClick={onClick} scopeAttrs={scopeAttrs} />
    </ClientOnly>
  );
}
