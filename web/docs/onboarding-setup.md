# Catalyst join flow: setup

What it does, once switched on:

1. Someone joins the Discord from the link on the site.
2. Within about ten minutes they get a direct message: "complete your Catalyst form within 24 hours". If their direct messages
   are closed, they are pinged in a welcome channel instead.
3. The link goes to `/join`. They sign in with Discord (it only reads their username), fill in a short form and are given the
   Catalyst role. Their answers are posted privately for the mediators (Core). Nothing is stored on the website.
4. If they have not finished 24 hours after joining, they are removed from the server automatically and can join again.

There is no server to run and no database. A GitHub job asks the site every ten minutes; the site talks to Discord. The state is
the Discord roles themselves.

**It is safe until you switch it on.** It defaults to a dry run that only reports, and it never touches anyone who joined before
the start time you set, bots, the server owner, anyone with an exempt role, or anyone who already has the Catalyst role. It also
refuses to remove more than 10 people in one run, and only removes people it invited at least half the window (12 hours) before.

It has been tested end to end against a fake Discord that answers the same endpoints (23 checks, `npx tsx scripts/join-test.ts`).
It has **not** yet been tried against the real Discord: do the dry run and the two-account test below before relying on it.

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
   > Within 24 hours of joining you will get a message with a short Catalyst form. Complete it to stay in the community. If it
   > is not completed in time you are removed from the server automatically, and you are welcome to join again.

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

## 3. Settings on Vercel

Project Settings, Environment Variables. The full list, with comments, is in `web/.env.example`.

- `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`
- `DISCORD_ROLE_CATALYST`, `DISCORD_ROLE_PENDING`, `DISCORD_ROLE_REMINDED` (optional)
- `DISCORD_ROLES_EXEMPT`: comma separated role ids that must never be removed (Maintainer, Core, moderators, and your own role)
- `DISCORD_CHANNEL_FORMS`, `DISCORD_CHANNEL_WELCOME` (optional)
- `JOIN_SIGNING_SECRET` and `CRON_SECRET`: random strings. In PowerShell:
  `-join ((48..57 + 97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })`
- Leave `ONBOARDING_DRY_RUN` as `true`, `ONBOARDING_START` empty and `NEXT_PUBLIC_JOIN_LIVE` as `false` for now.

Redeploy after saving. Without the required settings the page shows "not switched on yet" and nothing else happens.

## 4. The scheduler (GitHub)

The workflow `.github/workflows/join-sweep.yml` is already in the repository. In the repository settings, Secrets and variables,
Actions, add two secrets: `SWEEP_URL` = `https://edith-plum.vercel.app/api/join/sweep` and `CRON_SECRET` = the same value as on
Vercel. It then runs every ten minutes (GitHub can delay scheduled runs by a few minutes, and pauses them after 60 days without
repository activity; you can also run it by hand from the Actions tab). Vercel's free plan cannot do this itself: its scheduled
jobs run once a day at most.

## 5. Test it, then switch it on

1. **Dry run.** In a terminal (replace the secret):
   `curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://edith-plum.vercel.app/api/join/sweep?dry=1"`
   You should get JSON with `"dryRun":true` and a note that `ONBOARDING_START` is not set. A `missing` list means a setting is
   absent. A 401 means the secrets differ.
2. **Two account test.** Set `ONBOARDING_START` to the current time (for example `2026-09-22T10:00:00Z`) and
   `ONBOARDING_DRY_RUN` to `false`, and redeploy. Join the server with a spare Discord account. Within ten minutes it should
   get the Pending role and a message. Open the link, sign in, fill in the form: it should get the Catalyst role and an entry
   should appear in the private channel.
3. **Removal test.** Set `ONBOARDING_HOURS` and `NEXT_PUBLIC_ONBOARDING_HOURS` to `2` (the smallest allowed), join with the
   spare account again, do not fill the form, and check it is reminded and then removed. Put both back to `24`.
4. **Live.** Set `ONBOARDING_START` to the moment you want it to begin, `ONBOARDING_DRY_RUN` to `false` and
   `NEXT_PUBLIC_JOIN_LIVE` to `true`, then redeploy. Everyone who joined before the start time is never touched. The last setting
   is what makes the rules, privacy policy, FAQ and home page mention the 24 hour form; it is off until now so the site never
   promises something that is not running. Also paste the welcome text from step 1.5 into Discord at this moment.

Any time you want to see what it would do without doing it, run the dry run command again.

## What is kept, and where

- **On the website:** nothing. No database, no cookies. The sign-in and the form token are signed and expire (15 minutes and
  2 hours). The token is passed in the address fragment and removed from the address bar as soon as the page reads it.
- **In Discord:** the Catalyst role, and one message per completed form in your private channel (name, GitHub username, areas,
  optional website and one line, whether they ticked public listing, and when their deadline was). Delete a message to delete
  that record.
- **On the Legion page:** nobody, automatically. Only people who ticked "Show me on the public Legion page" are eligible. Core
  checks the entry in the private channel and adds one line to `web/lib/legion.ts` (their GitHub username, areas and a note).

## What can go wrong

- **Someone missed the deadline because their messages are closed and they did not see the welcome channel.** They are removed and
  can rejoin. That is the rule; the welcome text above and the site say so before they join.
- **The scheduled job was off for a long time.** Anyone who joined during that time and was not invited within 12 hours is left
  alone and listed under `missed` in the sweep result. Look at it now and then (run the dry run) and message them yourself.
- **"Missing Permissions" in the results.** The bot's role is not above the roles it is changing, or it lacks Kick Members.
- **Listing members fails.** Server Members Intent is off (step 2.3).
- **"invalid redirect_uri" when signing in.** The redirect URL in the Discord application must match exactly (step 2.2).
