"use client";

// "Simple" image: <figure><img> that fades in once loaded.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export default function SimpleImage({
  src,
  alt = "",
  eager = false,
  transition = true,
  className,
  style,
  children,
}: {
  src: string;
  alt?: string;
  eager?: boolean;
  transition?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const image = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = image.current;
    if (!img) return;
    if (img.complete) setLoaded(true);
    else img.onload = () => setLoaded(true);
  }, []);

  return (
    <figure className={className} style={style}>
      {children}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={image}
        src={src}
        alt={alt}
        className={
          loaded ? (transition ? "transition-opacity duration-200 ease-out opacity-100" : "opacity-100") : "opacity-0"
        }
        loading={eager ? "eager" : "lazy"}
        draggable="false"
      />
    </figure>
  );
}
