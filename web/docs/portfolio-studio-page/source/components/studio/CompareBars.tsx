"use client";

import { useEffect, useRef, useState } from "react";

export type CompareRow = {
  name: string;
  artifact: string;
  width: number; // percent — rhetorical scale, not a metric
  accent?: boolean;
};

/**
 * CompareBars — the Mac Studio performance-chart grammar, repurposed:
 * bars grow from the left when the section enters, staggered, the winner
 * carries the intelligence gradient. Widths are a visual argument, not
 * fabricated numbers — the "value" at the end of each bar is the artifact
 * you're actually holding at that point of an engagement.
 */
export function CompareBars({ rows }: { rows: CompareRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="space-y-12 sm:space-y-14">
      {rows.map((row, i) => (
        <div key={row.name}>
          <div
            className={`h-2.5 rounded-full ${
              row.accent ? "bar-intel" : "bg-hairline-strong"
            }`}
            style={{
              width: `${row.width}%`,
              transform: on ? "scaleX(1)" : "scaleX(0)",
              transformOrigin: "left center",
              transition: `transform 1.4s cubic-bezier(0.16,1,0.3,1) ${
                0.15 + i * 0.18
              }s`,
            }}
          />
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p
              className={`text-body ${
                row.accent ? "text-text-1" : "text-text-2"
              }`}
            >
              {row.name}
            </p>
            <p
              className="text-monosm text-text-3"
              style={{
                opacity: on ? 1 : 0,
                transition: `opacity 0.8s ease ${0.7 + i * 0.18}s`,
              }}
            >
              {row.artifact}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
