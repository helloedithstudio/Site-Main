# Kevin's checklist: only you can do these

This is the single list of everything that needs **you**: your accounts, your decisions, your files, your legal and community
calls. I keep it up to date at the end of every working session (I add tasks the moment my work creates one, tick things when
you tell me they are done, and move finished items to the log at the bottom). Work through it in your free time, in any order
that suits you, and tell me when something is done or when you have decided. Everything else is mine.

This file lives in a public repository, so it must never contain a password, token or secret. Put secrets only in Vercel and
GitHub settings.

**Last updated:** 29 September 2026 (afternoon)

Legend: `[ ]` to do, `[~]` started, `[x]` done. Time is a rough guess for you, not for me.

## Start here (the three that unlock the most)

0. **Rotate the Discord bot token (5 min, urgent).** Exposed in a terminal transcript during setup. Discord Developer Portal, your application, Bot, Reset Token (needs your MFA). Either paste the new value into `DISCORD_BOT_TOKEN` on Vercel yourself, or give it to the same terminal session and let it do that step, since it already offered. Tell me either way is done.
1. **Confirm `DISCORD_ROLES_EXEMPT` covers all four staff roles (2 min), see A2b below.** You told the setup session to keep the bot (Friday) as Administrator, above staff in the role order. That is your call, but it means the exempt list is now the *only* thing stopping the sweep from ever kicking staff.
2. ~~Decide B1 and B2~~ **Done (21 Sep):** GitHub required, and minimum account ages on (Discord 7 days, GitHub 30 days).
3. **A7: test the join flow** (about 20 minutes). A1 to A6 are done (see below); this is what is left before going live. Two spare Discord accounts and two spare GitHub accounts, steps in `docs/onboarding-setup.md` step 8.

4. **Studio: start the Blender session (5 min, then it runs on its own).** In a new PowerShell window, follow "How to start it" in `docs/showcase/asset-session-prompt.md`, then tell that session: `Read D:\page_content\web\docs\showcase\asset-session-prompt.md and do everything in "The prompt".` Keep the laptop plugged in and awake while it renders. The page is already built and works with stand-in films; the renders replace them.
5. **Studio: approve the three lookdev stills** when the Blender session stops and asks (2 min), or say "ask the web session" and I review them.

---

## A. Turn on the Catalyst join flow (needs your accounts)

Built, tested against fakes, deployed and switched off. It cannot be tried on the real services without you. Full steps and
troubleshooting: `docs/onboarding-setup.md`. You need two spare Discord accounts and two spare GitHub accounts for the tests.

**Done 22 Sep, via the two Claude Code terminal prompts:** A1 to A6. The dry run came back clean (`"ok":true,"dryRun":true`, nothing
in `missed`), `/join` loads and shows the form. Everything stays switched off (`ONBOARDING_DRY_RUN=true`, `NEXT_PUBLIC_JOIN_LIVE=false`,
`ONBOARDING_START` unset). One thing came out of that run that needs you first: **A0 above, rotate the Discord bot token.**

- [x] **A1. Discord server.** Roles, private forms channel, ids copied.
- [x] **A2. Discord application and bot.** Renamed to Friday, reused an old unused application (confirmed with you: nothing else depended on it), redirect set, only Server Members Intent on, Public Bot off. **Token needs rotating, see A0.**
- [ ] **A2b. Confirm the exempt role list (2 min).** You kept Friday as Administrator and above Founder, Core Team, Mods and Maintainer in the role order, so Discord's own hierarchy will not stop the bot kicking staff. `DISCORD_ROLES_EXEMPT` on Vercel is the only thing that does. Check it lists all four of those role ids and tell me if any are missing.
- [x] **A3. GitHub OAuth app.** Created under your own account (confirmed with the terminal session), callback set.
- [x] **A4. Database.** Upstash for Redis connected; it landed on the `KV_REST_API_URL` / `KV_REST_API_TOKEN` pair, which the site accepts (either name works, see `lib/join/config.ts`).
- [x] **A5. Vercel settings.** All 21 variables set on Production, secrets marked non-retrievable, the four `NEXT_PUBLIC_*` ones left readable on purpose (they ship to the browser). Redeployed and Ready.
- [x] **A6. GitHub repository secrets.** `SWEEP_URL` and `CRON_SECRET` added to `helloedithstudio/Site-Main`.
- [~] **A7. Test (20 min).** Your two friends joining and getting no DM is expected, not a bug: `ONBOARDING_START` is not set, so the sweep runs every 10 minutes and does nothing (the job's own safety switch). That is also why the two account test in the guide (step 8) starts with setting `ONBOARDING_START` to now and `ONBOARDING_DRY_RUN=false` on Vercel and redeploying. Your friends are already in the server, so you can do that now and they should get the welcome DM within 10 minutes; then check the dry run, the one entry test and the removal test. When you are done testing, you may want to set `ONBOARDING_START` back to empty and `ONBOARDING_DRY_RUN=true` until you are ready for A8. If anything errors, paste me the message.
- [ ] **A8. Go live.** Set `ONBOARDING_START` to the moment you choose, `ONBOARDING_DRY_RUN=false`, `NEXT_PUBLIC_JOIN_LIVE=true`, redeploy, and paste the welcome text (guide step 1.5) into your Discord rules. Do this only after A0, A7 pass and after B1, B2 and E1 are settled.

## B. Decisions only you can make

Tell me your choice in one line each. My recommendation is first.

- [x] **B1. Must every new member have a GitHub account?** **Decided 21 Sep: yes.** Core gives the Catalyst role by hand to designers or hardware people who have no GitHub; the system never touches anyone who already has that role. (The alternative, `JOIN_REQUIRE_GITHUB=false`, would drop the ownership check and let one person use several Discord accounts.)
- [x] **B2. Minimum account ages?** **Decided 21 Sep: on, Discord 7 days and GitHub 30 days** (you said to have both; the numbers are my choice, change them any time in one setting). A person under the limit sees the exact date they become eligible, and the 24 hours still run, so a genuine newcomer is removed and can rejoin later, or Core can grant the role by hand as an exception.
- [~] **B3. Colour direction.** You said you would tell me; you have said again you will say soon. It decides the rainbow chrome look of the Membership and Decisions objects, the brown Safety seal and the brown side-rail text. *Recommendation: cream text with gold as the one accent, dark glass objects like the Hubs stack, magenta and orange only inside glows.*
- [~] **B4. The section before the footer** (Beliefs, currently the same layer stack as Hubs). You said you have plans and will send them soon.
- [ ] **B5. Command palette (Cmd+K).** Add it or not? It is the strongest developer signal, but a feature rather than a tweak.
- [x] **B6. Wording.** **Decided 22 Sep: change it.** The footer note no longer says "autonomous, decentralised organisation"; it now says "edith is a community that runs itself, for developers and technologists to connect, collaborate, build and launch ideas..." (`lib/content.ts`). The Beliefs section's "Autonomous."/"Decentralised." value names were left as they are: they are explained in plain terms right there and are not the DAO phrase.
- [ ] **B7. Positioning.** Community first with client work as one outlet for Maintainers, or the studio first? And is the coin and seal look (Membership object, Safety seal) meant to stay? These decide what the first ten seconds should feel like.
- [x] **B8. Data retention.** **Decided 22 Sep: yes, keep it as written.** Form answers and the one-way codes are kept while someone is a member and deleted when they ask.
- [x] **B9. Public listing.** **Decided 22 Sep: automate it.** Ticking "Show me on the public Legion page" now adds someone to the Legion page itself, the moment they submit. Built and wired in (see the log).
- [x] **B10. Should Friday show online in Discord?** **Left as the recommendation: no, for now.** The green dot needs a second, always-on service outside Vercel; everything Friday actually does (DMs, roles, removal) already works without it. Say the word if you still want that built.
- [x] **B11. What makes a work "top" on the Studio page?** **Decided 25 Sep:** Core picks the exhibits by hand (they are listed in `lib/showcase.ts`), and day one shows edith's own two builds plus three reserved slots.
- [ ] **B12. How does a member ask to be listed on the Studio?** My draft line says "post it in `ship-it` and say you would like it listed", and a Maintainer adds it by pull request. Tell me if the real process is different.

## C. Files only you can make (Affinity, about 90 minutes)

Specs, sizes and colours are in `docs/affinity-brief.md`; the starting files are in `web/assets-in/reference/`. Drop finished files in `web/assets-in/` and tell me; I wire each in. Nothing is blocked while you work: the site already has stand-ins.

- [x] **C1. Share image.** **Done 22 Sep**, built by a Claude Code terminal from the brief (Prompt 3), no Affinity needed. Wired into all four spots (`app/`, `app/docs/`, `app/legion/`, plus `twitter-image.jpg`), rebuilt, and checked live: each route returns 200, `image/jpeg`, exactly 1200x630.
- [ ] **C2. Logo pack** (about 20 minutes, only if the final logo is ready): wordmark SVG and PNG, square mark.
- [ ] **C3. Six hub glyphs** (about 30 minutes): ideas, build, team-up, help, feedback, show-off, as SVG. I then re-render the layer stack and the Beliefs sequence.
- [ ] **C4. Optional: Discord server icon and banner** in the same style, so the community looks like the site.

## D. Links and accounts

- [ ] **D1. X (Twitter) URL.** **22 Sep: no page yet, you will make one soon** and tell me when. The icon stays off until then.
- [x] **D2. Check Instagram and LinkedIn.** **Confirmed 22 Sep:** the links in the site (`edith_.studio`, `edith-studio`) are yours and current.
- [x] **D3. Check the Calendly page.** **Tested and confirmed 22 Sep.**
- [x] **D4. Check `hello.edithstudio@gmail.com` is monitored.** **Confirmed 22 Sep.**
- [ ] **D6. Connect `D:\page_content` to GitHub.** You confirmed this working on 22 Sep, but checking today (29 Sep) found no remote configured at all (`git remote -v` prints nothing), and two real commits (the header rework, the Showcase page) had been sitting local-only since 24 to 25 Sep, never on GitHub, until I pushed them today the manual way. If VS Code's Source Control panel still shows Sync or Push as available, something is inconsistent; if you want this actually fixed, run in the VS Code terminal: `git remote add origin https://github.com/helloedithstudio/Site-Main.git` then `git branch --set-upstream-to=origin/main main`. My safety layer still blocks me from running the first command myself.
- [ ] **D5. Custom domain, if you ever add one.** Then change three things together: `NEXT_PUBLIC_SITE_URL`, the Discord redirect and the GitHub callback. Tell me and I will check the rest.

## E. Legal and business

- [ ] **E1. Lawyer review.** The rules, terms of use, privacy policy, Working with edith and Operating under edith are drafts, and the site says so. They now also cover the join flow, the one entry rule and the one-way codes. A lawyer familiar with India's Digital Personal Data Protection Act should read them before the join flow goes live.
- [ ] **E2. Legal entity details** (name, registration, address) so I can replace the placeholder sentence in the terms and privacy policy.
- [ ] **E3. Maintainer licence and client terms.** Confirm you are happy with what Maintainers may do under the edith name and how liability is split.
- [ ] **E4. Where the marble and the button effect came from.** edith's own code comments say its shader was "extracted verbatim from the production bundle" of "the original" WebGL layer, and that its hero button is the "Button 'Base' of the original". That reads as another site's. Nobody has checked where the shader, the marble textures or the hover effect came from. Worth settling for edith itself, and before either is copied onto your portfolio (`hero-marble\IMPLEMENTATION.md` and `hero-button\IMPLEMENTATION.md`, section 6 of each).

## F. Community operations (Discord)

- [ ] **F1. Name the Core members** (the mediators) and tell me who should be listed publicly, if anyone.
- [ ] **F6. Exceptions.** Agree who handles them, and what counts: a genuine person with a very new account (age rule) or with no GitHub account. The fix is always the same: a Core member gives them the Catalyst role by hand.
- [ ] **F2. Moderators.** Who they are, who can kick, and who answers appeals (the rules say a Core member does).
- [ ] **F3. The `apply-here` process.** Confirm the steps (30 days around, two endorsements, Core approval) are what you will actually run.
- [ ] **F4. Demo Day.** Pick the first date, or tell me it is still open.
- [ ] **F5. First projects and RFCs.** When something ships or an RFC opens, tell me and I will list it.

## S. Studio page (`/studio`)

- [ ] **S1. Pitch link secret (5 min, before you send your first link).** Make one long random value: `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"` (48 characters). Put it in Vercel as `PITCH_LINK_SECRET` (Production), and replace the development value in `web/.env.local` with the same one, so links you make locally work on the live site. Then make a link: `npx tsx scripts/pitch-link.ts --from Andrew-Kevin-007 --for "Client Name" --days 60`. Changing the secret later ends every link made before.
- [ ] **S2. Draft copy (10 min).** Read the words on `/studio` (all in `lib/showcase.ts`, section `showcasePage`) and change anything that does not sound like you. The headline is "Don't take our word for it."
- [ ] **S3. Friday's welcome DM (2 min, optional).** A screenshot of the real welcome DM, if you want it shown in Exhibit 02's closer look.
- [ ] **S4. Phone check (10 min, after the renders are in).** Scroll the whole page on your phone, and open one pitch link from WhatsApp.
- [ ] **S5. Other Maintainers' booking links**, when there are other Maintainers: add `booking` to their entry in `lib/legion.ts`.
- [ ] **S6. Free space on C:** it had about 7 GB free last I checked. Aim for 20 GB or more; Windows and the render tools misbehave when C: is nearly full.

## G. Reminders for later

- [ ] **G1.** After the join flow is live for a week, run the dry run and read `missed` to see if anyone slipped through.
- [ ] **G2.** GitHub pauses scheduled jobs after 60 days without repository activity. If the join job stops, push any small change or run it once by hand from the Actions tab.
- [ ] **G3.** If you change the number of hours, tell me so I can update the site text. (The account age numbers update the site text by themselves.)
- [ ] **G4.** A few weeks after going live, check whether the 30 day GitHub rule is turning away genuine students (ask Core how many exceptions they granted). If it is, lower it.

---

## What I am doing, and what is waiting on you

| Waiting on you | I will do as soon as you finish it |
| --- | --- |
| A0 bot token rotation | Tick A2's note off |
| A2b exempt role check | Note it and move on, or fix `DISCORD_ROLES_EXEMPT` with you if a role is missing |
| A7 testing (start by setting `ONBOARDING_START`, see A7) | Fix anything that breaks against the real Discord, GitHub and database; then help you go live (A8) |
| B3 colour | Re-render the Membership and Decisions objects, restyle the Safety seal and the side rail |
| B4 section plan | Build the section before the footer |
| B5 | Add the Cmd+K palette |
| C2, C3 | Wire each file in and re-render where needed |
| D1 (X page, coming soon) | Add the X icon |
| E2 | Replace the placeholder in the legal text |

Done since the last update: B6, B8, B9, B10 decided; C1 built and wired in; the Become a Catalyst link fixed; the public Legion listing automated.

Nothing else is queued on my side.

## Log of what is done (newest first)

- 29 Sep 2026: Renamed the Showcase page to Studio (`/showcase` now permanently redirects to `/studio`, pitch link tokens survive the redirect; nav, header, sitemap, footer and Docs links updated; internal file and folder names left as they are). While pushing, found that D6 (connecting this folder to GitHub) was not actually in effect: no remote was configured, and two real commits from 24 to 25 Sep (the header rework, the Showcase page itself) had never reached GitHub. Pushed everything together the manual way (mirror into a fresh clone, commit, push, fetch back); reopened D6. Also found `web/docs/portfolio-studio-page/`, an archive of the portfolio's own former `/studio` page, written to disk but never committed; read it, it is benign reference material, included it in the push. Wrote `D:\Portfolio-Main\Portfolio\edith-context.md`, a from-the-source description of edith for your portfolio agent to read.
- 28 Sep 2026: Started the edith dev server on port 3000 (all five main pages answer). Wrote `D:\Portfolio-Main\Portfolio\hero-button\IMPLEMENTATION.md`: a tested port of edith's "Become a Catalyst" hover effect for a button in your portfolio's home hero. Its animation state matched edith's original value for value at 13 points across four runs, and 12 behaviour checks pass (mouse, keyboard, reduced motion, touch, unmount); it works on dark and light. Not run inside the portfolio yet, and Chromium only. Default label and target are a guess (Contact, `/contact`); yours to change. Nothing in the edith site changed.
- 28 Sep 2026: Wrote an implementation kit for putting edith's hero marble behind the home hero of your portfolio (`D:\Portfolio-Main\Portfolio\hero-marble\IMPLEMENTATION.md`, plus the ready textures and a still image). I first read your request the wrong way round and specced your portfolio's film hero for edith; that spec was removed. The kit was built and tested in a scratch project against the live edith hero (image match 0.84 mean correlation, 0.97 best, against 0.07 to 0.34 for wrong orientations and shifts; seamless on the portfolio's page colour; 14 behaviour checks including reduced motion, no WebGL and slow devices). Not run inside the portfolio yet, and real GPU speed is untested. Nothing in the edith site changed.
- 25 Sep 2026: Built the Showcase page (`/showcase`) to the approved plan (`docs/showcase/plan.md`): a film that turns live. Opening film (stand-in frames until the Blender renders land), then the live 3D hall of monoliths in the home page's own marble, one per exhibit, each window playing a real recording of the work (Exhibit 01 this website, Exhibit 02 the join flow, three reserved slots); Take a closer look with the real code excerpts and measured facts; Under the hood with a live X-ray (wireframe, normals, light) and readouts measured in the visitor's browser; the people; and the ask. Signed pitch links (`?p=`, greeting "Kevin Andrew prepared this for Acme", button books you), opt-in sound made in code, three device tiers (still page for weak devices and reduced motion). Header gets "Showcase"; on the Showcase its button reads "Book a call". Checks: 28 unit checks, production build, no dashes in any page, pitch links (real and forged) in the browser, the home page and header re-tested (19/19). Installed ffmpeg on D:\tools\ffmpeg. The Blender prompt is in `docs/showcase/asset-session-prompt.md`.
- 24 Sep 2026: Header rework, built and checked in a real browser (19 checks, plus a simulated spring at 30, 60 and 120 fps). The desktop burger (the socials drop-down) is gone; socials stay in the footer, and the phone menu is unchanged. The header now has the logo on the left and The Legion, Docs and the "Become a Catalyst" button at the right end. On the home page the button is hidden while the hero (which has its own) is on screen; once you scroll past it, it slides in from the right edge and pushes the links left as one rigid unit (the gap never changes), driven by Lenis and a damped spring (settles in about half a second, no visible bounce, reversible mid-way without a jolt). The header now stays up through the hero and the push before tucking away. On other pages the button is simply there. Files: `components/HeaderNav.tsx` (new), `components/Header.tsx`, `components/sections/Hero.tsx`; `SocialsMenu.tsx` deleted. Not committed yet. Wrote the Showcase page spec (see item 4 at the top), no code for it until you approve.
- 22 Sep 2026: Decided B9 (automate the public Legion listing) and B10 (leave Friday showing offline for now). Built: ticking "Show me on the public Legion page" now writes the entry straight to the same database as the join flow (a separate, plainly readable key space), and `/legion` reads it fresh on every visit, so a new Catalyst appears immediately without Core doing anything. Added an X (Twitter) profile field to the Catalyst form, shown as an icon next to GitHub and Portfolio on the Legion page. Rewrote the welcome DM to introduce the hubs and channels, not just the form deadline, since Friday cannot itself reply to anyone (Message Content Intent is off by design). Explained why your two friends got no DM: `ONBOARDING_START` is not set, so the sweep runs every 10 minutes and does nothing, exactly as designed; noted in A7 how to actually run that test now that they are already in the server. 42 unit checks pass (3 new), build and lint clean, `/legion` checked live with no database configured locally (falls back cleanly).
- 22 Sep 2026: Fixed a bug you caught testing A7: every "Become a Catalyst" button (header, mobile menu, home, docs, legion) linked straight to the Discord invite, skipping `/join` entirely. They all now open `/join` first, which explains the two sign-ins and, if you are not a member yet, sends you on to Discord from there. The plain "Discord" footer and social links were left pointing straight at the invite on purpose. Build, lint and a live check of every CTA on `/`, `/docs`, `/legion` confirm it.
- 22 Sep 2026: C1 (share image) built by a Claude Code terminal (Prompt 3), resized and wired into `app/`, `app/docs/`, `app/legion/` and `twitter-image.jpg`; build, lint and a live check of all four routes (200, `image/jpeg`, 1200x630) pass. Confirmed with you that the reused Discord application ("E.D.I.T.H.", renamed to Friday) was an unused leftover, nothing else broke. Flagged A2b: you kept Friday as Administrator above staff in the role order, so `DISCORD_ROLES_EXEMPT` is now the only thing protecting Founder, Core Team, Mods and Maintainer from the sweep; asked you to confirm it lists all four.
- 22 Sep 2026: A1 to A6 done, run through the two Claude Code terminal prompts (GitHub OAuth app, Upstash database, Vercel env vars, GitHub repo secrets). Dry run against the real services came back clean, `/join` loads. Two follow ups: rotate `DISCORD_BOT_TOKEN` (it was exposed in that terminal session's own transcript, added as A0), and fixed the `Get-Random -Count 48` line in `docs/onboarding-setup.md` and `docs/claude-code-setup-prompts.md`, which had been silently generating 36 character secrets instead of 48 (still a huge keyspace, not a security problem, just not what it said).
- 22 Sep 2026: Decided B6 (footer wording changed to "a community that runs itself") and B8 (retention text kept as written); implemented B6 in `lib/content.ts`. Confirmed by you: D2 (Instagram and LinkedIn links), D3 (Calendly), D4 (inbox monitored), D6 (git remote connected, Sync and Push work). Added a code-built option for C1 (Prompt 3 in `docs/claude-code-setup-prompts.md`). D1 (X) still open: no page yet, you will make one and say when.
- 21 Sep 2026: Wrote two ready-to-paste Claude Code prompts for the Discord side (A1, A2) and the GitHub, database, Vercel and scheduler side (A3 to A6), in `docs/claude-code-setup-prompts.md`. Both keep everything switched off, keep secrets outside the repository, and end with a report.

- 21 Sep 2026: Decided B1 (GitHub required) and B2 (minimum ages 7 and 30 days). Built the age rule: the too-new page shows the exact eligible date and how to ask for an exception, and the public rules state the same numbers automatically. 33 browser checks pass with it on.
- 21 Sep 2026: Catalyst join flow built: Discord then GitHub sign-in, private form, 24 hour deadline, automatic removal, one person one entry, reserved names, optional account ages, release command. Tested against fakes (39 unit and 29 browser checks). Deployed switched off.
- 21 Sep 2026: Core defined as the mediators (FAQ, roles, home, Legion page). FAQ line about the booked meeting corrected.
- 21 Sep 2026: Apple product site study (36 pages) and the changes from it: type ladder, motion tokens, 28 px panels; Beliefs rebuilt as a Blender sequence; share image on every page; JetBrains Mono; hover wipes with the marble gradient; copy links on Docs headings.
- 21 Sep 2026: Handbook renamed Docs; Catalysts renamed The Legion with Maintainers and Catalysts together; navbar lists pages only; Calendly booking link added.
- 21 Sep 2026: Maintainer cards show GitHub avatar, name, and icon links; Discord handle shown for the Origin.
- 21 Sep 2026: Scrollbars hidden everywhere.
- 20 to 21 Sep 2026: Pitch black page, worked example cards in How an idea becomes a launch, story-style Hubs, redesigned Shipped by members and Studio, Apple style footer, Vercel deployment and speed work.
