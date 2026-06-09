import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoB from "@/assets/logo-B.png";

const links = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

const sectionLabel: Record<string, string> = {
  "#work": "Work",
  "#about": "About",
  "#services": "Services",
  "#process": "Process",
  "#pricing": "Pricing",
  "#contact": "Contact",
};

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = links.map(l => document.querySelector(l.href));
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(`#${e.target.id}`); }),
      { rootMargin: "-35% 0px -55% 0px" }
    );
    sections.forEach(s => s && obs.observe(s));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const currentLabel = sectionLabel[activeSection] ?? "";
  const isDark = activeSection === "#contact";

  return (
    <>
      <motion.header
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className={`fixed inset-x-0 top-0 z-50 px-5 transition-all duration-500 sm:px-8 ${
          scrolled ? "pt-2 sm:pt-3" : "pt-5 sm:pt-6"
        } ${isDark ? "dark" : ""}`}
      >
        <div
          className={`liquid-glass mx-auto flex items-center justify-between rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            scrolled
              ? "max-w-[680px] px-4 py-2 sm:px-5 sm:py-2.5 shadow-[0_8px_32px_oklch(0.18_0.005_250/0.12)]"
              : "max-w-[1400px] px-5 py-3 sm:px-7 sm:py-3.5"
          }`}
        >
          {/* Logo */}
          <a href="#top" className="group flex items-center gap-2.5 flex-none">
            <span
              className="flex h-7 w-7 flex-none items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{ borderRadius: "50%", clipPath: "circle(50%)", background: "#0a0a0a" }}
            >
              <img src={logoB} alt="Logo" className="h-full w-full object-cover" style={{ borderRadius: "50%" }} />
            </span>
          </a>

          {/* Centre — nav links when expanded, section name when compact */}
          <div className="flex flex-1 items-center justify-center">
            <AnimatePresence mode="wait">
              {scrolled ? (
                /* Compact: show current section name */
                <motion.span
                  key={currentLabel || "home"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="text-[15px] font-medium tracking-tight text-foreground/80"
                >
                  {currentLabel || "Edith Studio"}
                </motion.span>
              ) : (
                /* Expanded: full nav links */
                <motion.nav
                  key="nav"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="hidden items-center gap-0.5 md:flex"
                >
                  {links.map(l => (
                    <a
                      key={l.href}
                      href={l.href}
                      className="relative rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-tight text-foreground/55 transition-colors duration-200 hover:text-foreground sm:px-4"
                    >
                      {l.label}
                      {activeSection === l.href && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute inset-x-2 -bottom-0.5 h-[1.5px] rounded-full bg-foreground/40"
                          transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.8 }}
                        />
                      )}
                    </a>
                  ))}
                </motion.nav>
              )}
            </AnimatePresence>
          </div>

          {/* Right — CTA + hamburger */}
          <div className="flex flex-none items-center gap-3">
            <a
              href="#contact"
              data-magnet
              className="group hidden items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[12px] font-medium tracking-tight text-background transition-all duration-300 hover:scale-[1.03] sm:inline-flex sm:px-5 sm:py-2.5 sm:text-[13px]"
            >
              Book a call
            </a>

            <button
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
              className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-full md:hidden"
            >
              <motion.span animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="block h-px w-5 bg-foreground origin-center" />
              <motion.span animate={mobileOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }} transition={{ duration: 0.2 }} className="block h-px w-5 bg-foreground" />
              <motion.span animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="block h-px w-5 bg-foreground origin-center" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-center bg-background/95 px-8 backdrop-blur-2xl"
          >
            <nav className="flex flex-col gap-2">
              {links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-foreground/8 py-4 font-display text-display-md text-foreground/75 transition-colors hover:text-foreground"
                >
                  {l.label}
                </motion.a>
              ))}
            </nav>
            <motion.a
              href="mailto:hello@kevinandrew.studio"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-12 inline-flex items-center gap-2 text-sm text-foreground/35"
            >
              hello@kevinandrew.studio
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
