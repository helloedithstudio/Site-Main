import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import heroBg from "@/assets/hero-atmosphere.jpg";

const headline = ["Everything", "your brand", "needs", "built."];
const D = 0.08; // starts almost immediately after curtainDone

interface HeroProps { curtainDone?: boolean; }

export function Hero({ curtainDone = false }: HeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.09]);
  const bgY     = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const eyebrowY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity  = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const show = curtainDone;

  return (
    <section
      id="top"
      ref={ref}
      className="noise relative isolate flex min-h-[100svh] w-full flex-col justify-center overflow-hidden"
    >
      {/* Background */}
      <motion.div style={{ scale: bgScale, y: bgY }} className="absolute inset-0 -z-10" aria-hidden>
        <img src={heroBg} alt="" className="h-full w-full object-cover object-[70%_center] opacity-85" width={1920} height={1280} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/5 to-background" />
      </motion.div>

      {/* Orb */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 1 } : {}}
        transition={{ duration: 3, ease: "easeOut", delay: D + 0.5 }}
        className="pointer-events-none absolute right-[-8%] top-[10%] -z-10 h-[50vw] w-[50vw] max-h-[560px] max-w-[560px] rounded-full"
        style={{ background: "radial-gradient(circle at 35% 35%, oklch(0.93 0.03 245 / 0.32), transparent 65%)", filter: "blur(36px)" }}
      />

      <motion.div style={{ y: contentY, opacity }} className="relative mx-auto w-full max-w-[1400px] px-5 pt-20 sm:px-8 sm:pt-24">

        {/* Eyebrow */}
        <motion.div style={{ y: eyebrowY }} className="mb-10 flex items-center gap-3 sm:mb-14">
          <motion.span
            initial={{ width: 0 }}
            animate={show ? { width: 32 } : {}}
            transition={{ duration: 1.0, delay: D, ease: [0.22, 1, 0.36, 1] }}
            className="block h-px bg-foreground/40"
          />
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={show ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: D + 0.1 }}
            className="eyebrow"
          >
            WEB DESIGN · DEVELOPMENT · AUTOMATION
          </motion.span>
        </motion.div>

        {/* Headline */}
        <h1 className="font-display text-display-lg text-foreground" style={{ fontSize: "clamp(3.5rem, 9.5vw, 10.5rem)", lineHeight: 0.92, letterSpacing: "-0.05em" }}>
          {headline.map((word, i) => (
            <span key={i} className="block overflow-hidden">
              <motion.span
                initial={{ y: "110%" }}
                animate={show ? { y: 0 } : {}}
                transition={{ duration: 1.0, delay: D + 0.15 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                className={`inline-block ${i === 3 ? "font-serif-display italic text-foreground/70" : ""}`}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        {/* Subtext only — no button */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={show ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: D + 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 max-w-[48ch] text-base leading-relaxed text-foreground/52 sm:mt-16 sm:text-lg"
        >
          Full-service creative technologist. One rate, worldwide.
        </motion.p>
      </motion.div>
    </section>
  );
}
