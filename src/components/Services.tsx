import { motion } from "framer-motion";

const services = [
  {
    name: "Web Development",
    line: "Fast, precise interfaces built to convert and to last.",
  },
  {
    name: "Software Development",
    line: "Custom software that solves the exact problem, nothing more.",
  },
  {
    name: "Cloud & DevOps",
    line: "Scalable infrastructure shipped clean, from day one.",
  },
  {
    name: "Automation & AI Pipelines",
    line: "Repetitive work eliminated. Intelligent systems built instead.",
  },
  {
    name: "Graphic Design",
    line: "Print and digital collateral that makes a brand undeniable.",
  },
  {
    name: "Digital Experiences",
    line: "Immersive, interactive work that earns attention and keeps it.",
  },
];

export function Services() {
  return (
    <section id="services" className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:mb-20">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="eyebrow mb-6"
            >
              Services
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-display-md max-w-xl"
            >
              Six disciplines.{" "}
              <span className="font-serif-display italic">One engagement.</span>
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.15 }}
            className="max-w-xs text-sm leading-relaxed text-foreground/50 sm:text-right"
          >
            One engagement. Flat rate. Delivered fast — with or without the overhead.
          </motion.p>
        </div>

        <div className="border-t border-foreground/10">
          {services.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.9,
                delay: i * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group grid grid-cols-12 items-center gap-4 border-b border-foreground/10 py-7 transition-all duration-300 hover:bg-foreground/[0.035] sm:py-9"
            >
              {/* Number */}
              <span className="col-span-1 font-serif-display text-sm italic text-foreground/25 transition-colors duration-300 group-hover:text-foreground/40">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Service name */}
              <h3 className="col-span-12 font-display text-xl tracking-tight text-foreground transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-foreground/80 sm:col-span-4 sm:text-2xl">
                {s.name}
              </h3>

              {/* Description */}
              <p className="col-span-12 text-sm leading-relaxed text-foreground/50 max-w-[52ch] sm:col-span-5 sm:col-start-7 sm:text-base">
                {s.line}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
