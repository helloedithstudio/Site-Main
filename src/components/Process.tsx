import { motion } from "framer-motion";

const steps = [
  {
    n: "01",
    t: "Listen",
    d: "A focused discovery call — understanding the brief, the constraints, and what success actually looks like.",
  },
  {
    n: "02",
    t: "Compose",
    d: "Design and architecture decisions made before a single line of code. The right plan beats fast execution.",
  },
  {
    n: "03",
    t: "Engineer",
    d: "Built with the best-fit stack for the problem — clean, documented, and delivered on schedule.",
  },
  {
    n: "04",
    t: "Refine",
    d: "One structured revision round included. Feedback absorbed, changes shipped, project closed with precision.",
  },
];

export function Process() {
  return (
    <section id="process" className="relative px-5 py-24 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-[1400px]">

        {/* Header */}
        <div className="mb-20 sm:mb-28">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="eyebrow mb-6"
          >
            ⌘ — Process
          </motion.p>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-display-md max-w-xl"
            >
              How every project{" "}
              <span className="font-serif-display italic text-foreground/60">
                gets delivered.
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.12 }}
              className="max-w-[42ch] text-sm leading-relaxed text-foreground/45 sm:text-right"
            >
              Four steps. No retainers, no hidden phases, no surprises.
            </motion.p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connector line */}
          <div aria-hidden className="absolute left-0 right-0 top-[2.75rem] hidden h-px bg-foreground/[0.07] lg:block" />

          <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.9, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                className="group relative flex flex-col bg-background p-8 transition-colors duration-500 hover:bg-foreground/[0.025] sm:p-10"
              >
                {/* Step indicator — step number replaces generic dot */}
                <div className="relative mb-10 flex items-center gap-4">
                  <div className="relative z-10 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border border-foreground/18 bg-background transition-all duration-500 group-hover:border-foreground/45">
                    <span className="font-display text-[9px] font-semibold tracking-tight text-foreground/40 transition-all duration-500 group-hover:text-foreground/70">
                      {s.n}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
                  {s.t}
                </h3>

                {/* Description */}
                <p className="mt-4 text-sm leading-[1.7] text-foreground/55 max-w-[38ch]">
                  {s.d}
                </p>

                {/* Bottom accent */}
                <div className="mt-8 h-px w-full origin-left scale-x-0 bg-foreground/12 transition-transform duration-700 group-hover:scale-x-100" />

                {/* Connector arrow */}
                {i < steps.length - 1 && (
                  <span aria-hidden className="pointer-events-none absolute -right-[0.5px] top-[2.75rem] z-20 hidden -translate-y-1/2 translate-x-1/2 rounded-full bg-background p-1 text-[9px] text-foreground/25 lg:flex">
                    ›
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
