import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import evoir from "@/assets/project-evoir.jpg";
import ss2 from "@/assets/ss2.png";
import blossom from "@/assets/project-blossom.jpg";
import ss3 from "@/assets/ss3.png";
import lofi from "@/assets/project-lofi.jpg";
import ss1 from "@/assets/ss1.png";
import ai from "@/assets/project-ai.jpg";
import ss4 from "@/assets/ss4.png";
import cloud from "@/assets/project-cloud.jpg";
import mamacita from "@/assets/project-mamacita.png";

type Project = {
  index: string;
  name: string;
  tag: string;
  role: string;
  stack: string;
  year: string;
  overview: string;
  image: string;
  align: "left" | "right";
  ratio: "tall" | "wide";
};

const projects: Project[] = [
  {
    index: "01",
    name: "Mamacita's Miami Eats",
    tag: "Food & Hospitality",
    role: "Designer · Developer",
    stack: "Next.js · Tailwind",
    year: "2026",
    overview:
      "A Cuban sandwich shop in Edinburgh — immersive, mobile-first, built to turn online discovery into foot traffic. Cold outreach demo.",
    image: mamacita,
    align: "left",
    ratio: "tall",
  },
  {
    index: "02",
    name: "Vega",
    tag: "AI TOOLING",
    role: "Developer · Designer",
    stack: "React · Python · AI Agents",
    year: "2026",
    overview:
      "An autonomous security research tool — five AI agents that crawl, hypothesise, simulate attacks, and confirm real vulnerabilities in real time. Built at a hackathon.",
    image: ss3,
    align: "right",
    ratio: "wide",
  },
  {
    index: "03",
    name: "Etch",
    tag: "DEVELOPER TOOLING",
    role: "Founder · Full-Stack Engineer",
    stack: "Rust · React · Cloud",
    year: "2026",
    overview:
      "A cryptographic code provenance protocol for the age of generative AI — sign your work, prove authorship, and create an immutable fingerprint chain that survives any dispute.",
    image: ss2,
    align: "left",
    ratio: "wide",
  },
  {
    index: "04",
    name: "Intern OS",
    tag: "SAAS DASHBOARD",
    role: "Engineer · Product",
    stack: "React · Node.js · AI",
    year: "2025",
    overview:
      "An internal task and attendance management platform built during a UK SaaS internship — AI-assisted task routing, real-time productivity analytics, and a dashboard designed to actually get used.",
    image: ss4,
    align: "right",
    ratio: "wide",
  },
  {
    index: "05",
    name: "Residency Redesign",
    tag: "HOSPITALITY",
    role: "Sole Developer",
    stack: "React · Vite",
    year: "2025",
    overview:
      "A full website for a mid-scale hospitality property in Tamil Nadu — built to communicate comfort, drive direct bookings, and replace an outdated presence with something guests would actually trust.",
    image: ss1,
    align: "left",
    ratio: "wide",
  },
];

import { useIsMobile } from "@/hooks/use-mobile";

function ProjectRow({ project, i }: { project: Project; i: number }) {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], isMobile ? [0, 0] : [80, -80]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], isMobile ? [1, 1, 1] : [1.08, 1, 1.04]);
  const titleY = useTransform(scrollYProgress, [0, 1], isMobile ? [0, 0] : [40, -40]);

  const isLeft = project.align === "left";

  return (
    <div
      ref={ref}
      className={`relative grid grid-cols-12 gap-x-6 gap-y-8 sm:gap-y-12 ${
        i === 0 ? "" : "mt-24 sm:mt-36"
      }`}
    >
      {/* Image */}
      <motion.div
        style={{ y }}
        className={`relative col-span-12 ${
          isLeft ? "md:col-span-7" : "md:col-span-7 md:col-start-6"
        }`}
      >
        <div
          data-cursor-text="Similar →"
          className={`group relative overflow-hidden rounded-[20px] bg-muted cursor-none ${
            project.ratio === "tall" ? "aspect-[4/5]" : "aspect-[16/10]"
          }`}
        >
          <motion.img
            src={project.image}
            alt={project.name}
            loading="lazy"
            style={{ scale }}
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full object-cover will-change-transform"
          />
          {/* Hover overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-foreground/10"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-foreground/5" />
        </div>

        <div className="mt-5 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-foreground/50">
          <span>{project.index} — {project.tag}</span>
          <span>{project.year}</span>
        </div>
      </motion.div>

      {/* Text panel */}
      <motion.div
        style={{ y: titleY }}
        className={`col-span-12 flex flex-col justify-center ${
          isLeft
            ? "md:col-span-4 md:col-start-9"
            : "md:col-span-4 md:col-start-1 md:row-start-1"
        }`}
      >
        <motion.h3
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-display-md"
        >
          <span className="block">{project.name}</span>
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-sm text-base leading-relaxed text-foreground/60"
        >
          {project.overview}
        </motion.p>
        <motion.dl
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 grid grid-cols-2 gap-y-5 text-[12px]"
        >
          <dt className="uppercase tracking-[0.2em] text-foreground/40">Role</dt>
          <dd className="text-right text-foreground/80">{project.role}</dd>
          <dt className="uppercase tracking-[0.2em] text-foreground/40">Stack</dt>
          <dd className="text-right text-foreground/80">{project.stack}</dd>
          <dt className="uppercase tracking-[0.2em] text-foreground/40">Year</dt>
          <dd className="text-right text-foreground/80">{project.year}</dd>
        </motion.dl>
        <motion.a
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
          href="#contact"
          data-magnet
          className="group mt-10 inline-flex w-fit items-center gap-2.5 rounded-full border border-foreground/15 px-5 py-2.5 text-[13px] font-medium tracking-tight text-foreground/70 transition-all duration-300 hover:border-foreground/40 hover:bg-foreground hover:text-background"
        >
          Start something similar
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </motion.a>
      </motion.div>
    </div>
  );
}

export function Projects() {
  return (
    <section id="work" className="relative px-5 py-32 sm:px-8 sm:py-48">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-20 flex items-end justify-between gap-8 sm:mb-32">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="eyebrow mb-6"
            >
              Selected Work · 2024 — 2026
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-display-lg max-w-3xl"
            >
              The work{" "}
              <span className="font-serif-display italic">speaks.</span>
            </motion.h2>
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="hidden shrink-0 select-none font-display text-[80px] leading-none tracking-tight text-foreground/[0.05] md:block"
            aria-hidden
          >
            06
          </motion.span>
        </div>

        {projects.map((p, i) => (
          <ProjectRow key={p.index} project={p} i={i} />
        ))}
      </div>
    </section>
  );
}
