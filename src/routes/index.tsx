import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Projects } from "@/components/Projects";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { Process } from "@/components/Process";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { Contact } from "@/components/Contact";
import { StatusStrip } from "@/components/StatusStrip";
import { Cursor } from "@/components/Cursor";
import { useLenis } from "@/hooks/useLenis";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Kevin Andrew — Creative Technologist · Web, Software & Design" },
      { name: "description", content: "Creative technologist based in Chennai. Web development, cloud infrastructure, graphic design, and automation for clients in the UK, Europe, Australia and the US." },
      { property: "og:title", content: "Kevin Andrew — Creative Technologist" },
      { property: "og:description", content: "Everything your brand needs built. One rate, worldwide." },
    ],
  }),
  component: Index,
}));

const STUDIO_NAME = "KEVIN ANDREW STUDIO";

function Curtain({ onDone }: { onDone: () => void }) {
  const [nameVisible, setNameVisible] = useState(false);

  useEffect(() => {
    // Start name reveal after 100ms
    const t1 = setTimeout(() => setNameVisible(true), 100);
    // Signal done after full animation completes (name reveal + panels open)
    const t2 = setTimeout(onDone, 1850);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <>
      {/* Top curtain panel */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center justify-center bg-[oklch(0.11_0.005_250)]"
        style={{ height: "50vh" }}
        initial={{ y: 0 }}
        animate={{ y: nameVisible ? "-100%" : 0 }}
        transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1], delay: 0.65 }}
      >
        {/* Studio name — character by character */}
        <div className="overflow-hidden">
          <div className="flex items-center">
            {STUDIO_NAME.split("").map((char, i) => (
              <motion.span
                key={i}
                className="inline-block font-display text-[13px] tracking-[0.38em] uppercase text-white/40"
                initial={{ y: "100%", opacity: 0 }}
                animate={nameVisible ? { y: 0, opacity: 1 } : {}}
                transition={{
                  duration: 0.55,
                  delay: i * 0.038,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {char === " " ? "\u00a0\u00a0" : char}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Year — fades in after name completes */}
        <motion.span
          className="mt-3 font-serif-display text-[11px] italic text-white/18"
          initial={{ opacity: 0 }}
          animate={nameVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.88 }}
        >
          est. 2024
        </motion.span>
      </motion.div>

      {/* Bottom curtain panel */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] bg-[oklch(0.11_0.005_250)]"
        style={{ height: "50vh" }}
        initial={{ y: 0 }}
        animate={{ y: nameVisible ? "100%" : 0 }}
        transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1], delay: 0.65 }}
      />

      {/* Seam hairline — vanishes as panels split */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-1/2 z-[201] h-px bg-white/10"
        initial={{ opacity: 1, scaleX: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3, delay: 1.2, ease: "easeIn" }}
      />
    </>
  );
}

function Index() {
  useLenis();
  const [curtainDone, setCurtainDone] = useState(false);

  return (
    <>
      <AnimatePresence>{!curtainDone && <Curtain onDone={() => setCurtainDone(true)} />}</AnimatePresence>

      <main className="relative">
        <Cursor />
        <Nav />
        <Hero curtainDone={curtainDone} />
        <Marquee />
        <Projects />
        <About />
        <Services />
        <Process />
        <Testimonials />
        <Pricing />
        <StatusStrip />
        <Contact />
      </main>
    </>
  );
}
