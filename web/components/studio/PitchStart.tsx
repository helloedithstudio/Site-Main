"use client";

import { useEffect } from "react";
import { startPitch } from "@/lib/pitchClient";

// Pitch links (/studio?p=<token>) name the Maintainer who sent them. The header reads that to say "Book a call with
// <name>" and to open that Maintainer's booking link, so the page has to start the lookup. It renders nothing.
export default function PitchStart() {
  useEffect(() => {
    startPitch();
  }, []);
  return null;
}
