// The picture on each "How an idea becomes a launch" card: not a decoration but the thing itself, a small product-style
// panel showing what a good post at that step contains. The panels are worked examples (each says so), not real
// members or numbers. Cream panel, black pill button: the same look as Apple's sheets on a black page.

import type { ReactNode } from "react";

function Chip({ children }: { children: ReactNode }) {
  return <span className="edith-ui__chip">{children}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="edith-ui__field">
      <span className="edith-ui__label">{label}</span>
      <div className="edith-ui__value">{children}</div>
    </div>
  );
}

function Cta({ children }: { children: ReactNode }) {
  return (
    <div className="edith-ui__cta" aria-hidden="true">
      <span>{children}</span>
      <i aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </i>
    </div>
  );
}

function Check({ done, children }: { done?: boolean; children: ReactNode }) {
  return (
    <li className={`edith-ui__step${done ? " is-done" : ""}`}>
      <i aria-hidden="true">
        {done ? (
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        ) : null}
      </i>
      <span>{children}</span>
    </li>
  );
}

const PANELS: { channel: string; tag: string; body: ReactNode; cta: string }[] = [
  {
    channel: "brainstorm",
    tag: "Example post",
    body: (
      <>
        <Field label="What are you building?">A tool that turns TODO comments into tickets</Field>
        <Field label="Who is it for?">Developers with too many side projects</Field>
        <Field label="What do you need?">
          <span className="edith-ui__chips">
            <Chip>Designer</Chip>
            <Chip>Backend help</Chip>
          </span>
        </Field>
      </>
    ),
    cta: "Post to brainstorm",
  },
  {
    channel: "find-a-team",
    tag: "Example post",
    body: (
      <>
        <Field label="Looking for">
          <span className="edith-ui__chips">
            <Chip>Frontend</Chip>
            <Chip>Designer</Chip>
            <Chip>ML</Chip>
          </span>
        </Field>
        <Field label="Your stack">
          <span className="edith-ui__chips">
            <Chip>Next.js</Chip>
            <Chip>Python</Chip>
          </span>
        </Field>
        <Field label="Time you can give">Evenings and weekends</Field>
      </>
    ),
    cta: "Ask to join",
  },
  {
    channel: "wip",
    tag: "Example update",
    body: (
      <>
        <ul className="edith-ui__steps">
          <Check done>Idea posted</Check>
          <Check done>First prototype running</Check>
          <Check>Demo recorded</Check>
        </ul>
        <div className="edith-ui__bar" aria-hidden="true">
          <i style={{ width: "66%" }} />
        </div>
        <Field label="This week">Cut the setup from four steps to one</Field>
      </>
    ),
    cta: "Share an update",
  },
  {
    channel: "rubber-duck",
    tag: "Example thread",
    body: (
      <>
        <Field label="The problem">Requests time out after the second call</Field>
        <Field label="What I tried">Retries and a longer timeout</Field>
        <code className="edith-ui__code">Error: ETIMEDOUT after 30000 ms</code>
        <span className="edith-ui__solved">Marked solved</span>
      </>
    ),
    cta: "Ask for help",
  },
  {
    channel: "ship-it",
    tag: "Example post",
    body: (
      <ul className="edith-ui__steps">
        <Check done>A working demo</Check>
        <Check done>A short write up</Check>
        <Check done>Credit for the people who helped</Check>
        <Check>What you would do next</Check>
      </ul>
    ),
    cta: "Post to ship-it",
  },
  {
    channel: "launch",
    tag: "Example path",
    body: (
      <ul className="edith-ui__steps">
        <Check done>Shipped in ship-it</Check>
        <Check done>You are a Maintainer</Check>
        <Check>The founder approves it</Check>
        <Check>Runs under the edith name</Check>
      </ul>
    ),
    cta: "Ask for approval",
  },
];

export default function LoopCard({ index }: { index: number }) {
  const p = PANELS[index];
  if (!p) return null;
  return (
    <div className="edith-ui" role="group" aria-label={`${p.tag}: ${p.channel === "launch" ? "launch under edith" : p.channel}`}>
      <div className="edith-ui__top">
        <span className="edith-ui__pill">
          {p.channel === "launch" ? "Launch under edith" : `# ${p.channel}`}
        </span>
        <span className="edith-ui__eg">{p.tag}</span>
      </div>
      <div className="edith-ui__body">{p.body}</div>
      <Cta>{p.cta}</Cta>
    </div>
  );
}
