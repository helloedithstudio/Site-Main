import { motion } from "framer-motion";

export function Contact() {
  return (
    <section
      id="contact"
      className="relative isolate flex min-h-[95vh] flex-col justify-between overflow-hidden bg-[#020202] px-5 pt-32 sm:px-8"
    >
      {/* Deep ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[40%] -z-10 mx-auto h-[60vh] max-w-[1000px] -translate-y-1/2"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.035), transparent 60%)" }}
      />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col">
        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-10 text-[10px] uppercase tracking-[0.3em] text-white/40 sm:mb-14"
          >
            ⌘ — Contact
          </motion.p>

          <motion.h2
            className="font-display text-white"
            style={{ fontSize: "clamp(3.5rem, 10vw, 11rem)", lineHeight: 0.9, letterSpacing: "-0.04em" }}
          >
            <motion.span
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block"
            >
              Let&rsquo;s build
            </motion.span>
            <br />
            <motion.span
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block font-serif-display italic text-white/70"
            >
              something.
            </motion.span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 flex flex-col items-center gap-8 sm:mt-24"
          >
            <a
              href="mailto:hello.edithstudio@gmail.com"
              data-magnet
              className="group relative inline-flex items-center gap-4 text-lg font-medium tracking-tight text-white/90 transition-colors duration-500 hover:text-white sm:text-4xl"
            >
              hello.edithstudio@gmail.com
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/20 bg-white/[0.05] text-sm text-white/60 backdrop-blur-md transition-all duration-500 group-hover:rotate-45 group-hover:border-white/40 group-hover:bg-white/[0.1] group-hover:text-white">
                ↗
              </span>
              <span className="absolute -bottom-3 left-0 h-px w-0 bg-white/50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
            </a>

            <a
              href="https://calendly.com/p1legendary7/30min"
              target="_blank"
              rel="noopener noreferrer"
              data-magnet
              className="group relative inline-flex items-center gap-3 text-[14px] font-medium tracking-tight text-white/50 transition-colors duration-500 hover:text-white/90 sm:text-[15px]"
            >
              Schedule a meeting
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14 flex flex-col items-center justify-center gap-6 text-[11px] uppercase tracking-[0.2em] text-white/40 sm:flex-row sm:gap-10"
          >
            <span className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-white/50 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/70" />
              </span>
              Available for Q3
            </span>
            <span className="hidden h-px w-4 bg-white/15 sm:block" />
            <span>Based in Chennai</span>
          </motion.div>
        </div>

        {/* Ultra-Premium Masthead Footer */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-32 grid w-full grid-cols-2 gap-y-12 border-t border-white/[0.15] pb-12 pt-12 sm:grid-cols-4 sm:gap-y-0"
        >
          {/* Col 1 */}
          <div className="flex flex-col gap-5 text-[13px]">
            <p className="font-display font-medium tracking-tight text-white/90">Edith Studio</p>
            <p className="leading-relaxed text-white/40">
              Creative Technologist
            </p>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col gap-5 text-[13px]">
            <p className="font-display font-medium tracking-tight text-white/90">Socials</p>
            <div className="flex flex-col gap-3 text-white/50">
              <a href="https://www.linkedin.com/in/kevinandrewa" target="_blank" rel="noopener noreferrer" className="w-fit transition-colors hover:text-white">LinkedIn</a>
              <a href="https://github.com/Andrew-Kevin-007" target="_blank" rel="noopener noreferrer" className="w-fit transition-colors hover:text-white">GitHub</a>
              <a href="https://www.instagram.com/edith_.studio/" target="_blank" rel="noopener noreferrer" className="w-fit transition-colors hover:text-white">Instagram</a>
            </div>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col gap-5 text-[13px]">
            <p className="font-display font-medium tracking-tight text-white/90">Location</p>
            <p className="leading-relaxed text-white/40">
              Chennai, India <br />IST (UTC +5:30)
            </p>
          </div>

          {/* Col 4 */}
          <div className="flex flex-col justify-between text-[13px] sm:items-end">
            <p className="text-white/30">&copy; {new Date().getFullYear()}</p>
            <div className="mt-8 sm:mt-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/20">All rights reserved</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
