import { readdirSync, readFileSync } from "node:fs";
import { join, parse } from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import { Reveal } from "@/components/motion/Reveal";
import { StudioHero } from "@/components/studio/StudioHero";
import { ScrollFill } from "@/components/studio/ScrollFill";
import { Parallax } from "@/components/studio/Parallax";
import { CompareBars } from "@/components/studio/CompareBars";
import { FaqList } from "@/components/studio/FaqList";
import { STUDIO_URL, EMAIL } from "@/content/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  const tm = await getTranslations({ locale, namespace: "pageMeta" });
  return {
    title: t("studio"),
    description: tm("studio"),
    alternates: localeAlternates(locale, "/studio"),
  };
}

/**
 * /studio — staged as scenes, Apple contrast grammar: dark film → light
 * intelligence → dark comparison → light case study + method → dark
 * capability index → light FAQ → dark philosophy → the door. Scene tokens
 * are scoped in globals.css; the intelligence gradient (.text-intel) is the
 * one drop of color, spent on keywords only.
 */
const IMG = /\.(svg|png|webp|avif|jpe?g)$/i;

type PublicImage = { src: string; name: string; width: number; height: number };

/** Intrinsic pixel size read straight from the file header — PNG (IHDR) and
 * JPEG (SOF) cover every raster asset in /public here, so next/image gets real
 * dimensions with no build-time dependency. Returns null for vectors/unknowns. */
function rasterSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length >= 24 && buf.toString("ascii", 1, 4) === "PNG") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const m = buf[o + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7) };
      }
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }
  return null;
}

function scanPublic(dir: string): PublicImage[] {
  try {
    return readdirSync(join(process.cwd(), "public", dir))
      .filter((f) => IMG.test(f))
      .sort()
      .map((f) => {
        const size = rasterSize(readFileSync(join(process.cwd(), "public", dir, f)));
        return {
          src: `/${dir}/${encodeURIComponent(f)}`,
          name: parse(f).name.replace(/[-_]/g, " ").toLowerCase(),
          width: size?.width ?? 0,
          height: size?.height ?? 0,
        };
      });
  } catch {
    return [];
  }
}

const EXT_LINK =
  "underline decoration-1 underline-offset-[5px] decoration-hairline-strong transition-colors duration-300 hover:text-text-1 hover:decoration-current";

const COMPARE = [
  {
    name: "Edith Studio",
    artifact: "a working demo you can click",
    width: 100,
    accent: true,
  },
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
    body: "Booking, follow-up, recovery — the invisible part is the product.",
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
    a: "Client work stays private by default — that's a policy, not a shortage. What you get instead is better: a working demo of your own project, before any money moves.",
  },
  {
    q: "Do you only design?",
    a: "No. Design and engineering happen in the same head, so what gets designed is exactly what ships — nothing is lost between a designer's file and a developer's build.",
  },
  {
    q: "Do you also develop?",
    a: "Yes, end to end. Next.js, TypeScript, and the invisible plumbing — bookings, payments, follow-up, analytics. The pretty part and the part that works are the same build.",
  },
  {
    q: "How long does a project take?",
    a: "The first working demo lands in days. Full builds ship in weeks, not quarters — and the timeline goes in writing, next to the flat price.",
  },
  {
    q: "Can you redesign an existing website?",
    a: "Yes — and redesigns start the way everything here starts: with a demo of your site rebuilt, before any commitment.",
  },
  {
    q: "Do you build AI products?",
    a: "Yes. Claude and GPT are already wired into most systems the studio ships — standalone AI products are home turf, not an add-on.",
  },
];

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  const logos = scanPublic("logos");
  const mockups = scanPublic("mockups");
  const device = mockups.find((m) => m.name.includes("space")) ?? mockups[0];

  return (
    // Studio is a dark room by default, independent of the site-wide
    // light/dark toggle — only the alternating .scene-light/.scene-dark
    // sections below (and this wrapper itself) set the surface; nothing
    // here reads the global theme.
    <div className="scene-dark">
      {/* SCENE 1 · dark — the film is the room */}
      <StudioHero
        title={t("studio")}
        tagline="Designed with intent. Built for performance."
      />

      {/* SCENE 2 · light — manifesto + intelligence */}
      <section className="scene-light overflow-x-clip">
        <div className="py-36 sm:py-52">
          <div className="container-column">
            <ScrollFill
              className="mx-auto max-w-[24ch] text-center text-heading text-text-1"
              text="Beautiful is the baseline. The real work is underneath — booking that fills tables, follow-up that never forgets, systems that run while you sleep."
            />
          </div>

          <div className="container-column mt-40 sm:mt-56 text-center">
            {logos.length > 0 && (
              <div className="flex items-center justify-center gap-10 sm:gap-14">
                {logos.map((logo, i) => (
                  <Reveal key={logo.src} y={0} delay={i * 0.08}>
                    <Image
                      src={logo.src}
                      alt={logo.name}
                      width={logo.width}
                      height={logo.height}
                      sizes="200px"
                      className={`w-auto opacity-90 ${
                        logo.name.includes("claude")
                          ? "h-8 sm:h-10"
                          : "h-10 sm:h-12"
                      }`}
                    />
                  </Reveal>
                ))}
              </div>
            )}

            <Parallax speed={0.04}>
              <Reveal>
                <h2 className="mx-auto mt-14 max-w-[16ch] text-heading">
                  <span className="text-intel">Frontier intelligence.</span>
                  <br />
                  Built right in.
                </h2>
              </Reveal>
            </Parallax>

            <Reveal>
              <div className="mx-auto mt-12 grid max-w-[62rem] gap-10 text-left sm:grid-cols-2 sm:gap-14">
                <p className="text-bodylg text-text-2">
                  <strong>
                    Claude by{" "}
                    <a
                      href="https://www.anthropic.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EXT_LINK}
                    >
                      Anthropic
                    </a>{" "}
                    and{" "}
                    <a
                      href="https://openai.com/chatgpt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EXT_LINK}
                    >
                      GPT
                    </a>{" "}
                    by{" "}
                    <a
                      href="https://openai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EXT_LINK}
                    >
                      OpenAI
                    </a>
                  </strong>{" "}
                  are wired into the systems we ship — drafting replies,
                  routing bookings, recovering lost sales while the kitchen is
                  busy.
                </p>
                <p className="text-bodylg text-text-2">
                  No chatbot bolted onto the corner of a page. The models work
                  where the work is —{" "}
                  <strong>quietly, inside the pipeline</strong>, where good
                  systems live.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SCENE 3 · dark — the demo test */}
      <section className="scene-dark overflow-x-clip">
        <div className="container-column py-36 sm:py-52">
          <Parallax speed={0.05}>
            <Reveal>
              <p className="text-monosm uppercase text-text-3">
                The demo test
              </p>
              <h2 className="mt-5 max-w-[16ch] text-heading">
                Judge the product. Not the pitch
                <span className="text-text-3">.</span>
              </h2>
              <p className="mt-6 max-w-[50ch] text-bodylg text-text-2">
                Before any money moves, every studio hands you something.
                Compare what you&apos;re holding.
              </p>
            </Reveal>
          </Parallax>
          <Parallax speed={0.02}>
            <div className="mt-16 sm:mt-20">
              <CompareBars rows={COMPARE} />
            </div>
          </Parallax>
          <Reveal>
            <p className="mt-14 text-monosm text-text-3">
              if the demo doesn&apos;t convince you, it cost you nothing —
              that&apos;s the whole point
            </p>
          </Reveal>
        </div>
      </section>

      {/* SCENE 4 · light — case study, device half out of frame */}
      <section className="scene-light overflow-x-clip">
        <div className="py-36 sm:py-52">
          {device && (
            <div className="container-breakout">
              <div className="grid items-center gap-14 md:grid-cols-[minmax(0,44%)_1fr] md:gap-10">
                <Parallax speed={-0.03}>
                  <Reveal>
                    <p className="text-monosm uppercase text-text-3">
                      Case study — 01
                    </p>
                    <h2 className="mt-5 text-heading">
                      Mamacita&apos;s Miami Eats
                      <span className="text-text-3">.</span>
                    </h2>
                    <p className="mt-3 text-monosm text-text-3">
                      hospitality · US
                    </p>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <div className="mt-10 space-y-7">
                      <p className="text-body text-text-2">
                        <strong>The brief.</strong> Real food, a real crowd,
                        and no web presence to match. The site had to walk a
                        hungry visitor from craving to covered table in as few
                        taps as possible.
                      </p>
                      <p className="text-body text-text-2">
                        <strong className="text-intel">The thinking.</strong>{" "}
                        Start where hunger starts — the menu. Every screen
                        moves toward a booking; anything that didn&apos;t move
                        a table was cut from the design.
                      </p>
                      <p className="text-body text-text-2">
                        <strong>The proof.</strong> Built demo-first. The
                        owners clicked a working site before a single invoice
                        existed.
                      </p>
                    </div>
                  </Reveal>
                  <Reveal delay={0.14}>
                    <a
                      href={`mailto:${EMAIL}`}
                      className="mt-10 inline-block text-meta text-text-3 transition-colors duration-300 hover:text-text-1"
                    >
                      start yours →
                    </a>
                  </Reveal>
                </Parallax>

                {/* the device — enlarged, running off the right edge */}
                <Parallax speed={0.07}>
                  <Reveal delay={0.1}>
                    <Image
                      src={device.src}
                      alt="Mamacita's Miami Eats in development on a MacBook"
                      width={device.width}
                      height={device.height}
                      sizes="(max-width: 768px) 150vw, 90vw"
                      className="mockup-img w-[150%] max-w-none md:w-[220%]"
                    />
                  </Reveal>
                </Parallax>
              </div>
            </div>
          )}

          {/* the method — no boxes, just rules and type */}
          <div className="container-breakout mt-36 sm:mt-48">
            <Reveal>
              <p className="text-monosm uppercase text-text-3">How we work</p>
            </Reveal>
            <div className="mt-10 grid gap-x-10 gap-y-14 sm:grid-cols-3">
              {COMMITMENTS.map((c, i) => (
                <Reveal key={c.title} delay={i * 0.08}>
                  <div className="border-t border-hairline-strong pt-6">
                    <p className="text-monosm uppercase text-text-3">
                      {c.eyebrow}
                    </p>
                    <h3 className="mt-4 text-title">{c.title}</h3>
                    <p className="mt-3 max-w-[34ch] text-body text-text-2">
                      {c.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SCENE 5 · dark — the capability index */}
      <section className="scene-dark overflow-x-clip">
        <div className="container-column py-36 sm:py-52">
          <Parallax speed={0.05}>
            <Reveal>
              <p className="text-monosm uppercase text-text-3">What I build</p>
              <h2 className="mt-5 max-w-[14ch] text-heading">
                Not pricing. Just{" "}
                <span className="text-intel">capabilities</span>
                <span className="text-text-3">.</span>
              </h2>
            </Reveal>
          </Parallax>
          <div className="mt-14">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c} delay={i * 0.04}>
                <div className="group flex items-baseline gap-6 border-t border-hairline py-5 sm:py-6">
                  <span className="text-monosm text-text-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-title text-text-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 group-hover:text-text-1">
                    {c}
                  </span>
                </div>
              </Reveal>
            ))}
            <div className="border-t border-hairline" />
          </div>
        </div>
      </section>

      {/* SCENE 6 · light — FAQ */}
      <section className="scene-light overflow-x-clip">
        <div className="container-column py-36 sm:py-52">
          <Parallax speed={0.05}>
            <Reveal>
              <p className="text-monosm uppercase text-text-3">FAQ</p>
              <h2 className="mt-5 text-heading">
                Very <span className="text-intel">underrated</span>
                <span className="text-text-3">.</span>
              </h2>
            </Reveal>
          </Parallax>
          <Reveal>
            <div className="mt-14">
              <FaqList items={FAQ} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* SCENE 7 · dark — the philosophy */}
      <section className="scene-dark overflow-x-clip">
        <div className="container-column py-40 sm:py-56 text-center">
          <Reveal>
            <p className="text-monosm uppercase text-text-3">
              The philosophy
            </p>
          </Reveal>
          <Parallax speed={0.05}>
            <Reveal delay={0.06}>
              <h2 className="mt-10 text-display">
                <span className="block">Quiet on the surface.</span>
                <span className="mt-1 block">
                  <span className="text-intel">Relentless</span> underneath.
                </span>
              </h2>
            </Reveal>
          </Parallax>
          <Reveal delay={0.14}>
            <p className="mx-auto mt-10 max-w-[46ch] text-bodylg text-text-2">
              Every engagement is measured by tables filled, replies sent, and
              sales recovered — never by the deck it was pitched with.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-20 text-monosm text-text-3">
              Edith Studio — shipped worldwide
            </p>
          </Reveal>
        </div>
      </section>

      {/* SCENE 8 · house palette — the door */}
      <section className="container-column pt-36 pb-8 sm:pt-48">
        <Reveal>
          <p className="text-monosm uppercase text-text-3">The door</p>
          <h2 className="mt-5 text-heading">
            The studio has its own front door
            <span className="text-text-3">.</span>
          </h2>
          <p className="mt-5 max-w-[54ch] text-bodylg text-text-2">
            Edith Studio — the name on the work, and the place to start yours.
            Every project opens with a working demo; if it doesn&apos;t
            convince you, it cost you nothing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pill"
            >
              Visit Edith Studio
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a href={`mailto:${EMAIL}`} className="pill-ghost">
              Start with a demo
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
