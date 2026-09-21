// Settings for the Catalyst join flow, read from environment variables on the server only (see docs/onboarding-setup.md).
//
// Safety defaults: nobody is ever removed unless ONBOARDING_START is set (people who joined before it are never touched)
// and ONBOARDING_DRY_RUN is exactly "false". Until then the scheduled job only reports what it would do.

import { brand } from "@/lib/brand";

export type JoinConfig = {
  botToken: string;
  clientId: string;
  clientSecret: string;
  guildId: string;
  roleCatalyst: string;
  rolePending: string;
  channelForms: string;
  /** Optional: a public channel where a person is pinged if their DMs are closed. */
  channelWelcome?: string;
  /** Optional: a hidden role added when the reminder is sent, so it is sent once. */
  roleReminded?: string;
  /** Roles that are never invited or removed (Maintainer, Core, moderators). */
  rolesExempt: string[];
  signingSecret: string;
  cronSecret: string;
  /** ISO time the system was switched on. Only people who joined after it are ever invited or removed. */
  startAt: Date | null;
  hours: number;
  dryRun: boolean;
  apiBase: string;
  siteUrl: string;
  inviteUrl: string;
};

const REQUIRED = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_GUILD_ID",
  "DISCORD_ROLE_CATALYST",
  "DISCORD_ROLE_PENDING",
  "DISCORD_CHANNEL_FORMS",
  "JOIN_SIGNING_SECRET",
  "CRON_SECRET",
] as const;

const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function joinConfig(env: Record<string, string | undefined> = process.env): { ok: true; cfg: JoinConfig } | { ok: false; missing: string[] } {
  const missing: string[] = REQUIRED.filter((k) => !env[k]?.trim());
  if (env.JOIN_SIGNING_SECRET && env.JOIN_SIGNING_SECRET.length < 32) missing.push("JOIN_SIGNING_SECRET (at least 32 characters)");
  if (env.CRON_SECRET && env.CRON_SECRET.length < 24) missing.push("CRON_SECRET (at least 24 characters)");
  if (missing.length) return { ok: false, missing };
  const start = env.ONBOARDING_START ? new Date(env.ONBOARDING_START) : null;
  const hours = Number(env.ONBOARDING_HOURS ?? 24);
  return {
    ok: true,
    cfg: {
      botToken: env.DISCORD_BOT_TOKEN!.trim(),
      clientId: env.DISCORD_CLIENT_ID!.trim(),
      clientSecret: env.DISCORD_CLIENT_SECRET!.trim(),
      guildId: env.DISCORD_GUILD_ID!.trim(),
      roleCatalyst: env.DISCORD_ROLE_CATALYST!.trim(),
      rolePending: env.DISCORD_ROLE_PENDING!.trim(),
      channelForms: env.DISCORD_CHANNEL_FORMS!.trim(),
      channelWelcome: env.DISCORD_CHANNEL_WELCOME?.trim() || undefined,
      roleReminded: env.DISCORD_ROLE_REMINDED?.trim() || undefined,
      rolesExempt: list(env.DISCORD_ROLES_EXEMPT),
      signingSecret: env.JOIN_SIGNING_SECRET!,
      cronSecret: env.CRON_SECRET!,
      startAt: start && !Number.isNaN(start.getTime()) ? start : null,
      hours: Number.isFinite(hours) && hours >= 2 ? hours : 24,
      dryRun: env.ONBOARDING_DRY_RUN?.trim().toLowerCase() !== "false",
      apiBase: (env.DISCORD_API_BASE?.trim() || "https://discord.com/api/v10").replace(/\/$/, ""),
      siteUrl: (env.NEXT_PUBLIC_SITE_URL?.trim() || brand.siteUrl).replace(/\/$/, ""),
      inviteUrl: brand.discord,
    },
  };
}
