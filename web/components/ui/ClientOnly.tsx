"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useMounted } from "@/lib/runtime/hooks";

/**
 * Nuxt's <ClientOnly>: renders an empty <span> (carrying the fallthrough attributes)
 * on the server and during hydration, then the children once mounted.
 */
export default function ClientOnly({
  children,
  placeholder,
}: {
  children: ReactNode;
  placeholder?: HTMLAttributes<HTMLSpanElement> & Record<`data-${string}`, string>;
}) {
  const mounted = useMounted();
  if (!mounted) return <span {...placeholder} />;
  return <>{children}</>;
}
