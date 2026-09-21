// Shows what the public pages say about the Catalyst form with the go-live switch off and on.
//   npx tsx scripts/join-copy-check.ts            (switch off)
//   NEXT_PUBLIC_JOIN_LIVE=true npx tsx scripts/join-copy-check.ts   (switch on)
import { faq, rules, terms, privacy } from "../lib/docs";
import { home } from "../lib/content";
import { legionPage } from "../lib/legion";
import { JOIN_LIVE } from "../lib/join/constants";

const all = JSON.stringify({ faq, rules, terms, privacy, home, legionPage });
const mentions = (re: RegExp) => (all.match(re) ?? []).length;
console.log("go-live switch:", JOIN_LIVE ? "ON" : "off");
console.log("FAQ 'What happens when I join?':", faq.items.some((i) => i.q === "What happens when I join?"));
console.log("Rules clause 'Finish your Catalyst form':", rules.clauses.some((c) => c.title === "Finish your Catalyst form"));
console.log("Privacy clause 'The Catalyst form':", privacy.clauses.some((c) => c.title === "The Catalyst form"));
console.log("Terms mention automatic removal:", terms.clauses.some((c) => c.body.some((b) => /removed from the server automatically/.test(b))));
console.log("Home Membership mentions the form:", /short form to complete/.test(home.membership.texts.text));
console.log("Legion opt-in text:", legionPage.optIn.slice(0, 70) + "...");
console.log("Mentions of '24 hours' in public copy:", mentions(/24 hours/g));
