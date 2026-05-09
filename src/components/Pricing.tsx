import { motion } from "framer-motion";

const essentialFeatures = [
  "Custom responsive website",
  "Mobile-first design",
  "Up to 5 pages",
  "Contact form",
  "Deployed and ready to launch",
];

const growthExtras = [
  "SEO optimisation",
  "Google Search Console setup",
  "6 months of content updates",
  "Performance audit",
];

function Check({ dark }: { dark?: boolean }) {
  return (
    <span className={`inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[10px] font-medium ${dark ? "bg-background/12 text-background/65" : "bg-foreground/[0.07] text-foreground/55"}`}>
      ✓
    </span>
  );
}

function FeatureRow({ label, dark, muted }: { label: string; dark?: boolean; muted?: boolean }) {
  return (
    <li className={`flex items-center gap-3 py-2.5 text-sm border-b last:border-0 ${dark ? "border-background/[0.07]" : "border-foreground/[0.06]"} ${muted ? (dark ? "text-background/45" : "text-foreground/40") : (dark ? "text-background/70" : "text-foreground/65")}`}>
      <Check dark={dark} />
      {label}
    </li>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="relative mx-auto w-full max-w-[1400px] px-5 py-28 sm:px-8 sm:py-36">

      {/* Header */}
      <div className="mb-14 grid grid-cols-1 items-end gap-8 md:grid-cols-2">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8 }}
            className="eyebrow"
          >
            ⌘ — Pricing
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 font-display text-display-md text-foreground"
          >
            Two packages.{" "}
            <span className="font-serif-display italic text-foreground/55">No surprises.</span>
          </motion.h2>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.9, delay: 0.12 }}
          className="max-w-[52ch] text-base leading-relaxed text-foreground/48 md:justify-self-end md:text-right"
        >
          Flat-rate. Scope agreed upfront. No hourly billing, no surprise invoices.
        </motion.p>
      </div>

      {/* Equal-height cards */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">

        {/* Essential — 5 cols */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-1 flex flex-col overflow-hidden rounded-[2rem] border border-foreground/[0.08] bg-background/60 p-9 backdrop-blur-xl transition-all duration-500 hover:border-foreground/18 lg:col-span-5 sm:p-10"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-foreground/38">Essential</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/48">
              A complete web presence, built right and ready to launch.
            </p>
          </div>
          <div className="mt-8">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-foreground/32 mb-2">Starting from</span>
            <span className="font-display text-6xl tracking-tight text-foreground sm:text-7xl">€500</span>
          </div>
          <div className="my-8 h-px bg-foreground/[0.07]" />
          <ul className="flex-1">
            {essentialFeatures.map(f => <FeatureRow key={f} label={f} />)}
          </ul>
          <a
            href="https://calendly.com/kevinandrew"
            target="_blank"
            rel="noopener noreferrer"
            data-magnet
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-foreground/12 py-3.5 text-[13px] font-medium tracking-tight text-foreground transition-all duration-300 hover:border-foreground/35 hover:bg-foreground hover:text-background"
          >
            Start with Essential →
          </a>
        </motion.div>

        {/* Growth — 7 cols, dark */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative col-span-1 flex flex-col overflow-hidden rounded-[2rem] bg-foreground p-9 lg:col-span-7 sm:p-10"
        >
          <div className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-background/12 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-background/55">
            <span className="h-1 w-1 rounded-full bg-background/45" />
            Most Complete
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-background/38">Growth</p>
            <p className="mt-2 text-sm leading-relaxed text-background/48">
              Everything in Essential — plus tools to get found and stay sharp.
            </p>
          </div>
          <div className="mt-8">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-background/32 mb-2">Starting from</span>
            <span className="font-display text-6xl tracking-tight text-background sm:text-7xl">€800</span>
          </div>
          <div className="my-8 h-px bg-background/[0.12]" />

          <ul className="flex-1">
            {/* "Everything in Essential" — single line, not repeated list */}
            <li className="flex items-center gap-3 border-b border-background/[0.07] py-2.5 text-sm text-background/55">
              <span className="inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-background/12 text-[10px] font-medium text-background/65">✓</span>
              Everything in Essential
            </li>

            {/* Visual separator */}
            <li aria-hidden className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-background/[0.08]" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-background/28 flex-none">Plus</span>
              <div className="flex-1 h-px bg-background/[0.08]" />
            </li>

            {/* Growth-only extras */}
            {growthExtras.map(f => <FeatureRow key={f} label={f} dark />)}
          </ul>

          <a
            href="https://calendly.com/kevinandrew"
            target="_blank"
            rel="noopener noreferrer"
            data-magnet
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-background py-3.5 text-[13px] font-medium tracking-tight text-foreground transition-all duration-300 hover:bg-background/90"
          >
            Reserve this package →
          </a>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.2 }}
        className="mt-8 text-center text-sm text-foreground/32"
      >
        Larger or custom scope?{" "}
        <a href="mailto:hello@kevinandrew.studio" className="underline underline-offset-4 decoration-foreground/16 transition-colors hover:text-foreground/58">
          Let&rsquo;s talk
        </a>{" "}
        — every project is quoted personally.
      </motion.p>
    </section>
  );
}
