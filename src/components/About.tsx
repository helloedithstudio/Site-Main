import { motion, useInView, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { k: "Age", v: "20", numeric: 20 },
  { k: "Internships", v: "04", numeric: 4 },
  { k: "Markets", v: "4", numeric: 4 },
  { k: "Since", v: "2024", numeric: 2024 },
];

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        setDisplay(
          target < 100
            ? String(Math.round(v)).padStart(2, "0")
            : String(Math.round(v))
        );
      },
    });
    return () => controls.stop();
  }, [inView, target]);

  return (
    <dd ref={ref} className="mt-3 font-display text-3xl tracking-tight sm:text-5xl tabular-nums">
      {display}{suffix}
    </dd>
  );
}

export function About() {
  return (
    <section id="about" className="relative border-t border-foreground/[0.06] px-5 py-24 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-6 sm:gap-10">

        {/* Left — editorial text block */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-12 md:col-span-5"
        >
          <div>
              <p className="font-serif-display text-2xl italic leading-[1.45] tracking-tight text-foreground/90 sm:text-3xl">
                I'm Kevin — a 20-year-old developer and creative
                technologist based in Chennai, India. I build for clients
                across the UK, Europe, Australia and the US.
              </p>

              <p className="mt-8 text-base leading-relaxed text-foreground/55 max-w-[52ch]">
                My work sits at the intersection of engineering and craft.
                I use AI-assisted workflows to deliver fast without cutting
                corners — every project is personally led, start to finish.
              </p>

              <p className="mt-5 text-base leading-relaxed text-foreground/40 max-w-[52ch]">
                When I&rsquo;m not freelancing, I&rsquo;m building my own
                software products and publishing research in cloud computing.
              </p>

              <div className="mt-10 flex items-center gap-3">
                <span className="block h-px w-6 bg-foreground/25" />
                <span className="text-[11px] uppercase tracking-[0.22em] text-foreground/40">
                  Chennai · Global
                </span>
              </div>
          </div>
        </motion.div>

        {/* Right — heading + body + blockquote + stats */}
        <div className="col-span-12 md:col-span-6 md:col-start-7">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="eyebrow mb-6"
          >
            About
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-display-md"
          >
            Self-taught. Client-proven.{" "}
            <span className="font-serif-display italic">Still building.</span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.0, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 space-y-5 text-base leading-relaxed text-foreground/60 max-w-[52ch]"
          >
            <p>
              Twenty years old, BTech IT, Chennai. Four internships deep
              across SaaS, GenAI, and fintech. International clients.
              Built everything from scratch — no bootcamp, no shortcuts
              — shipping with an AI-assisted workflow that moves faster
              than most teams twice the size.
            </p>
          </motion.div>

          {/* Breakout quote */}
          <motion.blockquote
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.0, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 border-l border-foreground/20 pl-6 font-serif-display text-xl italic leading-[1.45] text-foreground/80"
          >
            The goal isn&rsquo;t a job — it&rsquo;s a studio.
          </motion.blockquote>

          {/* Stats — with count-up animation */}
          <motion.dl
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.0, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14 grid grid-cols-4 gap-4 border-t border-foreground/10 pt-8"
          >
            {stats.map((s) => (
              <div key={s.k}>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                  {s.k}
                </dt>
                {s.numeric !== null ? (
                  <CountUp target={s.numeric} />
                ) : (
                  <dd className="mt-3 font-display text-3xl tracking-tight sm:text-5xl">
                    {s.v}
                  </dd>
                )}
              </div>
            ))}
          </motion.dl>
        </div>

      </div>
    </section>
  );
}
