# Catalyst join flow: setup

What it does, once switched on:

1. Someone joins the Discord from the link on the site.
2. Within about ten minutes they get a direct message: "complete your Catalyst form within 24 hours". If their direct messages are
   closed, they are pinged in a welcome channel instead.
3. The link goes to `/join`. They **sign in with Discord** (their username only) and then **sign in with GitHub** (public profile
   only, no email, no scope). That proves both accounts are really theirs. They fill in a short form and are given the Catalyst
   role. Their answers are posted privately for the mediators (Core).
4. **One person, one entry:** one GitHub account can be linked to one Discord account and the other way round. A second Discord
   account using the same GitHub account is stopped before the form. Names that pass someone off as edith, its staff or a
   Maintainer are refused.
5. If they have not finished 24 hours after joining, they are removed from the server automatically and can join again.

There is no server to run. A GitHub job asks the site every ten minutes; the site talks to Discord and GitHub. The state is the
Discord roles, plus one small database that only remembers one-way codes of who has joined (so nobody can join twice).

**It is safe until you switch it on.** It defaults to a dry run that only reports, and it never touches anyone who joined before the
start time you set, bots, the server owner, anyone with an exempt role, or anyone who already has the Catalyst role. It refuses to
remove more than 10 people in one run, and only removes people it invited at least half the window (12 hours) before.

It has been tested against fakes of Discord, GitHub and the database (39 unit checks, `npx tsx scripts/join-test.ts`, and 33 browser
checks). It has **not** been tried against the real services yet: do the dry run and the two-account test in step 8 before you rely on it.

## 1. In Discord (your server)

1. Turn on Developer Mode: User Settings, Advanced, Developer Mode. This lets you right click anything and choose Copy ID.
2. Roles (Server Settings, Roles). You need:
   - **Catalyst**: the role everyone should end up with (create it if it does not exist yet).
   - **Pending**: a new role with no permissions, given to people while their form is due. If you want unfinished members to be
     unable to chat, deny "Send Messages" for Pending in your channels.
   - **Form reminded** (optional): another empty role, so the reminder is only sent once.
3. Channels:
   - A **private channel** only Core and the bot can see, for example `#catalyst-forms`. The form answers are posted here.
   - Optional: a public `#welcome` channel, used to ping someone whose direct messages are closed.
4. Copy the ID of each role and channel, and of the server (right click the server icon).
5. In your rules or welcome screen, say plainly what will happen. Suggested text:
   > Within 24 hours of joining you will get a message with a short Catalyst form. You sign in with Discord and GitHub to confirm
   > both accounts are yours, then fill it in. Each person has one entry, and very new accounts (Discord under 7 days old, GitHub
   > under 30) are turned away; ask a Core member if you are genuine. If the form is not completed in time you are removed from
   > the server automatically, and you are welcome to join again.
6. Optional extra layer: Server Settings, Safety Setup, Verification Level. "Medium" (registered on Discord for more than five
   minutes) blocks the newest throwaway accounts before they reach the site at all.

## 2. The Discord application (discord.com/developers)

1. New Application, name it "edith". Copy the **Application ID** (this is `DISCORD_CLIENT_ID`).
2. **OAuth2**: copy the **Client Secret** (`DISCORD_CLIENT_SECRET`). Under Redirects add exactly
   `https://edith-plum.vercel.app/api/join/callback` (use your own domain if you add one; it must match to the letter).
3. **Bot**: Reset Token and copy it (`DISCORD_BOT_TOKEN`; it is shown once). Turn on **Server Members Intent**.
4. **Invite the bot**: OAuth2, URL Generator, tick `bot`, and under Bot Permissions tick Manage Roles, Kick Members, View
   Channels, Send Messages and Embed Links. Open the link and add it to your server.
5. Back in Server Settings, Roles: drag the bot's role **above** Catalyst, Pending and Form reminded. Discord only lets a bot
   manage roles, and remove members, below its own. Moderators and Core who sit above the bot's role are safe from removal.
6. Give the bot access to the private forms channel (and the welcome channel if you use one).

## 3. The GitHub OAuth app (proves the GitHub account is theirs)

GitHub, Settings (ideally of the edith organisation), Developer settings, OAuth Apps, New OAuth App.

- Application name: edith. Homepage URL: `https://edith-plum.vercel.app`.
- Authorization callback URL, exactly: `https://edith-plum.vercel.app/api/join/github/callback`
- Register it, copy the **Client ID** (`GITHUB_CLIENT_ID`), then Generate a new client secret and copy it
  (`GITHUB_CLIENT_SECRET`, shown once).
- Change nothing else. The site asks for no permissions, so it can only see the public profile, and it cancels the sign-in right after.

## 4. The database (remembers one-way codes so nobody joins twice)

In the Vercel dashboard, open the project, Storage (or Marketplace), add **Upstash for Redis** (a free plan exists), create a database
and connect it to the project. Vercel then adds its connection settings for you: a URL and a token whose names start with
`UPSTASH_REDIS_REST_` or `KV_REST_API_`. The site accepts either pair. Nothing else to do.

What it holds: two entries per person, each a one-way code of a Discord id or a GitHub id. No name, no username, no email.

## 5. Settings on Vercel

Project Settings, Environment Variables. The full list, with comments, is in `web/.env.example`.

- `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`
- `DISCORD_ROLE_CATALYST`, `DISCORD_ROLE_PENDING`, `DISCORD_ROLE_REMINDED` (optional)
- `DISCORD_ROLES_EXEMPT`: comma separated role ids that must never be removed (Maintainer, Core, moderators, and your own role)
- `DISCORD_CHANNEL_FORMS`, `DISCORD_CHANNEL_WELCOME` (optional)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Three random strings: `JOIN_SIGNING_SECRET`, `CRON_SECRET` and `JOIN_ID_SECRET`. In PowerShell:
  `-join (1..48 | ForEach-Object { [char]((48..57 + 97..122) | Get-Random) })`
  (an earlier version of this line, `Get-Random -Count 48` over the same 36 character set, silently returns only 36 characters:
  `-Count` never resamples past the size of the set it is drawing from. The version above asks for one fresh character 48 times,
  so it is always exactly 48 long.)
  **Never change `JOIN_ID_SECRET` after people have joined**: it would make the database forget everyone and allow duplicate entries.
  Keep a copy of it somewhere safe.
- Leave `ONBOARDING_DRY_RUN` as `true`, `ONBOARDING_START` empty and `NEXT_PUBLIC_JOIN_LIVE` as `false` for now.
- **Account age rules (decided: on).** `NEXT_PUBLIC_JOIN_MIN_DISCORD_DAYS=7` and `NEXT_PUBLIC_JOIN_MIN_GITHUB_DAYS=30`. An account
  younger than that is turned away with a page that says the exact date it becomes eligible; the public rules state the same
  numbers. The 24 hours still run, so a genuine person with a very new account is removed and can rejoin once it is old enough, or
  Core can give them the Catalyst role by hand as an exception. Change the numbers (or set them to 0 to switch a rule off) and
  redeploy; the site text follows automatically.
- `JOIN_REQUIRE_GITHUB=false` lets people without GitHub join (designers, hardware people). Then only their Discord identity is
  checked, one entry per Discord account is enforced by the Catalyst role, and nothing stops one person using two Discord accounts.
  **Decided: leave it at the default (GitHub required).** People without GitHub, such as designers, are let in by a Core member
  giving them the Catalyst role by hand.

Redeploy after saving. Without the required settings the page shows "not switched on yet" and nothing else happens.

## 6. The scheduler (GitHub)

The workflow `.github/workflows/join-sweep.yml` is already in the repository. In the repository settings, Secrets and variables,
Actions, add two secrets: `SWEEP_URL` = `https://edith-plum.vercel.app/api/join/sweep` and `CRON_SECRET` = the same value as on
Vercel. It then runs every ten minutes (GitHub can delay scheduled runs by a few minutes, and pauses them after 60 days without
repository activity; you can also run it by hand from the Actions tab). Vercel's free plan cannot do this itself: its scheduled
jobs run once a day at most.

## 7. What is kept, and where

- **On the website:** no cookies. The sign-in tokens are signed and expire (15 minutes and 2 hours) and travel in the address, then
  the address bar is cleaned. Only the one-way codes above are stored.
- **In Discord:** the Catalyst role, and one message per completed form in your private channel (name, verified GitHub username,
  areas, optional website and one line, whether they ticked public listing, the two account creation dates and the deadline).
  Delete a message to delete that record.
- **On the Legion page:** only people who ticked "Show me on the public Legion page". Ticking it adds them automatically, in the
  same database as the one-way codes but a different, plainly readable key space (`legion:*`): their GitHub username, name,
  areas, portfolio link, X handle and the one line, exactly what they typed. It shows up the moment they submit; nothing for
  Core to review first. `web/lib/legion.ts` still exists as a hand-written fallback list, for anyone added before this or added
  by hand for any reason.

## 8. Test it, then switch it on

1. **Dry run.** In a terminal (replace the secret):
   `curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://edith-plum.vercel.app/api/join/sweep?dry=1"`
   You should get JSON with `"dryRun":true` and a note that `ONBOARDING_START` is not set. A `missing` list means a setting is
   absent. A 401 means the secrets differ.
2. **Two account test.** Set `ONBOARDING_START` to the current time (for example `2026-09-22T10:00:00Z`) and
   `ONBOARDING_DRY_RUN` to `false`, and redeploy. Join the server with a spare Discord account. Within ten minutes it should
   get the Pending role and a message. Open the link, sign in with Discord and GitHub, fill in the form: it should get the Catalyst
   role and an entry should appear in the private channel.
3. **One entry test.** With a second spare Discord account, try the same GitHub account: it should be stopped with "That GitHub
   account is already used". Use the release command below to free the first account, and try again.
4. **Removal test.** Set `ONBOARDING_HOURS` and `NEXT_PUBLIC_ONBOARDING_HOURS` to `2` (the smallest allowed), join with a spare
   account again, do not fill the form, and check it is reminded and then removed. Put both back to `24`.
5. **Live.** Set `ONBOARDING_START` to the moment you want it to begin, `ONBOARDING_DRY_RUN` to `false` and
   `NEXT_PUBLIC_JOIN_LIVE` to `true`, then redeploy. Everyone who joined before the start time is never touched. The last setting
   is what makes the rules, privacy policy, FAQ and home page mention the 24 hour form and the one entry rule; it is off until now
   so the site never promises something that is not running. Also paste the welcome text from step 1.5 into Discord at this moment.

Any time you want to see what it would do without doing it, run the dry run command again.

## Looking after it

- **Free someone to start again** (they lost an account, or asked to be deleted): find their numeric Discord id (Developer Mode, right
  click their name, Copy User ID) and run
  `curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" -H "Content-Type: application/json" -d "{\"discordId\":\"123456789012345678\"}" "https://edith-plum.vercel.app/api/join/release"`
  It clears only the one-entry record; delete their message in the private channel and remove their role yourself if needed.
- **Let someone in without the form** (for example a designer with no GitHub account, or someone you already know): give them the
  Catalyst role by hand in Discord. The job never touches anyone who has it, so they are never invited or removed.
- **Check for people the job missed** (it was off for a while): run the dry run and read `missed`.
- **Add a Catalyst to the Legion page:** copy their GitHub username and areas from the private channel into `web/lib/legion.ts`.

## What can go wrong

- **Someone missed the deadline because their messages are closed and they did not see the welcome channel.** They are removed and
  can rejoin. That is the rule; the welcome text above and the site say so before they join.
- **The scheduled job was off for a long time.** Anyone who joined during that time and was not invited within 12 hours is left
  alone and listed under `missed` in the sweep result. Message them yourself.
- **"Missing Permissions" in the results.** The bot's role is not above the roles it is changing, or it lacks Kick Members.
- **Listing members fails.** Server Members Intent is off (step 2.3).
- **"invalid redirect_uri" when signing in.** The redirect URL in the Discord application, or the callback URL in the GitHub app,
  must match exactly (steps 2.2 and 3).
- **A designer without GitHub cannot join.** That is the default (`JOIN_REQUIRE_GITHUB`); see step 5.
