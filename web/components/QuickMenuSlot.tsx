"use client";

// <ClientOnly>{!$resize.small && <QuickMenu />}</ClientOnly>

import { useMounted, useResizeFlags } from "@/lib/runtime/hooks";
import QuickMenu from "./QuickMenu";

export default function QuickMenuSlot() {
  const mounted = useMounted();
  const { small } = useResizeFlags();
  if (!mounted) return <span />;
  return small ? null : <QuickMenu />;
}
