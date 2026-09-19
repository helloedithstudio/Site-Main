"use client";

// The "default" layout of the original app: touch scroll wrapper, skip link, the
// brand-colour preloader that dissolves through a fractal-noise mask (with the logo),
// the low-power-mode test video, header and the small-screen menu.

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/runtime/gsap";
import { getRuntime } from "@/lib/runtime";
import { useMounted, useResizeFlags } from "@/lib/runtime/hooks";
import Header from "./Header";
import MobileMenu from "./MobileMenu";
import { LOGO } from "@/lib/logo";

const BIAS = 300;

// the preloader shows the wordmark, 240px wide, dissolving in through the noise mask
const PRELOADER_W = 240;
const PRELOADER_H = Math.round((PRELOADER_W * LOGO.height) / LOGO.width);

const TEST_VIDEO =
  "data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAACAG1wNDJpc28yYXZjMW1wNDEAAANObW9vdgAAAGxtdmhkAAAAAOA5QnjgOUJ4AAAD6AAAAEMAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAmt0cmFrAAAAXHRraGQAAAAD4DlCeOA5QngAAAABAAAAAAAAAEMAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAACAAAAAgAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAABDAAAAAAABAAAAAAHjbWRpYQAAACBtZGhkAAAAAOA5QnjgOUJ4AAFfkAAAF3BVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABjm1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAU5zdGJsAAAAznN0c2QAAAAAAAAAAQAAAL5hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAACAAIABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAMWF2Y0MBTUAo/+EAGWdNQCjspLYC1BgYGQAAAwABAAK/IA8YMZYBAAVo6uEyyAAAABNjb2xybmNseAAGAAYABgAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAF1IAABdSAAAAAYc3R0cwAAAAAAAAABAAAAAgAAC7gAAAAUc3RzcwAAAAAAAAABAAAAAQAAABxzdHNjAAAAAAAAAAEAAAABAAAAAgAAAAEAAAAcc3RzegAAAAAAAAAAAAAAAgAAAxAAAAAMAAAAFHN0Y28AAAAAAAAAAQAAA34AAABvdWR0YQAAAGdtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAADppbHN0AAAAMql0b28AAAAqZGF0YQAAAAEAAAAASGFuZEJyYWtlIDEuNi4xIDIwMjMwMTIyMDAAAAAIZnJlZQAAAyRtZGF0AAAC9AYF///w3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwMCBlZDBmN2E2IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMiAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTIgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9NiBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTEga2V5aW50PTMwMCBrZXlpbnRfbWluPTMwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9MzAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMi4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCB2YnZfbWF4cmF0ZT0yMDAwMCB2YnZfYnVmc2l6ZT0yNTAwMCBjcmZfbWF4PTAuMCBuYWxfaHJkPW5vbmUgZmlsbGVyPTAgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAABRliIQAK//+9q78yyt0fpUs1YVPgQAAAAhBmiFsQn/+Vg==";

function MaskFilter({ id, flood }: { id: string; flood: boolean }) {
  return (
    <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.02 0.02" numOctaves={3} result="noise" seed={8} />
      <feColorMatrix
        className="js-t-mask-cm"
        type="matrix"
        values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${BIAS} 0 0 0 ${BIAS}`}
        in="noise"
        result="mask"
      />
      {flood ? (
        <>
          <feFlood floodColor="currentColor" result="color" />
          <feComposite in="color" in2="mask" operator="in" />
        </>
      ) : (
        <feComposite in="SourceGraphic" in2="mask" operator="in" />
      )}
    </filter>
  );
}

export default function SiteShell({ children }: { children: ReactNode }) {
  const temp = useRef<HTMLDivElement>(null);
  const mask = useRef<SVGSVGElement>(null);
  const logo = useRef<SVGSVGElement>(null);
  const mounted = useMounted();
  const { small } = useResizeFlags();

  useEffect(() => {
    getRuntime().resize.mounted();
    let tl: gsap.core.Timeline | null = null;
    let cancelled = false;
    (async () => {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);
      await Promise.resolve();
      if (cancelled) return;
      const matrices = [...document.querySelectorAll(".js-t-mask-cm")];
      const state = { bias: BIAS };
      const apply = () =>
        matrices.forEach((m) => m.setAttribute("values", `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${BIAS} 0 0 0 ${state.bias}`));
      apply();
      tl = gsap
        .timeline({
          onComplete: () => {
            logo.current?.remove();
            tl?.kill();
            tl = null;
          },
        })
        .add(() => temp.current?.remove())
        .to(logo.current, { alpha: 1, duration: 0.35, ease: "power1" }, 0)
        .to(state, { bias: -BIAS, duration: 1.5, ease: "none", onUpdate: apply }, "-=.1")
        .set(mask.current, { zIndex: 98 });
    })();
    return () => {
      cancelled = true;
      tl?.kill();
    };
  }, []);

  const skipToContent = (e: React.MouseEvent) => {
    e.preventDefault();
    const main = document.getElementById("main");
    if (!main) return;
    getRuntime().scroll.to(main);
    main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
  };

  return (
    <div
      className="has-not-hover:fixed has-not-hover:inset-0 has-not-hover:overflow-y-auto js-mobile-scroll"
      data-mobile-scroll=""
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-15 focus:left-15 focus:z-[10000] focus:bg-black focus:border focus:border-brown-dark focus:rounded-3 focus:px-15 focus:py-10 type-caption uppercase"
        onClick={skipToContent}
      >
        Skip to content
      </a>
      <div ref={temp} className="fixed inset-0 pointer-events-none bg-brown-darker z-[9999]" />
      <svg
        ref={mask}
        className="fixed inset-0 size-full z-[9999] pointer-events-none text-brown-darker will-change-transform js-t-mask"
        aria-hidden="true"
      >
        <defs>
          <MaskFilter id="page-mask-filter" flood />
          <MaskFilter id="logo-mask-filter" flood={false} />
        </defs>
        <rect x="0" y="0" width="100%" height="100%" style={{ filter: "url(#page-mask-filter)" }} />
        <svg ref={logo} x="50%" y="50%" overflow="visible" className="opacity-0">
          <g transform={`translate(${-PRELOADER_W / 2} ${-PRELOADER_H / 2})`} filter="url(#logo-mask-filter)">
            <image href="/images/edith-logo.png" width={PRELOADER_W} height={PRELOADER_H} />
          </g>
        </svg>
      </svg>
      <video id="test-video" src={TEST_VIDEO} className="fixed invisible" muted autoPlay playsInline loop />
      <Header />
      {!mounted ? <span /> : small ? <MobileMenu /> : null}
      <div data-mobile-scroll-content="">{children}</div>
    </div>
  );
}
