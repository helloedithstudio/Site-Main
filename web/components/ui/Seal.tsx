// Typographic seal used by the Safety section (replaces the original engraved PNG seal). It is drawn
// in currentColor so it takes the section's brown, and it dissolves in through the same NoiseMask.

export default function Seal({ className }: { className?: string }) {
  const font = { fontFamily: '"Funnel Display", sans-serif' } as const;
  const mono = { fontFamily: '"Roboto Mono", monospace' } as const;
  return (
    <svg
      className={`absolute inset-0 size-full${className ? ` ${className}` : ""}`}
      viewBox="0 0 240 290"
      fill="none"
      role="img"
      aria-label="edith: moderated and scam-free"
    >
      <defs>
        <path id="seal-top" d="M 20 145 A 100 125 0 0 1 220 145" />
        <path id="seal-bottom" d="M 20 145 A 100 125 0 0 0 220 145" />
      </defs>
      <ellipse cx="120" cy="145" rx="118" ry="143" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="120" cy="145" rx="76" ry="96" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <text fill="currentColor" style={font} fontSize="21" fontWeight="500" letterSpacing="2">
        <textPath href="#seal-top" startOffset="50%" textAnchor="middle">
          MODERATED &amp; SCAM-FREE
        </textPath>
      </text>
      <text fill="currentColor" style={font} fontSize="15" fontWeight="500" letterSpacing="1.5" dominantBaseline="hanging">
        <textPath href="#seal-bottom" startOffset="50%" textAnchor="middle">
          NO DMS FOR KEYS OR PAYMENTS
        </textPath>
      </text>
      <text x="120" y="100" textAnchor="middle" fill="currentColor" style={mono} fontSize="7.5" letterSpacing="1.2">
        A CLUB OF BUILDERS
      </text>
      <text x="120" y="158" textAnchor="middle" fill="currentColor" style={font} fontSize="50" fontWeight="300">
        edith
      </text>
      <text x="120" y="188" textAnchor="middle" fill="currentColor" style={mono} fontSize="7.5" letterSpacing="1.2">
        THAT RUNS ITSELF
      </text>
      <text x="120" y="204" textAnchor="middle" fill="currentColor" style={mono} fontSize="6.5" letterSpacing="1.2" opacity="0.7">
        ESTD 2026
      </text>
    </svg>
  );
}
