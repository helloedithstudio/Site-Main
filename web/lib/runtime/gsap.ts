// GSAP setup — the Nuxt `gsap` plugin: CustomEase curves, SplitText and the
// `noiseReveal` effect used by the audit / media seals.

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;

function register() {
  if (registered || typeof window === "undefined") return;
  registered = true;

  gsap.registerPlugin(CustomEase, SplitText, ScrollTrigger);

  CustomEase.create(
    "mask",
    "M0,0 C0.25,0 0.289,0.216 0.321,0.426 0.355,0.654 0.441,0.838 0.496,0.886 0.535,0.92 0.698,1 1,1",
  );
  CustomEase.create(
    "snappy",
    "M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348,0.884 0.42,0.949 0.374,1 1,1",
  );
  CustomEase.create("expo-hard", "M0,0 C0.084,0.61 0.156,0.822 0.218,0.883 0.287,0.951 0.374,1 1,1");
  CustomEase.create("unmask", "M0,0 C0.16,1 0.3,1 1,1");

  const bias = 800;
  gsap.registerEffect({
    name: "noiseReveal",
    effect: (targets: gsap.TweenTarget, config: { duration: number; ease: string }) => {
      const tl = gsap.timeline();
      gsap.utils.toArray<Element>(targets).forEach((svg) => {
        const matrix = svg.querySelector("feColorMatrix");
        if (!matrix) return;
        const state = { bias };
        tl.fromTo(
          state,
          { bias },
          {
            bias: -bias,
            duration: config.duration,
            ease: config.ease,
            onUpdate: () =>
              matrix.setAttribute("values", `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${bias} 0 0 0 ${state.bias}`),
          },
          0,
        );
      });
      return tl;
    },
    defaults: { duration: 3, ease: "power1" },
    extendTimeline: true,
  });
}

register();

export { gsap, ScrollTrigger, SplitText, CustomEase };

/** Timeline with the registered `noiseReveal` effect (extendTimeline: true). */
export type EffectTimeline = gsap.core.Timeline & {
  noiseReveal: (target: Element | null | undefined, config?: object) => gsap.core.Timeline;
};
