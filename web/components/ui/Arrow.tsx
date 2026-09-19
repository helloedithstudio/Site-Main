"use client";

import type { MouseEventHandler } from "react";

export const ARROW_PATH =
  "M4.99262 24.2803C5.28551 24.5732 5.76039 24.5732 6.05328 24.2803L10.8262 19.5074C11.1191 19.2145 11.1191 18.7396 10.8262 18.4467C10.5334 18.1538 10.0585 18.1538 9.76559 18.4467L5.52295 22.6893L1.28031 18.4467C0.987415 18.1538 0.512541 18.1538 0.219648 18.4467C-0.0732459 18.7396 -0.0732459 19.2145 0.219648 19.5074L4.99262 24.2803ZM5.52295 0L4.77295 -3.27835e-08L4.77295 23.75L5.52295 23.75L6.27295 23.75L6.27295 3.27835e-08L5.52295 0Z";

/** Two stacked arrows that swap vertically on hover (used by every prev/next pill). */
export function ArrowGlyph({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 12 25" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        className="fill-current transition-transform duration-700 ease-out-expo delay-0 translate-y-[-125%] has-hover:group-hover:delay-200 has-hover:group-hover:translate-y-0"
        d={ARROW_PATH}
      />
      <path
        className="fill-current transition-transform duration-700 ease-out-expo delay-200 translate-y-0 has-hover:group-hover:delay-0 has-hover:group-hover:translate-y-[125%]"
        d={ARROW_PATH}
      />
    </svg>
  );
}

export default function Arrow({
  direction = "next",
  disabled = false,
  className,
  onClick,
}: {
  direction?: "prev" | "next";
  disabled?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous" : "Next"}
      disabled={disabled}
      className={`group flex items-center justify-center min-w-45 max-w-45 h-35 rounded-[4.5rem] bg-brown-dark border border-brown text-gold type-caption transition-opacity duration-500 ease-out disabled:opacity-0 disabled:pointer-events-none${className ? ` ${className}` : ""}`}
      onClick={onClick}
    >
      <ArrowGlyph className={`${direction === "prev" ? "rotate-90" : "-rotate-90"} w-auto h-15`} />
    </button>
  );
}
