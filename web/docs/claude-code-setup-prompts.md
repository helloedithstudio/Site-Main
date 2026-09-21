# Prompts for a Claude Code session that has your browser: setting up the join flow

Paste **Prompt 1** into a Claude Code session that can use your browser (Discord and the Discord developer portal). It does
checklist items A1 and A2 (`docs/kevin-todo.md`). **Prompt 2** is optional and does A3 to A6 (GitHub app, database, Vercel
settings, GitHub secrets) the same way. Both are written so the session cannot switch anything on or remove anyone.

The repository is public. The prompts tell the session to keep every secret in a folder outside the repository.

---

## Prompt 1: Discord server and application (A1 and A2)

```text
You are setting up the Discord side of the edith website's "Catalyst join flow". Work carefully and slowly. This changes a real
Discord server, so follow the safety rules exactly.

READ FIRST: D:\page_content\web\docs\onboarding-setup.md (sections 1 and 2) and D:\page_content\web\.env.example. They explain
what the site needs. Do not change any file inside D:\page_content.

WHAT YOU ARE DOING
A website flow will later DM new members a form link, give the "Catalyst" role when they finish, and (only when the owner switches
it on, not now) remove people who do not finish within 24 hours. You are preparing the Discord server and a Discord application
with a bot for that. You are NOT switching anything on.

SAFETY RULES (never break these)
1. Do not kick, ban, mute, DM or message any member. Do not create invite links. Do not delete anything.
2. Do not change any existing role's permissions, name or colour, and do not change any existing channel's permissions, except
   adding the bot's access to the two new channels below.
3. Do not post anything in any existing or public channel. Do not announce the 24 hour rule anywhere. The public wording goes
   live later, on the owner's say.
4. Do not change the server's verification level, enable Community, or change any server setting not listed here. Only REPORT
   the current verification level.
5. Turn on ONLY the "Server Members Intent" for the bot. Leave Presence and Message Content intents off. Keep the bot private
   (Public Bot off) and "Requires OAuth2 Code Grant" off.
6. Never print a token or secret in the chat. Save secrets only to $HOME\edith-secrets\discord.env (create the folder;
   it is outside the repository, which is public). Never write a secret into D:\page_content.
7. If a login, 2FA prompt or captcha appears, stop and ask me to complete it, then continue. If anything is ambiguous, or a role or
   channel with the same name already exists, STOP and ask me before creating or changing anything.

PART A: THE SERVER
1. Open Discord in my browser. If I have more than one server, ask me which is the edith server and confirm its exact name before
   touching anything. Turn on Developer Mode (User Settings, Advanced) so you can copy ids.
2. Roles (Server Settings, Roles):
   - "Catalyst": if it exists, reuse it and change nothing about it. If not, create it with no special permissions.
   - "Pending": create it. No permissions, not hoisted, not mentionable, any dull colour.
   - "Form reminded": create it. No permissions, not hoisted, not mentionable.
3. Ask me which existing roles are staff who must never be removed (for example Core, Maintainer, moderators, admin). Record their
   names and ids. These become the "exempt roles". Do not guess.
4. Channels:
   - Create a PRIVATE text channel "catalyst-forms". Deny View Channel for @everyone. Allow View Channel for the staff roles I
     name as Core (the mediators). Allow the bot (added later in part B) View Channel, Send Messages and Embed Links.
   - Create a public read only text channel "welcome" (or ask me if one already exists that I want to reuse). @everyone may view
     but not send messages. The bot needs View Channel, Send Messages and Embed Links there. Leave it empty: do not post in it.
5. Write the suggested welcome text to $HOME\edith-secrets\welcome-text.txt for later. Do NOT post it anywhere. Text:
   "Within 24 hours of joining you will get a message with a short Catalyst form. You sign in with Discord and GitHub to confirm
   both accounts are yours, then fill it in. Each person has one entry, and very new accounts (Discord under 7 days old, GitHub
   under 30) are turned away; ask a Core member if you are genuine. If the form is not completed in time you are removed from the
   server automatically, and you are welcome to join again."

PART B: THE DISCORD APPLICATION AND BOT (discord.com/developers/applications)
1. Create a New Application named "edith" (if one already exists, ask me whether to reuse it). Note the Application ID.
2. OAuth2 page: reset and copy the Client Secret (shown once). Under Redirects add exactly this and save:
   https://edith-plum.vercel.app/api/join/callback
3. Bot page: add a bot. Reset the token and copy it (shown once). Turn ON "Server Members Intent" only. Public Bot off.
4. Add the bot to the edith server using exactly this link, with the application id filled in (scope bot only):
   https://discord.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot&permissions=268454914
   (268454914 = Manage Roles, Kick Members, View Channels, Send Messages, Embed Links.)
5. Server Settings, Roles: the bot has its own role named "edith". Move it ABOVE "Catalyst", "Pending" and "Form reminded", and
   keep it BELOW every staff role (Core, Maintainer, moderators, admin). Staff above the bot cannot be removed by it, which is
   what I want.
6. Make sure the bot's role can see #catalyst-forms and #welcome (channel permissions), as in Part A.

PART C: SAVE THE VALUES
Write these lines to $HOME\edith-secrets\discord.env (KEY=value, one per line):
DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_GUILD_ID, DISCORD_ROLE_CATALYST, DISCORD_ROLE_PENDING,
DISCORD_ROLE_REMINDED, DISCORD_ROLES_EXEMPT (comma separated ids of the staff roles I named), DISCORD_CHANNEL_FORMS,
DISCORD_CHANNEL_WELCOME.

PART D: VERIFY (read only, plus one test message)
Using the bot token from the file (do not echo it), check each of these with curl or your browser and report pass or fail:
1. GET https://discord.com/api/v10/guilds/GUILD_ID/roles with header "Authorization: Bot TOKEN": 200, and the three roles exist.
2. GET https://discord.com/api/v10/guilds/GUILD_ID/members?limit=3: 200. (A 403 or a privileged intent error means Server Members
   Intent is not on, or the bot is not in the server.)
3. Post one message "setup check" to #catalyst-forms as the bot, confirm it appears, then delete it.
4. Role order: read the roles list and confirm the bot's role position is higher than Catalyst, Pending and Form reminded, and
   lower than every staff role.
5. Open https://discord.com/oauth2/authorize?client_id=APPLICATION_ID&response_type=code&redirect_uri=https%3A%2F%2Fedith-plum.vercel.app%2Fapi%2Fjoin%2Fcallback&scope=identify
   in the browser. It must show Discord's normal "Authorize" screen and NOT an "Invalid OAuth2 redirect_uri" error. Do NOT click
   Authorize. Close it.
6. Report the server's current verification level (do not change it).

FINAL REPORT
Give me a short report: (a) a table of each variable name with its value for the NON secret ones (ids) and "saved to file" for
secrets (bot token, client secret); (b) the pass or fail result of each check in Part D; (c) anything you did not do or were
unsure about; (d) the exact list of things you created or changed. Then stop. Do not do anything else.
```

---

## Prompt 2 (optional): GitHub app, database, Vercel settings, GitHub secrets (A3 to A6)

Use this after Prompt 1, in the same or a new session. It needs to be logged in to GitHub and Vercel in your browser.

```text
You are finishing the setup of the edith website's "Catalyst join flow" (Vercel project for https://edith-plum.vercel.app, GitHub
repository helloedithstudio/Site-Main, site code in its "web" folder). READ FIRST: D:\page_content\web\docs\onboarding-setup.md
(sections 3 to 6) and D:\page_content\web\.env.example. Do not change any file inside D:\page_content. The repository is public:
never put a secret anywhere inside it. The Discord values are already saved in $HOME\edith-secrets\discord.env.

SAFETY RULES (never break these)
1. NEVER set ONBOARDING_START, and NEVER set ONBOARDING_DRY_RUN to anything but true, and NEVER set NEXT_PUBLIC_JOIN_LIVE to
   anything but false. Nothing may be switched on. Do not trigger any run of the sweep other than the read only dry run below.
2. Never print a secret in the chat. Save new secrets to $HOME\edith-secrets\other.env only.
3. If a login, 2FA prompt or captcha appears, stop and ask me. If anything is ambiguous, stop and ask.

STEPS
1. GitHub OAuth App: in GitHub, Settings for the edith organisation if I have owner rights there (otherwise my own account; tell
   me which), Developer settings, OAuth Apps, New OAuth App. Name "edith", Homepage URL https://edith-plum.vercel.app,
   Authorization callback URL exactly https://edith-plum.vercel.app/api/join/github/callback. Leave everything else alone. Copy
   the Client ID, generate a client secret and copy it. Save GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to other.env.
2. Database: in the Vercel dashboard, open the edith project, Storage, add "Upstash for Redis" (free plan) and connect it to the
   project (Production and Preview). Note which environment variable NAMES Vercel added for it (they start with
   UPSTASH_REDIS_REST_ or KV_REST_API_). Do not copy the values anywhere.
3. Generate three separate random strings of 48 letters and digits with a cryptographically secure generator (for example
   PowerShell: -join ((48..57 + 97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ }) run three times, or node crypto).
   Save them to other.env as JOIN_SIGNING_SECRET, CRON_SECRET and JOIN_ID_SECRET. Tell me plainly that JOIN_ID_SECRET must never be
   changed after people have joined and that I should keep a private copy.
4. Vercel settings: in the edith project, Settings, Environment Variables, add these for the Production environment (values from
   discord.env and other.env; do not print them): DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_GUILD_ID,
   DISCORD_ROLE_CATALYST, DISCORD_ROLE_PENDING, DISCORD_ROLE_REMINDED, DISCORD_ROLES_EXEMPT, DISCORD_CHANNEL_FORMS,
   DISCORD_CHANNEL_WELCOME, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JOIN_SIGNING_SECRET, CRON_SECRET, JOIN_ID_SECRET.
   Also add these exact values: ONBOARDING_DRY_RUN=true, NEXT_PUBLIC_JOIN_LIVE=false, ONBOARDING_HOURS=24,
   NEXT_PUBLIC_ONBOARDING_HOURS=24, NEXT_PUBLIC_JOIN_MIN_DISCORD_DAYS=7, NEXT_PUBLIC_JOIN_MIN_GITHUB_DAYS=30.
   Do NOT add ONBOARDING_START. Mark the secret ones as Sensitive if Vercel offers it. Then redeploy the latest production
   deployment and wait until it is Ready.
5. GitHub secrets: in the repository helloedithstudio/Site-Main, Settings, Secrets and variables, Actions, add repository secrets
   SWEEP_URL = https://edith-plum.vercel.app/api/join/sweep and CRON_SECRET = the same value as on Vercel.
6. Read only check: run the dry run with the CRON_SECRET from other.env (do not echo it):
   curl -X POST -H "Authorization: Bearer CRON_SECRET" "https://edith-plum.vercel.app/api/join/sweep?dry=1"
   Expect JSON with "dryRun":true and a note that ONBOARDING_START is not set. If you get a "missing" list, report exactly which
   settings are missing. Also open https://edith-plum.vercel.app/join and confirm it loads.

FINAL REPORT
A short report: which steps passed, the exact JSON the dry run returned (it contains no secrets), which Vercel variables you
added (names only), and anything unsure. Then stop. Do not do anything else.
```
