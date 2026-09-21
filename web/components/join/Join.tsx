"use client";

// The Catalyst form (/join). New members are sent here from Discord, sign in with Discord (identify only), and fill in a
// short form within 24 hours of joining. The signed form token arrives in the address fragment (#t=...), is read once and
// removed from the address bar, and is only ever sent to our own /api/join/submit. Nothing is stored in this browser.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { brand } from "@/lib/brand";
import { legionInterests } from "@/lib/legion";
import { JOIN_HOURS } from "@/lib/join/constants";
import Footer from "../Footer";

type Claims = { u: string; n: string; d: string; j: string; e: number; gh?: { i: string; l: string; n: string; c: string } };
type Status = "unavailable" | "not-member" | "done" | "expired" | "cancelled" | "error" | "account-young" | "github-young" | "github-type" | "github-taken" | "discord-linked";

const HOUR = 3_600_000;

function decode(token: string): Claims | null {
  try {
    const body = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(body.padEnd(Math.ceil(body.length / 4) * 4, "="))
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    const c = JSON.parse(json) as Claims;
    return typeof c.u === "string" && typeof c.e === "number" ? c : null;
  } catch {
    return null;
  }
}

const left = (ms: number) => {
  if (ms <= 0) return "time is up";
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m left` : `${m}m left`;
};

type Note = { days?: number; until?: number };
const dateOf = (ms?: number) => (ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
/** The "too new" pages say exactly when the account becomes old enough, and what happens to the 24 hours meanwhile. */
const tooNew = (what: string) => (n: Note) =>
  `To keep the community free of fake accounts, a ${what} account must be at least ${n.days ?? "a few"} days old. ${n.until ? `Yours will be old enough on ${dateOf(n.until)}. ` : ""}` +
  `If the ${JOIN_HOURS} hours run out before then, you are removed from the server automatically, and you are welcome to join again once the account is old enough. If you are a real person who needs an exception, ask a Core member in the Discord.`;

const MESSAGES: Record<Status, { title: string; text: string | ((n: Note) => string); action: "discord" | "start" | "none" }> = {
  unavailable: { title: "The form is not switched on yet", text: "New members will get a message on Discord with a link here as soon as it is. Nothing is needed from you right now.", action: "discord" },
  "not-member": { title: "Join the Discord first", text: "We could not find you in the server. Join with the link below, then come back here to complete your form.", action: "discord" },
  done: { title: "You are already a Catalyst", text: "Your form is complete. Nothing more to do here.", action: "discord" },
  expired: { title: "That sign-in has expired", text: "Start again and it will take a moment.", action: "start" },
  cancelled: { title: "Sign-in cancelled", text: "You need to sign in with Discord so we know which member you are. We only read your username.", action: "start" },
  error: { title: "Something went wrong", text: "Discord or GitHub did not answer as expected. Please try again in a minute.", action: "start" },
  "account-young": { title: "Your Discord account is too new", text: tooNew("Discord"), action: "none" },
  "github-young": { title: "Your GitHub account is too new", text: tooNew("GitHub"), action: "none" },
  "github-type": { title: "That is not a personal GitHub account", text: "It looks like an organisation or a bot. Sign in with your own personal GitHub account.", action: "start" },
  "github-taken": { title: "That GitHub account is already used", text: "It is linked to another member, and each person has one entry. If that was you on another Discord account, ask a Core member for help. If someone else is using your GitHub account, please tell us.", action: "none" },
  "discord-linked": { title: "This Discord account is linked to another GitHub account", text: "Sign in with the GitHub account you used before, or ask a Core member in the Discord for help.", action: "start" },
};

export default function Join() {
  const [phase, setPhase] = useState<"loading" | "start" | "form" | "success" | Status>("loading");
  const [token, setToken] = useState("");
  const [claims, setClaims] = useState<Claims | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const [note, setNote] = useState<Note>({});
  const [form, setForm] = useState({ name: "", github: "", interests: [] as string[], portfolio: "", about: "", rulesAck: false, listPublicly: false, website: "" });

  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get("t");
    const query = new URLSearchParams(window.location.search);
    const status = query.get("status") as Status | null;
    const days = Number(query.get("days"));
    const until = Number(query.get("until"));
    if (days > 0 || until > 0) setNote({ days: days > 0 ? days : undefined, until: until > 0 ? until : undefined });
    if (t) {
      const c = decode(t);
      if (c && c.e > Date.now()) {
        setToken(t);
        setClaims(c);
        setForm((f) => ({ ...f, name: c.d || c.gh?.n || c.n }));
        setPhase("form");
        // The token is read once; take it out of the address bar and history.
        window.history.replaceState(null, "", "/join");
        return;
      }
      setPhase("expired");
      return;
    }
    setPhase(status && status in MESSAGES ? status : "start");
  }, []);

  useEffect(() => {
    if (phase !== "form") return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [phase]);

  const deadline = useMemo(() => (claims ? Date.parse(claims.j) + JOIN_HOURS * HOUR : 0), [claims]);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (i: string) => set("interests", form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setBanner("");
    try {
      const res = await fetch("/api/join/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, fields: form }) });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; errors?: Record<string, string>; message?: string; state?: string };
      if (res.ok && j.ok) {
        setPhase(j.state === "done" && j.message ? "done" : "success");
      } else if (res.status === 422 && j.errors) {
        setErrors(j.errors);
        setBanner("Please fix the highlighted fields.");
        document.getElementById(`join-${Object.keys(j.errors)[0]}`)?.focus();
      } else if (j.state === "expired") {
        setPhase("expired");
      } else {
        setBanner(j.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setBanner("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p className="join-err" id={`join-${k}-err`} role="alert">
        {errors[k]}
      </p>
    ) : null;
  const info = phase in MESSAGES ? MESSAGES[phase as Status] : null;

  return (
    <main id="main" className="hb-main">
      <div className="hb-bg" aria-hidden="true" />
      <header className="hb-hero site-max px-20 s:px-0">
        <p className="type-caption uppercase text-gold">Catalyst form</p>
        <h1 className="type-display-xl edith-hero-title">
          Finish
          <br />
          joining
        </h1>
        <p className="type-body-lg text-white hb-lead">
          A two minute form. Complete it within {JOIN_HOURS} hours of joining the Discord to stay in the community.
        </p>
      </header>

      <section className="join site-max px-20 s:px-0" aria-live="polite">
        {phase === "loading" ? <div className="join-card" aria-busy="true" /> : null}

        {phase === "start" ? (
          <div className="join-card">
            <h2 className="type-h3">Sign in with Discord</h2>
            <p className="type-body-md text-white">
              You sign in twice: with Discord, so we know which member you are, and with GitHub, to confirm the GitHub account is yours. We read only your
              public profile from each, never your email or your code. Then you fill in a short form. Your answers go privately to the edith mediators.
            </p>
            <a className="join-btn" href="/api/join/start">
              Continue with Discord
            </a>
            <p className="type-caption edith-muted">
              Not in the server yet?{" "}
              <a className="join-link" href={brand.discord} target="_blank" rel="noopener noreferrer">
                Join the Discord first
              </a>
              .
            </p>
          </div>
        ) : null}

        {info ? (
          <div className="join-card">
            <h2 className="type-h3">{info.title}</h2>
            <p className="type-body-md text-white">{typeof info.text === "function" ? info.text(note) : info.text}</p>
            {info.action === "start" ? (
              <a className="join-btn" href="/api/join/start">
                Start again
              </a>
            ) : null}
            {info.action === "discord" ? (
              <a className="join-btn" href={brand.discord} target="_blank" rel="noopener noreferrer">
                {brand.cta}
              </a>
            ) : null}
          </div>
        ) : null}

        {phase === "success" ? (
          <div className="join-card">
            <h2 className="type-h3">You are a Catalyst</h2>
            <p className="type-body-md text-white">
              Thank you{form.name ? `, ${form.name}` : ""}. Your form is complete and you now have full access to the community.
              {form.listPublicly ? " The mediators will add you to the Legion page soon." : ""}
            </p>
            <a className="join-btn" href={brand.discord} target="_blank" rel="noopener noreferrer">
              Back to Discord
            </a>
          </div>
        ) : null}

        {phase === "form" && claims ? (
          <form className="join-card" onSubmit={submit} noValidate>
            <div className="join-meta">
              <span className="type-caption edith-muted">Signed in as {claims.n}</span>
              <span className={`join-clock${deadline - now <= 0 ? " is-late" : ""}`}>{left(deadline - now)}</span>
            </div>
            {banner ? (
              <p className="join-banner" role="alert">
                {banner}
              </p>
            ) : null}

            <div className="join-field">
              <label htmlFor="join-name">What should we call you?</label>
              <input id="join-name" value={form.name} maxLength={60} autoComplete="name" onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "join-name-err" : undefined} />
              {err("name")}
            </div>

            {claims.gh ? (
              <div className="join-field">
                <span className="join-label">GitHub account</span>
                <p className="join-verified">
                  <span>@{claims.gh.l}</span>
                  <em>verified</em>
                </p>
              </div>
            ) : (
              <div className="join-field">
                <label htmlFor="join-github">GitHub username</label>
                <input id="join-github" value={form.github} maxLength={120} placeholder="octocat" autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => set("github", e.target.value)} aria-invalid={!!errors.github} aria-describedby={errors.github ? "join-github-err" : undefined} />
                {err("github")}
              </div>
            )}

            <fieldset className="join-field" id="join-interests" tabIndex={-1}>
              <legend>What do you build? Pick at least one.</legend>
              <div className="join-chips">
                {legionInterests.map((i) => (
                  <button key={i} type="button" className="join-chip" aria-pressed={form.interests.includes(i)} onClick={() => toggle(i)}>
                    {i}
                  </button>
                ))}
              </div>
              {err("interests")}
            </fieldset>

            <div className="join-field">
              <label htmlFor="join-portfolio">
                Portfolio or website <span className="edith-muted">(optional)</span>
              </label>
              <input id="join-portfolio" value={form.portfolio} maxLength={300} placeholder="https://" inputMode="url" autoCapitalize="none" spellCheck={false} onChange={(e) => set("portfolio", e.target.value)} aria-invalid={!!errors.portfolio} aria-describedby={errors.portfolio ? "join-portfolio-err" : undefined} />
              {err("portfolio")}
            </div>

            <div className="join-field">
              <label htmlFor="join-about">
                What are you building? <span className="edith-muted">(optional, one line)</span>
              </label>
              <input id="join-about" value={form.about} maxLength={160} onChange={(e) => set("about", e.target.value)} />
              <p className="type-caption edith-muted">{form.about.length}/160</p>
            </div>

            {/* A trap for bots: people never see or fill this. */}
            <div className="join-trap" aria-hidden="true">
              <label htmlFor="join-website">Website</label>
              <input id="join-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>

            <div className="join-field join-check">
              <label>
                <input type="checkbox" id="join-rulesAck" checked={form.rulesAck} onChange={(e) => set("rulesAck", e.target.checked)} aria-invalid={!!errors.rulesAck} />
                <span>
                  I have read the{" "}
                  <a className="join-link" href="/docs#rules" target="_blank" rel="noopener noreferrer">
                    community rules
                  </a>
                  .
                </span>
              </label>
              {err("rulesAck")}
            </div>

            <div className="join-field join-check">
              <label>
                <input type="checkbox" id="join-listPublicly" checked={form.listPublicly} onChange={(e) => set("listPublicly", e.target.checked)} />
                <span>
                  Show me on the public Legion page.{" "}
                  <span className="edith-muted">Optional. Shows your name, GitHub, areas and website. Leave it unticked to stay private, and ask any time to be taken off.</span>
                </span>
              </label>
            </div>

            <button type="submit" className="join-btn" disabled={busy}>
              {busy ? "Saving" : "Complete my form"}
            </button>
            <p className="type-caption edith-muted">
              Your answers go privately to the edith mediators (Core) in Discord. This website keeps only a one-way code of your Discord and GitHub accounts, so nobody can join twice. See the{" "}
              <a className="join-link" href="/docs#privacy" target="_blank" rel="noopener noreferrer">
                privacy policy
              </a>
              .
            </p>
          </form>
        ) : null}
      </section>
      <Footer />
    </main>
  );
}
