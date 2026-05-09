import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "Traffic from Google tripled in the first month. Reservations up 40%. He didn't need things explained twice.",
    what: "Brochure site + booking integration",
    role: "Restaurant owner",
    location: "Edinburgh, UK",
    initial: "R",
    metric: "+40% bookings",
    featured: true,
  },
  {
    quote:
      "We came in with a rough brief and a tight deadline. He came back with an architecture we hadn't considered and a site our investors kept bringing up in meetings.",
    what: "Brand site + CMS build",
    role: "Co-founder",
    location: "New York, US",
    initial: "M",
    metric: "Investor-ready in 3 weeks",
    featured: false,
  },
  {
    quote:
      "A project we'd budgeted six weeks for was live in under two. No corners cut, no follow-up fixes. Just done.",
    what: "E-commerce build",
    role: "Brand founder",
    location: "Melbourne, AU",
    initial: "S",
    metric: "6 weeks → 12 days",
    featured: false,
  },
  {
    quote:
      "Our previous agency took three months and handed us something we were embarrassed to share. Kevin delivered something we're proud of. Night and day.",
    what: "Full website redesign",
    role: "Creative director",
    location: "London, UK",
    initial: "J",
    metric: "Complete redesign, 18 days",
    featured: false,
  },
];

function Avatar({ initial, dark }: { initial: string; dark?: boolean }) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full border font-display text-sm tracking-tight ${
        dark
          ? "border-white/15 bg-white/8 text-white/80"
          : "border-foreground/12 bg-foreground/[0.04] text-foreground/70"
      }`}
    >
      {initial}
    </div>
  );
}

function MetricPill({ label, dark, solid }: { label: string; dark?: boolean; solid?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium tracking-tight ${
        solid
          ? "bg-background text-foreground"
          : dark
          ? "bg-white/10 text-white/60"
          : "bg-foreground/[0.06] text-foreground/50"
      }`}
    >
      {label}
    </span>
  );
}

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative mx-auto w-full max-w-[1400px] px-5 py-28 sm:px-8 sm:py-36"
    >
      {/* Header */}
      <div className="mb-10 sm:mb-12">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.8 }}
          className="eyebrow"
        >
          ✷ — What clients say
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          className="mt-6 font-display text-display-md max-w-2xl"
        >
          Results that speak.{" "}
          <span className="font-serif-display italic text-foreground/55">
            In their own words.
          </span>
        </motion.h2>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">

        {/* Featured — left, 7 cols, dark */}
        <motion.figure
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-1 flex flex-col justify-between overflow-hidden rounded-[1.75rem] bg-foreground px-6 py-9 md:col-span-7 sm:p-12"
        >
          {/* What was built */}
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-4 bg-white/20" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/35">
              {testimonials[0].what}
            </span>
          </div>

          <blockquote className="font-display text-3xl leading-[1.28] tracking-tight text-background/88 sm:text-4xl">
            &ldquo;{testimonials[0].quote}&rdquo;
          </blockquote>

          <div className="mt-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar initial={testimonials[0].initial} dark />
              <div>
                <p className="text-[12px] font-medium text-white/60">{testimonials[0].role}</p>
                <p className="text-[11px] text-white/30">{testimonials[0].location}</p>
              </div>
            </div>
            <MetricPill label={testimonials[0].metric} dark solid />
          </div>
        </motion.figure>

        {/* Right stack — 5 cols */}
        <div className="col-span-1 flex flex-col gap-4 md:col-span-5">

          {/* Card 2 */}
          <motion.figure
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8%" }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-foreground/[0.08] bg-background/50 px-6 py-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-0.5 hover:border-foreground/18 sm:p-9"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-4 bg-foreground/15" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/35">
                {testimonials[1].what}
              </span>
            </div>
            <blockquote className="font-display text-xl leading-[1.35] tracking-tight text-foreground/80 sm:text-2xl">
              &ldquo;{testimonials[1].quote}&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar initial={testimonials[1].initial} />
                <div>
                  <p className="text-[12px] font-medium text-foreground/55">{testimonials[1].role}</p>
                  <p className="text-[11px] text-foreground/30">{testimonials[1].location}</p>
                </div>
              </div>
              <MetricPill label={testimonials[1].metric} />
            </div>
          </motion.figure>

          {/* Card 3 */}
          <motion.figure
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8%" }}
            transition={{ duration: 1, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-foreground/[0.08] bg-background/50 px-6 py-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-0.5 hover:border-foreground/18 sm:p-9"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-4 bg-foreground/15" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/35">
                {testimonials[2].what}
              </span>
            </div>
            <blockquote className="font-display text-xl leading-[1.35] tracking-tight text-foreground/80 sm:text-2xl">
              &ldquo;{testimonials[2].quote}&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar initial={testimonials[2].initial} />
                <div>
                  <p className="text-[12px] font-medium text-foreground/55">{testimonials[2].role}</p>
                  <p className="text-[11px] text-foreground/30">{testimonials[2].location}</p>
                </div>
              </div>
              <MetricPill label={testimonials[2].metric} />
            </div>
          </motion.figure>
        </div>

        {/* Full-width bottom card */}
        <motion.figure
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ duration: 1, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-1 flex flex-col gap-6 overflow-hidden rounded-[1.75rem] border border-foreground/[0.08] bg-background/50 px-6 py-8 backdrop-blur-xl transition-all duration-500 hover:border-foreground/18 md:col-span-12 sm:flex-row sm:items-center sm:justify-between sm:p-10"
        >
          <div className="flex items-center gap-3">
            <span className="h-px w-4 bg-foreground/15" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/35">
              {testimonials[3].what}
            </span>
          </div>
          <blockquote className="flex-1 font-display text-2xl leading-[1.3] tracking-tight text-foreground/80 sm:text-3xl">
            &ldquo;{testimonials[3].quote}&rdquo;
          </blockquote>
          <div className="flex flex-shrink-0 items-center gap-6 sm:flex-col sm:items-end">
            <MetricPill label={testimonials[3].metric} />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[12px] font-medium text-foreground/55">{testimonials[3].role}</p>
                <p className="text-[11px] text-foreground/30">{testimonials[3].location}</p>
              </div>
              <Avatar initial={testimonials[3].initial} />
            </div>
          </div>
        </motion.figure>
      </div>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-20 h-px w-full origin-left bg-foreground/[0.08]"
      />
    </section>
  );
}
