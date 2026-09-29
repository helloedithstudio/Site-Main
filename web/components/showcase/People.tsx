"use client";

// Chapter 6, the people: the Maintainers who run edith, from lib/legion.ts, with their GitHub pictures and links.
// Real people only; the directory of everyone is the Legion page.

import Link from "next/link";
import { showcasePage } from "@/lib/showcase";
import type { Person } from "@/lib/people";
import { PersonAvatar, PersonHandle, PersonLinks } from "../ui/PersonBits";

const copy = showcasePage.people;

export default function People({ maintainers }: { maintainers: Person[] }) {
  return (
    <section className="sc-people" aria-labelledby="sc-people-title">
      <div className="site-max px-20 s:px-0">
        <p className="type-caption uppercase text-gold">{copy.eyebrow}</p>
        <h2 id="sc-people-title" className="sc-title">
          {copy.title}
        </h2>
        <p className="type-body-md text-white sc-people__intro">{copy.intro}</p>
        <ul className="sc-people__list">
          {maintainers.map((p) => (
            <li key={p.login} className="sc-person">
              <PersonAvatar person={p} className="sc-person__avatar" />
              <div className="sc-person__main">
                <h3 className="sc-person__name">
                  {p.name}
                  {p.role ? <span className="sc-chip sc-chip--role">{p.role}</span> : null}
                </h3>
                <PersonHandle person={p} className="sc-person__handle" />
                {p.note ? <p className="sc-person__note">{p.note}</p> : null}
              </div>
              <PersonLinks person={p} />
            </li>
          ))}
        </ul>
        <Link href="/legion#maintainers" className="sc-link">
          {copy.seats}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
