import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import { CompareBars } from "@/components/studio/CompareBars";
import { FaqList } from "@/components/studio/FaqList";
import { Parallax } from "@/components/studio/Parallax";
import PitchStart from "@/components/studio/PitchStart";
import { Reveal } from "@/components/studio/Reveal";
import { ScrollFill } from "@/components/studio/ScrollFill";
import { StudioHero } from "@/components/studio/StudioHero";
import { brand } from "@/lib/brand";
import { seo } from "@/lib/content";
import "@/styles/studio.css";

// The Studio page: what clients see. It is the portfolio's own services page, kept in its own Apple-style look on
// purpose (stone tones, scenes that alternate dark and light, one gradient spent on keywords), so it does not follow the
// dev site's theme. Scenes: film, manifesto, the demo test, case study and method, capabilities, FAQ, philosophy, the door.
// Every visible word is listed in docs/portfolio-studio-page/copy.md; the styles are in styles/studio.css.

const title = `Studio | ${seo.siteName}`;
const description =
  "Edith Studio, a small design and engineering practice by Kevin Andrew. Products and AI systems that simply work, built end to end for select clients.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/studio" },
  openGraph: { type: "website", title, description, url: `${seo.baseUrl}/studio`, siteName: seo.siteName },
  twitter: { card: "summary_large_image", title, description },
};

const LOGOS = [
  { src: "/studio-page/logos/claude.png", alt: "Claude", width: 1280, height: 275, className: "sp-logo sp-logo-claude" },
  { src: "/studio-page/logos/openai.png", alt: "OpenAI", width: 2000, height: 2030, className: "sp-logo" },
];
const DEVICE = { src: "/studio-page/mockups/space-black.png", width: 2048, height: 1237 };

const COMPARE = [
  { name: "Edith Studio", artifact: "a working demo you can click", width: 100, accent: true },
  { name: "Typical agency", artifact: "a proposal deck", width: 42 },
  { name: "Template shop", artifact: "a theme preview", width: 22 },
];

const COMMITMENTS = [
  {
    eyebrow: "The rule",
    title: "Demo first.",
    body: "You see it working before any money moves. Approval by evidence, never by pitch.",
  },
  {
    eyebrow: "The number",
    title: "One price.",
    body: "Flat, in writing, before the build starts. Scope changes are conversations.",
  },
  {
    eyebrow: "The point",
    title: "Systems, not pages.",
    body: "Booking, follow-up, recovery: the invisible part is the product.",
  },
];

const CAPABILITIES = [
  "Landing Pages",
  "Portfolio Websites",
  "Startup Websites",
  "Dashboards",
  "Design Systems",
  "Internal Tools",
  "Developer Platforms",
];

const FAQ = [
  {
    q: "Can I see examples?",
    a: "Client work stays private by default. That's a policy, not a shortage. What you get instead is better: a working demo of your own project, before any money moves.",
  },
  {
    q: "Do you only design?",
    a: "No. Design and engineering happen in the same head, so what gets designed is exactly what ships. Nothing is lost between a designer's file and a developer's build.",
  },
  {
    q: "Do you also develop?",
    a: "Yes, end to end. Next.js, TypeScript, and the invisible plumbing: bookings, payments, follow-up, analytics. The pretty part and the part that works are the same build.",
  },
  {
    q: "How long does a project take?",
    a: "The first working demo lands in days. Full builds ship in weeks, not quarters, and the timeline goes in writing, next to the flat price.",
  },
  {
    q: "Can you redesign an existing website?",
    a: "Yes, and redesigns start the way everything here starts: with a demo of your site rebuilt, before any commitment.",
  },
  {
    q: "Do you build AI products?",
    a: "Yes. Claude and GPT are already wired into most systems the studio ships. Standalone AI products are home turf, not an add-on.",
  },
];

const mailto = `mailto:${brand.email}`;

export default function StudioPage() {
  return (
    <>
      <PitchStart />
      <main id="main" className="sp sp-dark">
        {/* SCENE 1 (dark): the film is the room */}
        <StudioHero title="Studio" tagline="Designed with intent. Built for performance." />

        {/* SCENE 2 (light): manifesto and intelligence */}
        <section className="sp-light sp-scene">
          <div className="sp-pad">
            <div className="sp-column">
              <ScrollFill
                className="sp-heading sp-manifesto"
                text="Beautiful is the baseline. The real work is underneath: booking that fills tables, follow-up that never forgets, systems that run while you sleep."
              />
            </div>

            <div className="sp-column sp-logos-block">
              <div className="sp-logos">
                {LOGOS.map((logo, i) => (
                  <Reveal key={logo.src} y={0} delay={i * 0.08}>
                    <Image
                      src={logo.src}
                      alt={logo.alt}
                      width={logo.width}
                      height={logo.height}
                      sizes="200px"
                      className={logo.className}
                    />
                  </Reveal>
                ))}
              </div>

              <Parallax speed={0.04}>
                <Reveal>
                  <h2 className="sp-heading sp-intel-heading">
                    <span className="sp-intel">Frontier intelligence.</span>
                    <br />
                    Built right in.
                  </h2>
                </Reveal>
              </Parallax>

              <Reveal>
                <div className="sp-intel-grid">
                  <p className="sp-bodylg sp-t2">
                    <strong>
                      Claude by{" "}
                      <a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer" className="sp-ext-link">
                        Anthropic
                      </a>{" "}
                      and{" "}
                      <a href="https://openai.com/chatgpt" target="_blank" rel="noopener noreferrer" className="sp-ext-link">
                        GPT
                      </a>{" "}
                      by{" "}
                      <a href="https://openai.com" target="_blank" rel="noopener noreferrer" className="sp-ext-link">
                        OpenAI
                      </a>
                    </strong>{" "}
                    are wired into the systems we ship: drafting replies, routing bookings, recovering lost sales while
                    the kitchen is busy.
                  </p>
                  <p className="sp-bodylg sp-t2">
                    No chatbot bolted onto the corner of a page. The models work where the work is:{" "}
                    <strong>quietly, inside the pipeline</strong>, where good systems live.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SCENE 3 (dark): the demo test */}
        <section className="sp-dark sp-scene">
          <div className="sp-column sp-pad">
            <Parallax speed={0.05}>
              <Reveal>
                <p className="sp-mono sp-eyebrow sp-t3">The demo test</p>
                <h2 className="sp-heading sp-test-heading">
                  Judge the product. Not the pitch<span className="sp-t3">.</span>
                </h2>
                <p className="sp-bodylg sp-t2 sp-test-lede">
                  Before any money moves, every studio hands you something. Compare what you&apos;re holding.
                </p>
              </Reveal>
            </Parallax>
            <Parallax speed={0.02}>
              <div className="sp-bars-wrap">
                <CompareBars rows={COMPARE} />
              </div>
            </Parallax>
            <Reveal>
              <p className="sp-mono sp-t3 sp-footnote">
                if the demo doesn&apos;t convince you, it cost you nothing, and that&apos;s the whole point
              </p>
            </Reveal>
          </div>
        </section>

        {/* SCENE 4 (light): case study, with the device half out of frame */}
        <section className="sp-light sp-scene">
          <div className="sp-pad">
            <div className="sp-breakout">
              <div className="sp-case">
                <Parallax speed={-0.03}>
                  <Reveal>
                    <p className="sp-mono sp-eyebrow sp-t3">Case study 01</p>
                    <h2 className="sp-heading sp-case-heading">
                      Mamacita&apos;s Miami Eats<span className="sp-t3">.</span>
                    </h2>
                    <p className="sp-mono sp-t3 sp-case-meta">hospitality · US</p>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <div className="sp-case-body">
                      <p className="sp-body sp-t2">
                        <strong>The brief.</strong> Real food, a real crowd, and no web presence to match. The site had
                        to walk a hungry visitor from craving to covered table in as few taps as possible.
                      </p>
                      <p className="sp-body sp-t2">
                        <strong className="sp-intel">The thinking.</strong> Start where hunger starts: the menu. Every
                        screen moves toward a booking; anything that didn&apos;t move a table was cut from the design.
                      </p>
                      <p className="sp-body sp-t2">
                        <strong>The proof.</strong> Built demo-first. The owners clicked a working site before a single
                        invoice existed.
                      </p>
                    </div>
                  </Reveal>
                  <Reveal delay={0.14}>
                    <a href={mailto} className="sp-meta sp-t3 sp-case-link">
                      start yours →
                    </a>
                  </Reveal>
                </Parallax>

                {/* the device, enlarged and running off the right edge */}
                <Parallax speed={0.07}>
                  <Reveal delay={0.1}>
                    <Image
                      src={DEVICE.src}
                      alt="Mamacita's Miami Eats in development on a MacBook"
                      width={DEVICE.width}
                      height={DEVICE.height}
                      sizes="(max-width: 768px) 150vw, 90vw"
                      className="sp-mockup"
                    />
                  </Reveal>
                </Parallax>
              </div>
            </div>

            {/* the method: no boxes, just rules and type */}
            <div className="sp-breakout sp-method">
              <Reveal>
                <p className="sp-mono sp-eyebrow sp-t3">How we work</p>
              </Reveal>
              <div className="sp-commits">
                {COMMITMENTS.map((c, i) => (
                  <Reveal key={c.title} delay={i * 0.08}>
                    <div className="sp-commit">
                      <p className="sp-mono sp-eyebrow sp-t3">{c.eyebrow}</p>
                      <h3 className="sp-title sp-commit-title">{c.title}</h3>
                      <p className="sp-body sp-t2 sp-commit-body">{c.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 5 (dark): the capability index */}
        <section className="sp-dark sp-scene">
          <div className="sp-column sp-pad">
            <Parallax speed={0.05}>
              <Reveal>
                <p className="sp-mono sp-eyebrow sp-t3">What I build</p>
                <h2 className="sp-heading sp-cap-heading">
                  Not pricing. Just <span className="sp-intel">capabilities</span>
                  <span className="sp-t3">.</span>
                </h2>
              </Reveal>
            </Parallax>
            <div className="sp-caps">
              {CAPABILITIES.map((c, i) => (
                <Reveal key={c} delay={i * 0.04}>
                  <div className="sp-cap">
                    <span className="sp-mono sp-t3">{String(i + 1).padStart(2, "0")}</span>
                    <span className="sp-title sp-t2 sp-cap-name">{c}</span>
                  </div>
                </Reveal>
              ))}
              <div className="sp-caps-end" />
            </div>
          </div>
        </section>

        {/* SCENE 6 (light): FAQ */}
        <section className="sp-light sp-scene">
          <div className="sp-column sp-pad">
            <Parallax speed={0.05}>
              <Reveal>
                <p className="sp-mono sp-eyebrow sp-t3">FAQ</p>
                <h2 className="sp-heading sp-faq-heading">
                  Very <span className="sp-intel">underrated</span>
                  <span className="sp-t3">.</span>
                </h2>
              </Reveal>
            </Parallax>
            <Reveal>
              <div className="sp-faq-wrap">
                <FaqList items={FAQ} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* SCENE 7 (dark): the philosophy */}
        <section className="sp-dark sp-scene">
          <div className="sp-column sp-pad-lg sp-center">
            <Reveal>
              <p className="sp-mono sp-eyebrow sp-t3">The philosophy</p>
            </Reveal>
            <Parallax speed={0.05}>
              <Reveal delay={0.06}>
                <h2 className="sp-display sp-phil-heading">
                  <span className="sp-phil-line">Quiet on the surface.</span>
                  <span className="sp-phil-line">
                    <span className="sp-intel">Relentless</span> underneath.
                  </span>
                </h2>
              </Reveal>
            </Parallax>
            <Reveal delay={0.14}>
              <p className="sp-bodylg sp-t2 sp-phil-body">
                Every engagement is measured by tables filled, replies sent, and sales recovered, never by the deck it
                was pitched with.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="sp-mono sp-t3 sp-phil-sign">Edith Studio, shipped worldwide</p>
            </Reveal>
          </div>
        </section>

        {/* SCENE 8 (house black, like the footer it hands over to): the door */}
        <section className="sp-house sp-scene">
          <div className="sp-column sp-door">
            <Reveal>
              <p className="sp-mono sp-eyebrow sp-t3">The door</p>
              <h2 className="sp-heading sp-door-heading">
                The studio has its own front door<span className="sp-t3">.</span>
              </h2>
              <p className="sp-bodylg sp-t2 sp-door-body">
                Edith Studio is the name on the work, and the place to start yours. Every project opens with a working
                demo; if it doesn&apos;t convince you, it cost you nothing.
              </p>
              <div className="sp-door-actions">
                <Link href="/" className="sp-pill">
                  Visit Edith Studio
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
                <a href={mailto} className="sp-pill-ghost">
                  Start with a demo
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
