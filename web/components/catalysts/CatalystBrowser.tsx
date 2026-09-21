"use client";

// The Catalyst directory: search, filter by what people build, sort, and show more. A ruled list rather than a wall of
// cards, so it stays readable when it holds a hundred people.

import { useEffect, useMemo, useRef, useState } from "react";
import { brand } from "@/lib/brand";
import type { LinkItem } from "@/lib/content";
import { catalystInterests, catalystsPage } from "@/lib/catalysts";
import type { Person } from "@/lib/people";
import Button from "../ui/Button";
import Footer from "../Footer";
import { PersonAvatar, PersonHandle, PersonLinks } from "../ui/PersonBits";

const PAGE = 24;
const join: LinkItem = { id: "catalysts-join", label: brand.cta, internal: null, external: brand.discord };

type Filter = "all" | "maintainers" | string;

const isMaintainer = (p: Person) => p.role === "Origin" || p.role === "Maintainer";

export default function CatalystBrowser({ people }: { people: Person[] }) {
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
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: people.length, maintainers: people.filter(isMaintainer).length };
    for (const i of catalystInterests) c[i] = people.filter((p) => p.interests?.some((x) => x.toLowerCase() === i.toLowerCase())).length;
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
      sort === "new" && hasDates ? (b.joined ?? "").localeCompare(a.joined ?? "") : a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
    return out;
  }, [people, q, filter, sort, hasDates]);

  const visible = list.slice(0, shown);
  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Everyone" },
    { id: "maintainers", label: "Maintainers" },
    ...catalystInterests.map((i) => ({ id: i, label: i })),
  ];

  return (
    <main id="main" className="hb-main">
      <div className="hb-bg" aria-hidden="true" />
      <header className="hb-hero site-max px-20 s:px-0">
        <p className="type-caption uppercase text-gold">{catalystsPage.eyebrow}</p>
        <h1 className="type-display-xl edith-hero-title">
          Meet the
          <br />
          Catalysts
        </h1>
        <p className="type-body-lg text-white hb-lead">{catalystsPage.subtitle}</p>
      </header>

      <section className="cat site-max px-20 s:px-0" aria-label="Catalyst directory">
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
          {list.length} {list.length === 1 ? "Catalyst" : "Catalysts"}
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
          <p className="cat__none type-body-md text-white">{catalystsPage.none}</p>
        )}

        {list.length > visible.length ? (
          <button type="button" className="cat__more" onClick={() => {
              focusRow.current = visible.length;
              setShown((n) => n + PAGE);
            }}>
            Show more ({list.length - visible.length} left)
          </button>
        ) : null}

        <div className="cat__foot">
          {people.length <= PAGE ? <p className="type-body-md text-white">{catalystsPage.short}</p> : null}
          <p className="type-body-md text-white">{catalystsPage.optIn}</p>
          <div className="mt-20">
            <Button item={join} />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
