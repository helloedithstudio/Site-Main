"use client";

import { useEffect, useRef, useState } from "react";

export type CompareRow = {
  name: string;
  artifact: string;
  width: number; // percent: a rhetorical scale, not a metric
  accent?: boolean;
};

// Scene 3 of the Studio page. Bars grow from the left when the section enters, staggered, and the winner carries the
// gradient. The widths are a visual argument, not measurements: the words at the end of each bar are what you are
// actually holding at that point of an engagement.
export function CompareBars({ rows }: { rows: CompareRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion needs no special case: styles/studio.css makes every transition instant for those visitors.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="sp-bars">
      {rows.map((row, i) => (
        <div key={row.name}>
          <div
            className={`sp-bar${row.accent ? " sp-bar-accent" : ""}`}
            style={{
              width: `${row.width}%`,
              transform: on ? "scaleX(1)" : "scaleX(0)",
              transition: `transform 1.4s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.18}s`,
            }}
          />
          <div className="sp-bar-row">
            <p className={`sp-body ${row.accent ? "sp-t1" : "sp-t2"}`}>{row.name}</p>
            <p
              className="sp-mono sp-t3"
              style={{ opacity: on ? 1 : 0, transition: `opacity 0.8s ease ${0.7 + i * 0.18}s` }}
            >
              {row.artifact}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
