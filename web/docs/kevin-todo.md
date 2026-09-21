# Kevin's checklist: only you can do these

This is the single list of everything that needs **you**: your accounts, your decisions, your files, your legal and community
calls. I keep it up to date at the end of every working session (I add tasks the moment my work creates one, tick things when
you tell me they are done, and move finished items to the log at the bottom). Work through it in your free time, in any order
that suits you, and tell me when something is done or when you have decided. Everything else is mine.

This file lives in a public repository, so it must never contain a password, token or secret. Put secrets only in Vercel and
GitHub settings.

**Last updated:** 21 September 2026 (late night)

Legend: `[ ]` to do, `[~]` started, `[x]` done. Time is a rough guess for you, not for me.

## Start here (the three that unlock the most)

1. ~~Decide B1 and B2~~ **Done (21 Sep):** GitHub required, and minimum account ages on (Discord 7 days, GitHub 30 days).
2. **Set up the join flow, A1 to A7** (about 60 to 90 minutes, once). Fastest route: paste Prompt 1 (then Prompt 2) from `docs/claude-code-setup-prompts.md` into your Claude Code terminal. Manual steps are in `docs/onboarding-setup.md`; this list is the short version.
3. **Build the share image in Affinity (C1)** (about 40 minutes). It is what every pasted link shows.

---

## A. Turn on the Catalyst join flow (needs your accounts)

Built, tested against fakes, deployed and switched off. It cannot be tried on the real services without you. Full steps and
troubleshooting: `docs/onboarding-setup.md`. You need two spare Discord accounts and two spare GitHub accounts for the tests.

**Shortcut:** `docs/claude-code-setup-prompts.md` has two ready-to-paste prompts for a Claude Code session that can use your browser.
Prompt 1 does A1 and A2 (Discord server, application and bot). Prompt 2 (optional) does A3 to A6. Both stop before switching anything
on, keep secrets in a folder outside the repository, and finish with a report you can paste to me. Tick the items below once the
report looks right; the manual steps stay listed as the fallback.

- [ ] **A1. Discord server (10 min).** Turn on Developer Mode. Create roles **Pending** (no permissions) and optionally **Form reminded**; make sure **Catalyst** exists. Create a **private channel** for the mediators (for example `#catalyst-forms`) and optionally a public `#welcome`. Copy every role id, channel id and the server id.
- [ ] **A2. Discord application and bot (15 min).** developer portal: new application "edith", copy the Application ID and Client Secret, add redirect `https://edith-plum.vercel.app/api/join/callback`, create the bot and copy its token, switch on **Server Members Intent**, invite the bot (Manage Roles, Kick Members, View Channels, Send Messages, Embed Links), and drag the bot's role **above** Catalyst and Pending.
- [ ] **A3. GitHub OAuth app (5 min).** GitHub, Developer settings, OAuth Apps, new app "edith" (ideally under the edith organisation), callback `https://edith-plum.vercel.app/api/join/github/callback`. Copy the Client ID and a new Client Secret. Change nothing else.
- [ ] **A4. Database (5 min).** Vercel project, Storage, add **Upstash for Redis** (free plan), connect it to the project.
- [ ] **A5. Vercel settings (10 min).** Add every variable listed in `web/.env.example`, including `NEXT_PUBLIC_JOIN_MIN_DISCORD_DAYS=7` and `NEXT_PUBLIC_JOIN_MIN_GITHUB_DAYS=30` (already decided). Generate three random strings for `JOIN_SIGNING_SECRET`, `CRON_SECRET`, `JOIN_ID_SECRET`. **Save a copy of `JOIN_ID_SECRET` somewhere private and never change it** once people have joined. Leave `ONBOARDING_DRY_RUN=true`, `ONBOARDING_START` empty, `NEXT_PUBLIC_JOIN_LIVE=false`. Redeploy.
- [ ] **A6. GitHub repository secrets (3 min).** `SWEEP_URL` = `https://edith-plum.vercel.app/api/join/sweep` and `CRON_SECRET` (same value as on Vercel).
- [ ] **A7. Test (20 min).** Dry run with curl; then the two account test, the one entry test and the removal test from the guide (step 8). If anything errors, paste me the message and I will fix it.
- [ ] **A8. Go live.** Set `ONBOARDING_START` to the moment you choose, `ONBOARDING_DRY_RUN=false`, `NEXT_PUBLIC_JOIN_LIVE=true`, redeploy, and paste the welcome text (guide step 1.5) into your Discord rules. Do this only after A7 passes and after B1, B2 and E1 are settled.

## B. Decisions only you can make

Tell me your choice in one line each. My recommendation is first.

- [x] **B1. Must every new member have a GitHub account?** **Decided 21 Sep: yes.** Core gives the Catalyst role by hand to designers or hardware people who have no GitHub; the system never touches anyone who already has that role. (The alternative, `JOIN_REQUIRE_GITHUB=false`, would drop the ownership check and let one person use several Discord accounts.)
- [x] **B2. Minimum account ages?** **Decided 21 Sep: on, Discord 7 days and GitHub 30 days** (you said to have both; the numbers are my choice, change them any time in one setting). A person under the limit sees the exact date they become eligible, and the 24 hours still run, so a genuine newcomer is removed and can rejoin later, or Core can grant the role by hand as an exception.
- [ ] **B3. Colour direction.** You said you would tell me. It decides the rainbow chrome look of the Membership and Decisions objects, the brown Safety seal and the brown side-rail text. *Recommendation: cream text with gold as the one accent, dark glass objects like the Hubs stack, magenta and orange only inside glows.*
- [ ] **B4. The section before the footer** (Beliefs, currently the same layer stack as Hubs). You said you have plans. What should it show?
- [ ] **B5. Command palette (Cmd+K).** Add it or not? It is the strongest developer signal, but a feature rather than a tweak.
- [ ] **B6. Wording.** Keep "autonomous, decentralised organisation" in the footer and Beliefs? It is close to the DAO language you asked me to avoid. *Recommendation: change it to plain words such as "a community that runs itself".*
- [ ] **B7. Positioning.** Community first with client work as one outlet for Maintainers, or the studio first? And is the coin and seal look (Membership object, Safety seal) meant to stay? These decide what the first ten seconds should feel like.
- [ ] **B8. Data retention.** The privacy text says form answers and the one-way codes are kept while someone is a member and deleted when they ask. Happy with that?
- [ ] **B9. Public listing.** For now Core adds people who ticked the box to `web/lib/legion.ts` by hand. Do you want me to automate it later (needs a small extra database and a review step)?

## C. Files only you can make (Affinity, about 90 minutes)

Specs, sizes and colours are in `docs/affinity-brief.md`; the starting files are in `web/assets-in/reference/`. Drop finished files in `web/assets-in/` and tell me; I wire each in. Nothing is blocked while you work: the site already has stand-ins.

- [ ] **C1. Share image** (about 40 minutes): `opengraph-image.jpg`, 2400 by 1260.
- [ ] **C2. Logo pack** (about 20 minutes, only if the final logo is ready): wordmark SVG and PNG, square mark.
- [ ] **C3. Six hub glyphs** (about 30 minutes): ideas, build, team-up, help, feedback, show-off, as SVG. I then re-render the layer stack and the Beliefs sequence.
- [ ] **C4. Optional: Discord server icon and banner** in the same style, so the community looks like the site.

## D. Links and accounts

- [ ] **D1. X (Twitter) URL**, if you have one, so the icon can appear.
- [ ] **D2. Check Instagram and LinkedIn.** The links in the site (`edith_.studio`, `edith-studio`) came from the old repository. Confirm they are yours and current.
- [ ] **D3. Check the Calendly page** (`calendly.com/hello-edithstudio/30min`): hours, the meeting title, and a reminder email that sounds like edith.
- [ ] **D4. Check `hello.edithstudio@gmail.com`** is monitored: the privacy policy, terms and footer send people there.
- [ ] **D6. Connect `D:\page_content` to GitHub (2 minutes, optional).** VS Code's Source Control panel is now at zero changes and matches GitHub, but the folder has no link to it, so Sync and Push in that panel have nowhere to go. In the VS Code terminal (Ctrl+backtick) run `git remote add origin https://github.com/helloedithstudio/Site-Main.git` and then `git branch --set-upstream-to=origin/main main`. Until then, please do not press Commit in that panel: leave commits to me (I push through a separate copy and then bring this folder back in step). My safety layer blocked me from changing the remote myself, so this one is yours.
- [ ] **D5. Custom domain, if you ever add one.** Then change three things together: `NEXT_PUBLIC_SITE_URL`, the Discord redirect and the GitHub callback. Tell me and I will check the rest.

## E. Legal and business

- [ ] **E1. Lawyer review.** The rules, terms of use, privacy policy, Working with edith and Operating under edith are drafts, and the site says so. They now also cover the join flow, the one entry rule and the one-way codes. A lawyer familiar with India's Digital Personal Data Protection Act should read them before the join flow goes live.
- [ ] **E2. Legal entity details** (name, registration, address) so I can replace the placeholder sentence in the terms and privacy policy.
- [ ] **E3. Maintainer licence and client terms.** Confirm you are happy with what Maintainers may do under the edith name and how liability is split.

## F. Community operations (Discord)

- [ ] **F1. Name the Core members** (the mediators) and tell me who should be listed publicly, if anyone.
- [ ] **F6. Exceptions.** Agree who handles them, and what counts: a genuine person with a very new account (age rule) or with no GitHub account. The fix is always the same: a Core member gives them the Catalyst role by hand.
- [ ] **F2. Moderators.** Who they are, who can kick, and who answers appeals (the rules say a Core member does).
- [ ] **F3. The `apply-here` process.** Confirm the steps (30 days around, two endorsements, Core approval) are what you will actually run.
- [ ] **F4. Demo Day.** Pick the first date, or tell me it is still open.
- [ ] **F5. First projects and RFCs.** When something ships or an RFC opens, tell me and I will list it.

## G. Reminders for later

- [ ] **G1.** After the join flow is live for a week, run the dry run and read `missed` to see if anyone slipped through.
- [ ] **G2.** GitHub pauses scheduled jobs after 60 days without repository activity. If the join job stops, push any small change or run it once by hand from the Actions tab.
- [ ] **G3.** If you change the number of hours, tell me so I can update the site text. (The account age numbers update the site text by themselves.)
- [ ] **G4.** A few weeks after going live, check whether the 30 day GitHub rule is turning away genuine students (ask Core how many exceptions they granted). If it is, lower it.

---

## What I am doing, and what is waiting on you

| Waiting on you | I will do as soon as you finish it |
| --- | --- |
| A1 to A7 | Fix anything that breaks against the real Discord, GitHub and database; then help you go live (A8) |
| B3 colour | Re-render the Membership and Decisions objects, restyle the Safety seal and the side rail |
| B4 section plan | Build the section before the footer |
| B5 | Add the Cmd+K palette |
| C1 to C3 | Wire each file in and re-render where needed |
| D1 | Add the X icon |
| E2 | Replace the placeholder in the legal text |

Nothing else is queued on my side.

## Log of what is done (newest first)

- 21 Sep 2026: Wrote two ready-to-paste Claude Code prompts for the Discord side (A1, A2) and the GitHub, database, Vercel and scheduler side (A3 to A6), in `docs/claude-code-setup-prompts.md`. Both keep everything switched off, keep secrets outside the repository, and end with a report.

- 21 Sep 2026: Decided B1 (GitHub required) and B2 (minimum ages 7 and 30 days). Built the age rule: the too-new page shows the exact eligible date and how to ask for an exception, and the public rules state the same numbers automatically. 33 browser checks pass with it on.
- 21 Sep 2026: Catalyst join flow built: Discord then GitHub sign-in, private form, 24 hour deadline, automatic removal, one person one entry, reserved names, optional account ages, release command. Tested against fakes (39 unit and 29 browser checks). Deployed switched off.
- 21 Sep 2026: Core defined as the mediators (FAQ, roles, home, Legion page). FAQ line about the booked meeting corrected.
- 21 Sep 2026: Apple product site study (36 pages) and the changes from it: type ladder, motion tokens, 28 px panels; Beliefs rebuilt as a Blender sequence; share image on every page; JetBrains Mono; hover wipes with the marble gradient; copy links on Docs headings.
- 21 Sep 2026: Handbook renamed Docs; Catalysts renamed The Legion with Maintainers and Catalysts together; navbar lists pages only; Calendly booking link added.
- 21 Sep 2026: Maintainer cards show GitHub avatar, name, and icon links; Discord handle shown for the Origin.
- 21 Sep 2026: Scrollbars hidden everywhere.
- 20 to 21 Sep 2026: Pitch black page, worked example cards in How an idea becomes a launch, story-style Hubs, redesigned Shipped by members and Studio, Apple style footer, Vercel deployment and speed work.
