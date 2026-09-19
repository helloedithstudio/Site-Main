import QuickMenuSlot from "@/components/QuickMenuSlot";
import GlCanvas from "@/components/GlCanvas";
import Hero from "@/components/sections/Hero";
import WhatIsEdith from "@/components/sections/WhatIsEdith";
import Hubs from "@/components/sections/Hubs";
import Loop from "@/components/sections/Loop";
import Membership from "@/components/sections/Membership";
import ShowOff from "@/components/sections/ShowOff";
import Franchise from "@/components/sections/Franchise";
import Decisions from "@/components/sections/Decisions";
import Safety from "@/components/sections/Safety";
import Beliefs from "@/components/sections/Beliefs";
import Faq from "@/components/sections/Faq";
import Footer from "@/components/Footer";

// The story runs: what edith is, where it happens, how an idea moves, how you level up, proof, the studio,
// how decisions get made, trust, culture, questions.
//
// The wrapper holds the sticky tech-grid backdrop from the hero down to the end of the loop. The hero marble is
// drawn by WebGL into the full-screen hero, then scroll-morphs toward [data-js="gl-hero-end"] (inside WhatIsEdith)
// and fades out. The landing marker below sets where that morph completes.
export default function Home() {
  return (
    <main id="main">
      <QuickMenuSlot />
      <GlCanvas page="index" />
      <div data-js="gl-hero-bg-desktop">
        <Hero />
        <div data-js="gl-uniswap-landing" aria-hidden="true" />
        <WhatIsEdith />
        <Hubs />
        <Loop />
      </div>
      <Membership />
      <ShowOff />
      <Franchise />
      <Decisions />
      <Safety />
      <Beliefs />
      <Faq />
      <Footer />
    </main>
  );
}
