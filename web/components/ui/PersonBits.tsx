"use client";

// A person's picture (their GitHub avatar, with an initial if it cannot load) and their quick links.

import { useState } from "react";
import type { Person } from "@/lib/people";

export function PersonAvatar({ person, className }: { person: Person; className?: string }) {
  const [failed, setFailed] = useState(false);
  const cls = `edith-avatar${className ? ` ${className}` : ""}`;
  if (failed || !person.avatar) {
    return (
      <span className={`${cls} edith-avatar--fallback`} aria-hidden="true">
        {person.name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cls}
      src={person.avatar}
      alt=""
      width={80}
      height={80}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function PersonLinks({ person }: { person: Person }) {
  return (
    <div className="edith-plinks">
      <a href={person.github} target="_blank" rel="noopener noreferrer" className="edith-plink" aria-label={`${person.name} on GitHub`}>
        GitHub <span aria-hidden="true">↗</span>
      </a>
      {person.portfolio ? (
        <a href={person.portfolio} target="_blank" rel="noopener noreferrer" className="edith-plink" aria-label={`${person.name}'s portfolio`}>
          Portfolio <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}
