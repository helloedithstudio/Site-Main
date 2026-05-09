import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Marquee } from "./components/Marquee";
import { Projects } from "./components/Projects";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Process } from "./components/Process";
import { Testimonials } from "./components/Testimonials";
import { Pricing } from "./components/Pricing";
import { Contact } from "./components/Contact";
import { StatusStrip } from "./components/StatusStrip";
import { Cursor } from "./components/Cursor";
import { useLenis } from "./hooks/useLenis";
import { Analytics } from "@vercel/analytics/react";

const STUDIO_NAME = "KEVIN ANDREW STUDIO";

function Curtain({ onDone }: { onDone: () => void }) {
  const [nameVisible, setNameVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setNameVisible(true), 100);
    const t2 = setTimeout(onDone, 1850);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center justify-center bg-[oklch(0.11_0.005_250)]"
        style={{ height: "50vh" }}
        initial={{ y: 0 }}
        animate={{ y: nameVisible ? "-100%" : 0 }}
        transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1], delay: 0.65 }}
      >
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

        <motion.span
          className="mt-3 font-serif-display text-[11px] italic text-white/18"
          initial={{ opacity: 0 }}
          animate={nameVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.88 }}
        >
          est. 2024
        </motion.span>
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] bg-[oklch(0.11_0.005_250)]"
        style={{ height: "50vh" }}
        initial={{ y: 0 }}
        animate={{ y: nameVisible ? "100%" : 0 }}
        transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1], delay: 0.65 }}
      />

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

export default function App() {
  useLenis();
  const [curtainDone, setCurtainDone] = useState(false);

  return (
    <>
      <Analytics />
      <AnimatePresence>
        {!curtainDone && <Curtain onDone={() => setCurtainDone(true)} />}
      </AnimatePresence>

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
