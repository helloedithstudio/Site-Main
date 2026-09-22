"use client";

// The Legion page: one directory of everyone (Maintainers first, then Catalysts) with search, filters by what people
// build, sort and show more, then how to earn a Maintainer seat. A ruled list rather than a wall of cards, so it stays
// readable when it holds a hundred people.

import { useEffect, useMemo, useRef, useState } from "react";
import { brand } from "@/lib/brand";
import type { LinkItem } from "@/lib/content";
import { legionInterests, legionPage } from "@/lib/legion";
import type { Person } from "@/lib/people";
import Button from "../ui/Button";
import Footer from "../Footer";
import { PersonAvatar, PersonHandle, PersonLinks } from "../ui/PersonBits";

const PAGE = 24;
const join: LinkItem = { id: "legion-join", label: brand.cta, internal: { id: "join", type: "page", title: brand.cta, slug: "join" }, external: "" };

type Filter = "all" | "maintainers" | string;

const isMaintainer = (p: Person) => p.role === "Origin" || p.role === "Maintainer";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Escapes the text, then turns `channel` into the mono channel style. */
const rich = (t: string) => esc(t).replace(/`([^`]+)`/g, '<span class="edith-ch">$1</span>');

export default function Legion({ people }: { people: Person[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"name" | "new">("name");
  const [shown, setShown] = useState(PAGE);
  const listRef = useRef<HTMLUListElement>(null);
  const focusRow = useRef<number | null>(null);

  // After "Show more", move focus to the first new row so keyboard and screen reader users land in the new content.
  useEffect(() => {
    if (focusRow.current === null) return;
    (listRef.current?.children[focusRow.current] as HTMLElement | undefined)?.focus();
    focusRow.current = null;
  }, [shown]);

  const hasDates = people.some((p) => p.joined);
  const maintainers = people.filter(isMaintainer).length;
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: people.length, maintainers: people.filter(isMaintainer).length };
    for (const i of legionInterests) c[i] = people.filter((p) => p.interests?.some((x) => x.toLowerCase() === i.toLowerCase())).length;
    return c;
  }, [people]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = people.filter((p) => {
      if (filter === "maintainers" && !isMaintainer(p)) return false;
      if (filter !== "all" && filter !== "maintainers" && !p.interests?.some((x) => x.toLowerCase() === filter.toLowerCase())) return false;
      if (!term) return true;
      return [p.name, p.login, p.note, p.role, ...(p.interests ?? [])].some((v) => v?.toLowerCase().includes(term));
    });
    out.sort((a, b) =>
      sort === "new" && hasDates
        ? (b.joined ?? "").localeCompare(a.joined ?? "")
        : Number(isMaintainer(b)) - Number(isMaintainer(a)) || a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
    return out;
  }, [people, q, filter, sort, hasDates]);

  const visible = list.slice(0, shown);
  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Everyone" },
    { id: "maintainers", label: "Maintainers" },
    ...legionInterests.map((i) => ({ id: i, label: i })),
  ];

  return (
    <main id="main" className="hb-main">
      <div className="hb-bg" aria-hidden="true" />
      <header className="hb-hero site-max px-20 s:px-0">
        <p className="type-caption uppercase text-gold">{legionPage.eyebrow}</p>
        <h1 className="type-display-xl edith-hero-title">
          Meet the
          <br />
          Legion
        </h1>
        <p className="type-body-lg text-white hb-lead">{legionPage.subtitle}</p>
      </header>

      <section className="cat site-max px-20 s:px-0" aria-label="Legion directory">
        <div className="cat__bar">
          <label className="cat__search">
            <span className="cat__sr">Search Catalysts</span>
            <input
              type="search"
              value={q}
              placeholder="Search by name, username or what they build"
              onChange={(e) => {
                setQ(e.target.value);
                setShown(PAGE);
              }}
            />
          </label>
          {hasDates ? (
            <div className="cat__sort" role="group" aria-label="Sort">
              <button type="button" aria-pressed={sort === "name"} onClick={() => setSort("name")}>
                A to Z
              </button>
              <button type="button" aria-pressed={sort === "new"} onClick={() => setSort("new")}>
                Newest
              </button>
            </div>
          ) : null}
        </div>

        <div className="cat__chips" role="group" aria-label="Filter">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className="cat__chip"
              aria-pressed={filter === c.id}
              onClick={() => {
                setFilter(c.id);
                setShown(PAGE);
              }}
            >
              {c.label}
              <span aria-hidden="true">{counts[c.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <p className="cat__count type-caption uppercase edith-muted" role="status" aria-atomic="true">
          {list.length} {list.length === 1 ? "person" : "people"}
          {list.length !== people.length ? ` of ${people.length}` : ""}
        </p>

        {visible.length ? (
          <ul className="cat__list" ref={listRef}>
            {visible.map((p) => (
              <li key={p.login} className="cat__row" tabIndex={-1}>
                <PersonAvatar person={p} className="cat__avatar" />
                <div className="cat__main">
                  <h2 className="cat__name">
                    {p.name}
                    {p.role ? <span className={`cat__role${isMaintainer(p) ? " is-maintainer" : ""}`}>{p.role}</span> : null}
                  </h2>
                  <PersonHandle person={p} className="cat__handle" />
                  {p.note ? <p className="cat__note">{p.note}</p> : null}
                  {p.interests?.length ? (
                    <p className="cat__tags">
                      {p.interests.map((i) => (
                        <span key={i}>{i}</span>
                      ))}
                    </p>
                  ) : null}
                </div>
                <PersonLinks person={p} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="cat__none type-body-md text-white">{legionPage.none}</p>
        )}

        {list.length > visible.length ? (
          <button type="button" className="cat__more" onClick={() => {
              focusRow.current = visible.length;
              setShown((n) => n + PAGE);
            }}>
            Show more ({list.length - visible.length} left)
          </button>
        ) : null}

        <section id={legionPage.seats.id} className="cat__seats" aria-labelledby="seats-title">
          <header className="hb-head">
            <span className="hb-status">
              <i aria-hidden="true" />
              {legionPage.seats.status}
            </span>
            <div className="edith-rule edith-rule--short" />
            <h2 id="seats-title" className="type-h2">
              {legionPage.seats.title}
            </h2>
            <p className="type-body-lg text-white hb-lead">{legionPage.seats.intro}</p>
          </header>
          <div className="hb-cards hb-cards--three">
            {Array.from({ length: legionPage.seats.open }, (_, i) => (
              <article key={i} className="hb-card hb-card--open">
                <span className="type-caption uppercase edith-muted">{`Seat ${String(maintainers + i + 1).padStart(2, "0")}`}</span>
                <h3 className="type-h3 mt-15">{legionPage.seats.openTitle}</h3>
                <p className="type-body-sm text-white mt-15" dangerouslySetInnerHTML={{ __html: rich(legionPage.seats.openText) }} />
              </article>
            ))}
          </div>
          <p className="type-body-md text-white hb-prose" dangerouslySetInnerHTML={{ __html: rich(legionPage.seats.path) }} />
        </section>

        <div className="cat__foot">
          {people.length <= PAGE ? <p className="type-body-md text-white">{legionPage.short}</p> : null}
          <p className="type-body-md text-white">{legionPage.optIn}</p>
          <div className="mt-20">
            <Button item={join} />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
