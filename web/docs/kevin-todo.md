# Kevin's checklist: only you can do these

This is the single list of everything that needs **you**: your accounts, your decisions, your files, your legal and community
calls. I keep it up to date at the end of every working session (I add tasks the moment my work creates one, tick things when
you tell me they are done, and move finished items to the log at the bottom). Work through it in your free time, in any order
that suits you, and tell me when something is done or when you have decided. Everything else is mine.

This file lives in a public repository, so it must never contain a password, token or secret. Put secrets only in Vercel and
GitHub settings.

**Last updated:** 1 October 2026

Legend: `[ ]` to do, `[~]` started, `[x]` done. Time is a rough guess for you, not for me.

## Start here (the three that unlock the most)

0. **Rotate the Discord bot token (5 min, urgent).** Exposed in a terminal transcript during setup. Discord Developer Portal, your application, Bot, Reset Token (needs your MFA). Either paste the new value into `DISCORD_BOT_TOKEN` on Vercel yourself, or give it to the same terminal session and let it do that step, since it already offered. Tell me either way is done.
1. **Confirm `DISCORD_ROLES_EXEMPT` covers all four staff roles (2 min), see A2b below.** You told the setup session to keep the bot (Friday) as Administrator, above staff in the role order. That is your call, but it means the exempt list is now the *only* thing stopping the sweep from ever kicking staff.
2. ~~Decide B1 and B2~~ **Done (21 Sep):** GitHub required, and minimum account ages on (Discord 7 days, GitHub 30 days).
3. **A7: test the join flow** (about 20 minutes). A1 to A6 are done (see below); this is what is left before going live. Two spare Discord accounts and two spare GitHub accounts, steps in `docs/onboarding-setup.md` step 8.
4. **Catalyst pipeline (1 Oct): merged into `main` (pull request 1), so H0 is done. Read section H below; start with H1 (the reliable timer) and H2 (your friends sign in).** Everything in it is built and tested against fakes, but none of it has met the real Discord yet.
5. **Studio page: read the "before it goes public" list in section S below (S7 to S10).** The page is wired in and builds, but four things about it are only yours to settle: the client case study, the Claude and OpenAI logos, the film, and the claims in the copy.
6. ~~Studio: start the Blender session~~ **Parked (30 Sep).** `/studio` now serves your portfolio's Studio page (its own look, its own film), so the Showcase and its Blender renders are on hold. Nothing is lost: the Showcase code is still in `components/showcase/`, and `components/showcase/ShowcasePage.tsx` says how to put it back, on `/studio` or on its own address. Say the word when you want it back. The Blender prompt is still in `docs/showcase/asset-session-prompt.md`.
7. ~~Studio: approve the three lookdev stills~~ **Parked with item 6.**

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
- [x] **D6. Connect `D:\page_content` to GitHub.** **Fixed, checked 1 Oct 2026:** `origin` is `https://github.com/helloedithstudio/Site-Main.git`. That repository belongs to the edith GitHub account, and your personal account is a collaborator on it. Pushing works (you pushed the branches yourself on 1 Oct; the permission check on my side refuses `git push`, so pushes stay yours).
- [ ] **D5. Custom domain.** **No domain yet (1 Oct), parked; you will get one soon.** When you do, change these together, and tell me so I can check them: `NEXT_PUBLIC_SITE_URL` on Vercel, the Discord OAuth redirect, the GitHub OAuth callback, the **Interactions Endpoint URL** in the Discord developer portal (promotion), the repository secret `SWEEP_URL` on GitHub, and both **QStash schedules** (the sweep and the daily nomination scan, which contain the address). The `edith-plum.vercel.app` address keeps working on Vercel alongside a custom domain, so nothing has to break while you switch. The repo's homepage field on GitHub still says `edithstudio.vercel.app` (a 404): set it to the real address then.

## E. Legal and business

- [ ] **E1. Lawyer review.** The rules, terms of use, privacy policy, Working with edith and Operating under edith are drafts, and the site says so. They now also cover the join flow, the one entry rule and the one-way codes. A lawyer familiar with India's Digital Personal Data Protection Act should read them before the join flow goes live.
- [ ] **E2. Legal entity details** (name, registration, address) so I can replace the placeholder sentence in the terms and privacy policy.
- [ ] **E3. Maintainer licence and client terms.** Confirm you are happy with what Maintainers may do under the edith name and how liability is split.
- [ ] **E4. Where the marble and the button effect came from.** edith's own code comments say its shader was "extracted verbatim from the production bundle" of "the original" WebGL layer, and that its hero button is the "Button 'Base' of the original". That reads as another site's. Nobody has checked where the shader, the marble textures or the hover effect came from. Worth settling for edith itself, and before either is copied onto your portfolio (`hero-marble\IMPLEMENTATION.md` and `hero-button\IMPLEMENTATION.md`, section 6 of each).

## F. Community operations (Discord)

- [ ] **F1. Name the Core members** (the mediators) and tell me who should be listed publicly, if anyone.
- [ ] **F6. Exceptions.** Agree who handles them, and what counts: a genuine person with a very new account (age rule) or with no GitHub account. The fix is always the same: a Core member gives them the Catalyst role by hand.
- [ ] **F2. Moderators.** Who they are, who can kick, and who answers appeals (the rules say a Core member does).
- [x] **F3. The `apply-here` process.** **Superseded 1 Oct by H8:** Maintainers are no longer chosen by a PR and two endorsements; Friday suggests and you approve. The public pages were reworded to match; H8 asks you to confirm.
- [ ] **F4. Demo Day.** Pick the first date, or tell me it is still open.
- [ ] **F5. First projects and RFCs.** When something ships or an RFC opens, tell me and I will list it.

## S. Studio page (`/studio`)

Since 30 Sep `/studio` is your portfolio's Studio page, moved in from `docs/portfolio-studio-page/` and kept in its own Apple-style look on purpose (it is what clients see, so it does not follow the dev site's theme). The words are in `app/studio/page.tsx` (the same list, in reading order, is `docs/portfolio-studio-page/copy.md`), the look is `styles/studio.css`, the pieces are `components/studio/`. The earlier Showcase page is parked (see item 6 at the top), so B11, B12, S3 and the Blender items are on hold with it.

**Before it goes public (only you can settle these):**

- [ ] **S7. The case study.** Scene 4 names a client (Mamacita's Miami Eats) and shows their site on a laptop. Confirm you still have their permission for it to be on edith's public site, not only on your portfolio.
- [ ] **S8. The Claude and OpenAI logos.** The marks belong to Anthropic and OpenAI. Check their brand guidelines allow this use on a public page (scene 2). If not, say so and I swap them for plain words.
- [ ] **S9. The film.** `public/studio-page/studio1.mp4` came from your own Studio page. Confirm it contains no third-party footage and you may reuse it here.
- [ ] **S10. The claims and the voice (10 min).** Read the page once as edith's page and decide what stays. The copy is your portfolio's, only the dashes changed. Things to check: it still says "Edith Studio" (edith's own copy says plain "edith"); "What I build" and "we" are mixed; "one flat price in writing", "a first demo in days" and "shipped worldwide" are promises the studio now makes; and the button "Visit Edith Studio" now goes to the edith home page, because the old Studio site is this site. Tell me what to change and I will.

- [ ] **S11. The Docs page button "See the studio" (2 min).** It sits under "Top projects" on `/docs` and goes to `/studio`, which used to show projects and now shows the services page, so the button no longer leads to what the section is about. Tell me: point it somewhere else (The Legion, or Discord), reword it, or leave it.

**Still yours from before:**

- [ ] **S1. Pitch link secret (5 min, before you send your first link).** Pitch links still work on the new page: the header button says "Book a call with <name>" and opens that Maintainer's booking link. Make one long random value: `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"` (48 characters). Put it in Vercel as `PITCH_LINK_SECRET` (Production), and replace the development value in `web/.env.local` with the same one, so links you make locally work on the live site. Then make a link: `npx tsx scripts/pitch-link.ts --from Andrew-Kevin-007 --for "Client Name" --days 60`. Changing the secret later ends every link made before.
- [ ] **S4. Phone check (10 min).** Scroll the whole page on your phone, and open one pitch link from WhatsApp. I checked it at phone width in a test browser, not on a real phone.
- [ ] **S5. Other Maintainers' booking links**, when there are other Maintainers: add `booking` to their entry in `lib/legion.ts`.
- [ ] **S6. Free space on C:** it had about 7 GB free last I checked. Aim for 20 GB or more; Windows and the render tools misbehave when C: is nearly full.
- [ ] **S3. (Parked with the Showcase.)** Friday's welcome DM screenshot, for Exhibit 02's closer look.

## H. Catalyst pipeline: timing, Legion listing, promotion (built 1 Oct, branch `catalyst-pipeline`)

What changed: (1) the sweep runs on a reliable timer and never marks someone "invited" who could not be reached; (2) people who
already have the Catalyst role (your friends) can now sign in and be listed on the Legion page; (3) Friday nominates Catalysts for
Maintainer and only you can promote; (4) a check shows which channels each role can see. Steps and commands are in
`docs/onboarding-setup.md` (sections 6, 9, 10). All of it ran against fakes of Discord, GitHub and the database and in a real browser
against those fakes; **none of it has touched the real Discord yet**, so H6 is the real test.

- [x] **H0. Get it live.** **Done 1 Oct 2026:** `catalyst-pipeline` was pushed and merged into `main` as pull request 1, and Vercel deployed it. The Studio branch is pushed as `studio-page` and was merged into `main` after it.
- [x] **H1. Create the reliable timer.** **Done 1 Oct 2026:** the QStash schedule (EU region, every 5 minutes) exists, is not paused, and QStash reports its last run as `SUCCESS` (checked through QStash's own API: it fired on the 5 minute mark and the site accepted it). The `CRON_SECRET` was replaced everywhere (Vercel, GitHub, the schedule). A direct call to the sweep and a run of the GitHub workflow both answered `"ok":true,"unreachable":[]`. `DISCORD_CHANNEL_WELCOME` is set in Vercel and the channel is public (you confirmed). The QStash console's Logs page showed nothing for the first half hour even though runs were succeeding; trust the Schedules tab or the API, not that page.
- [x] **H1b. Rotate `CRON_SECRET` again, because it was shown in a chat.** **Decided 1 Oct 2026 by Kevin: leave it as it is.** The risk he accepted: anyone who has that value can call the sweep, the nomination scan, the command registration, the channel audit and the release route. It can be rotated at any time with the steps below, and it should be if it ever appears anywhere public. On 1 Oct the QStash command that lists schedules (`GET /v2/schedules`) printed the forwarded `Authorization` header, which is the live `CRON_SECRET`, and it was pasted into a conversation. It is the password for the sweep, the nomination scan, the command registration, the audit and the release routes. Steps if you ever do rotate it: make a new one (`-join (1..48 | ForEach-Object { [char]((48..57 + 97..122) | Get-Random) })`), then: delete the old QStash schedule (`curl.exe -X DELETE "$base/v2/schedules/SCHEDULE_ID" -H "Authorization: Bearer $token"`), put the new value in Vercel (`CRON_SECRET`, then redeploy) and in the GitHub secret `CRON_SECRET`, and create the schedule again with the new value (section 6 of `docs/onboarding-setup.md`). **To check a schedule later without printing the secret**, use `curl.exe -s "$base/v2/schedules" -H "Authorization: Bearer $token" | ConvertFrom-Json | Select-Object scheduleId, cron, isPaused, lastScheduleTime, nextScheduleTime, lastScheduleStates | Format-List`.
- [ ] **H2. Tell your friends (2 min each).** Open "Become a Catalyst" on the site, sign in with Discord and GitHub, tick "Show me on the public Legion page", save. It works for people who already have the Catalyst role, there is no deadline, and nothing about their roles changes. They appear on `/legion` straight away. You can also add someone by hand with `/list` once H4 is done.
- [ ] **H3. Check the welcome message works for a brand new joiner (10 min).** After H1, join with a spare account and see the Friday message arrive within about five minutes. This is also A7.
- [ ] **H4. Set up promotion (15 min).** `docs/onboarding-setup.md` section 9, steps 1 to 6: the Maintainer role, a private #promotions channel, Friday's role above Maintainer, the public key and four settings on Vercel (add the Maintainer role id to `DISCORD_ROLES_EXEMPT` too), the Interactions Endpoint URL in the Discord developer portal, and one `curl.exe` to register the slash commands.
- [ ] **H5. Create the daily nomination timer (3 min).** Step 7 of section 9, a second QStash schedule.
- [ ] **H6. Test promotion with a spare account before relying on it (20 min).** Section 9, step 8. Temporarily lower `PROMOTE_MIN_DAYS` and `PROMOTE_MIN_POINTS`, give the spare account a credit note, run the scan, press Promote, check the role, the Maintainer channels and the Legion page, then `/demote` and put the settings back.
- [ ] **H7. Hide the Maintainer channels from Catalysts (10 min).** Section 10: a private Maintainers category where `@everyone` is denied View Channel and the Maintainer role is allowed. Then run the audit command; it tells you if a Catalyst can still see a Maintainer channel, or if no channel is Maintainers-only (a promotion would unlock nothing). I cannot change Discord permissions for you.
- [ ] **H8. Confirm the wording and the numbers (5 min).** The Legion page, the FAQ and the home page now say: you do not apply; after 30+ days as a Catalyst with steady work, Friday suggests you and the founder approves. Defaults: 30 days, 8 points (two per merged pull request in the last 60 days, two per credit note in the last 90, five of each at most), counting the GitHub organisations `helloedithstudio` and `Edith-Studio`. Tell me what to change. The `apply-here` channel text now says "Tell Core what you have been building"; say if that channel should be renamed or retired.
- [ ] **H9. Privacy and legal (E1).** The privacy text now says the website keeps a member record (Discord id linked to GitHub username), your credit notes and each person's promotion state, and that Legion profile answers are stored when someone ticks the box. It was worded to be accurate, but it is a draft: include it in the lawyer review (E1), and say whether you are happy with "kept while you are a member, deleted when you ask" for these too (B8).
- [ ] **H10. Later, if you want it: Discord activity as a signal.** Counting helpful messages needs a privacy decision first (it stores counts per person), so it is not built. Say the word when you want it.

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
| H1 to H3 (QStash timer, friends sign in, a new joiner test) | Read the first sweep results with you and fix anything the real Discord shows that the fakes did not |
| H4 to H6 (promotion setup and test) | Fix what the real Discord does differently, then tune the points and days with you |
| H7 (Maintainer channels hidden) | Read the audit result with you |
| H8 (wording and numbers) | Change the copy and the defaults |
| S7 to S10 (case study permission, logos, film, the claims and voice) | Change or remove whatever you say, in the page copy |
| Whether to bring the parked Showcase back (item 6) | Put it back on `/studio` or on its own address, and restart the Blender session |

Done since the last update: B6, B8, B9, B10 decided; C1 built and wired in; the Become a Catalyst link fixed; the public Legion listing automated.

Nothing else is queued on my side.

## Log of what is done (newest first)

- 1 Oct 2026 (later): Reliable timer set up (H1, mostly). The QStash schedule was created (EU region, every 5 minutes). While checking it I found that a manual run of the GitHub backup timer had been refused with a 401 but still showed a green tick, because the workflow piped `curl` into `tee` without `pipefail`. Fixed in pull request 3: a failed request or a response with `"ok":false` now turns the run red and GitHub emails the repository owner. The 401 was a stale secret: Vercel and GitHub hide saved secrets, so `CRON_SECRET` had to be replaced, and it now matches in Vercel, GitHub and the QStash schedule. After the fix the GitHub run was green for a true reason, with `unreachable` in the answer, which also confirms the new pipeline code is live.
- 1 Oct 2026: Catalyst pipeline (built on branch `catalyst-pipeline`, merged into `main` as pull request 1 the same day, so H0 is done). Investigated why friends were missing from the Legion page, welcome messages were late or missing, and promotion did not exist. Found: (a) anyone who already had the Catalyst role was sent straight to "done" on `/join`, so there was no route to be listed; (b) GitHub's 10 minute timer ran every 3 to 6 hours; (c) the sweep gave someone the Pending role before messaging them, so a person with closed direct messages and no working welcome channel looked "invited" and would have been removed after 24 hours without ever being told; (d) `.env.example` was never committed (web/.gitignore ignored it). Built: a Redis lock so two timers never double message; message first, mark invited second, with an `unreachable` list; a second timer (QStash) in the docs; profile mode on `/join` for existing Catalysts (no deadline, no age checks, roles untouched) plus a member record; promotion (Friday nominates from merged pull requests and your credit notes after 30 days, only you promote, via buttons and `/promote /demote /credit /list /unlist`); a channel visibility audit. Corrected the privacy text, the Legion page text and the FAQ to match. Tests: join 57 checks, promotion and audit 40, plus a real browser run of the built site against fakes (21 for `/join`, 29 for promotion). Not run against the real Discord: that is H6.
- 30 Sep 2026: `/studio` now serves your portfolio's Studio page (the package you added in `docs/portfolio-studio-page/`), kept in its own Apple-style look on purpose because clients see it. Moved in: the route (`app/studio/page.tsx`), six components (`components/studio/`), the styles (`styles/studio.css`, plain CSS with every class prefixed `sp-` because edith has no Tailwind, sizes in px because edith's rem is about 9 px), the film, logos and laptop (`public/studio-page/`), and the two Google Sans fonts (`public/fonts/`, their own metadata names the SIL Open Font License, licence text added). Changes to the copy are only the em dashes (rewritten as colons and commas), the email (now edith's `hello.edithstudio@gmail.com`) and the button "Visit Edith Studio" (now the edith home page, since the old Studio site is this site). Pitch links still work (`PitchStart`), and the header's "Book a call" button is unchanged. The earlier Showcase page is parked, not deleted (`components/showcase/ShowcasePage.tsx` says how to bring it back). Four things are yours before it goes public: S7 to S10.
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
