"use client";

// The docs page: what has shipped, where the conversation happens, the FAQ, and the rules and legal documents. Same look as the home page (pitch black, hairlines, gradient rule), laid out like
// an Apple spec page: a sticky section index on the left and the long content on the right.

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getRuntime } from "@/lib/runtime";
import { brand } from "@/lib/brand";
import type { LinkItem } from "@/lib/content";
import { discussions, docsMeta, docsNav, faq, legalDocs, projects, type LegalDoc } from "@/lib/docs";
import Button from "../ui/Button";
import Footer from "../Footer";

const join: LinkItem = { id: "docs-join", label: brand.cta, internal: { id: "join", type: "page", title: brand.cta, slug: "join" }, external: "" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Escapes the text, then turns `channel` into the mono channel style. */
const rich = (s: string) => esc(s).replace(/`([^`]+)`/g, '<span class="edith-ch">$1</span>');

function Rich({ text, className }: { text: string; className?: string }) {
  return <p className={className} dangerouslySetInnerHTML={{ __html: rich(text) }} />;
}

/** A "#" beside a section title: sets the address bar to that section and copies the link (standard in developer docs). */
function HeadingLink({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.history.replaceState(null, "", `#${id}`);
    getRuntime().scroll.to(`#${id}`);
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  };
  return (
    <>
      <a href={`#${id}`} onClick={onClick} className={`hb-anchor${copied ? " is-copied" : ""}`} aria-label={`Link to ${title}`}>
        {copied ? "copied" : "#"}
      </a>
      <span className="edith-vh" role="status" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
    </>
  );
}

function Head({ id, title, intro, status }: { id: string; title: string; intro?: string; status?: string }) {
  return (
    <header className="hb-head">
      {status ? (
        <span className="hb-status">
          <i aria-hidden="true" />
          {status}
        </span>
      ) : null}
      <div className="edith-rule edith-rule--short" />
      <div className="hb-head__row">
        <h2 className="type-h2">{title}</h2>
        <HeadingLink id={id} title={title} />
      </div>
      {intro ? <Rich className="type-body-lg text-white hb-lead" text={intro} /> : null}
    </header>
  );
}

function Projects() {
  const p = projects;
  return (
    <section id={p.id} className="hb-section">
      <Head id={p.id} status={p.status} title={p.title} intro={p.intro} />
      <div className="hb-cards hb-cards--three">
        {Array.from({ length: p.slots }, (_, i) => (
          <article key={i} className="hb-card hb-card--open">
            <span className="type-caption uppercase edith-muted">{`Project ${String(i + 1).padStart(2, "0")}`}</span>
            <h3 className="type-h3 mt-15">{p.empty.title}</h3>
            <Rich className="type-body-sm text-white mt-15" text={p.empty.text} />
          </article>
        ))}
      </div>
      <div className="hb-notice hb-notice--quiet">
        <span className="hb-chip">Demo Day</span>
        <Rich className="type-body-sm text-white" text={p.demoDay} />
      </div>
    </section>
  );
}

function Discussions() {
  const d = discussions;
  return (
    <section id={d.id} className="hb-section">
      <Head id={d.id} title={d.title} intro={d.intro} />
      <ul className="hb-channels">
        {d.channels.map((c) => (
          <li key={c.channel} className="hb-channel">
            <span className="edith-ch hb-channel__name">{c.channel}</span>
            <span className="type-caption uppercase edith-muted">{c.hub}</span>
            <p className="type-body-sm text-white">{c.text}</p>
          </li>
        ))}
      </ul>
      <Rich className="type-body-md text-white hb-prose" text={d.rfcs} />
      <div className="hb-cta">
        <Button item={join} />
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id={faq.id} className="hb-section">
      <Head id={faq.id} title={faq.title} />
      <div className="hb-faq">
        {faq.items.map((item) => (
          <details key={item.q} className="hb-faq__item">
            <summary className="type-body-lg">{item.q}</summary>
            <Rich className="type-body-md text-white" text={item.a} />
          </details>
        ))}
      </div>
    </section>
  );
}

function Doc({ doc }: { doc: LegalDoc }) {
  return (
    <section id={doc.id} className="hb-section">
      <Head id={doc.id} title={doc.title} intro={doc.summary} />
      <p className="type-caption uppercase edith-muted hb-updated">{`Draft, last updated ${docsMeta.updated}`}</p>
      <ol className="hb-clauses">
        {doc.clauses.map((c, i) => (
          <li key={c.title} className="hb-clause">
            <span className="type-caption edith-muted hb-clause__n">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="type-body-lg">{c.title}</h3>
              {c.body.map((para) => (
                <Rich key={para.slice(0, 40)} className="type-body-md text-white hb-clause__p" text={para} />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Docs() {
  const [current, setCurrent] = useState(docsNav[0].items[0].id);

  useEffect(() => {
    getRuntime();
    const ids = docsNav.flatMap((g) => g.items.map((i) => i.id));
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setCurrent(first);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // arriving from a link such as /docs#terms
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const t = window.setTimeout(() => {
      if (document.getElementById(hash)) getRuntime().scroll.to(`#${hash}`, 0.8);
    }, 900);
    return () => window.clearTimeout(t);
  }, []);

  const go = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setCurrent(id);
    window.history.replaceState(null, "", `#${id}`);
    getRuntime().scroll.to(`#${id}`);
  };

  return (
    <main id="main" className="hb-main">
      <div className="hb-bg" aria-hidden="true" />
      <header className="hb-hero site-max">
        <p className="type-caption uppercase text-gold">Docs</p>
        <h1 className="type-display-xl edith-hero-title">
          The edith
          <br />
          docs
        </h1>
        <p className="type-body-lg text-white hb-lead">{docsMeta.subtitle}</p>
        <div className="hb-notice">
          <span className="hb-chip">Draft</span>
          <p className="type-body-sm text-white">{docsMeta.draftNotice}</p>
        </div>
      </header>
      <div className="hb-layout">
        <nav className="hb-nav" aria-label="Docs sections">
          {docsNav.map((g) => (
            <div key={g.group} className="hb-nav__block">
              <p className="hb-nav__group type-caption uppercase edith-muted">{g.group}</p>
              <ul>
                {g.items.map((i) => (
                  <li key={i.id}>
                    <a
                      href={`#${i.id}`}
                      onClick={go(i.id)}
                      aria-current={current === i.id ? "true" : undefined}
                      className={`hb-nav__link type-caption uppercase${current === i.id ? " is-active" : ""}`}
                    >
                      {i.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="hb-content">
          <Projects />
          <Discussions />
          <Faq />
          {legalDocs.map((doc) => (
            <Doc key={doc.id} doc={doc} />
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
