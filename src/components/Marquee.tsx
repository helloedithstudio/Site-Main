import { motion } from "framer-motion";

const items = [
  "Web Development",
  "Cloud Architecture",
  "Automation Pipelines",
  "Graphic Design",
  "Software Engineering",
  "Digital Experiences",
  "AI-Assisted Delivery",
  "Flat Rate Projects",
];

export function Marquee() {
  return (
    <section className="relative px-5 py-6 sm:px-8 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="liquid-glass relative mx-auto max-w-[1280px] overflow-hidden rounded-[2.25rem] py-7 sm:rounded-full sm:py-8"
      >
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background/80 to-transparent sm:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background/80 to-transparent sm:w-40" />

        <div className="flex w-max marquee-track gap-14 whitespace-nowrap sm:gap-20">
          {[...items, ...items, ...items].map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-14 font-display text-2xl tracking-tight text-foreground/70 sm:gap-20 sm:text-4xl"
            >
              <span>{t}</span>
              <span className="text-amber text-lg sm:text-2xl">✦</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
