// Handles what Discord sends to /api/discord/interactions: the ping that checks the endpoint, slash commands, and the buttons
// on a nomination. The route has already checked the Ed25519 signature before anything here runs.
//
// Discord wants an answer within 3 seconds, so each action is answered at once with "working on it" and the real work runs
// afterwards (the route hands `work` to Next's after()), then edits that reply with the result. Only the Discord ids in
// PROMOTER_IDS can do anything; everyone else gets a polite, private refusal.

import { discord, type DiscordClient } from "../join/discord";
import { creditNote, demote, listPerson, promote, snooze, unlistPerson, type ActionResult } from "./actions";
import type { PromoteConfig } from "./config";

export type Interaction = {
  type: number;
  token: string;
  guild_id?: string;
  member?: { user?: { id?: string } };
  user?: { id?: string };
  data?: { name?: string; custom_id?: string; options?: { name: string; type: number; value?: unknown }[] };
};

/** `response` goes straight back to Discord; `work`, if any, runs after it has been sent. */
export type Handled = { response: Record<string, unknown>; work?: () => Promise<void> };

const PING = 1;
const COMMAND = 2;
const BUTTON = 3;
const PONG = { type: 1 };
const REPLY = 4;
const DEFER_REPLY = 5;
const DEFER_UPDATE = 6;
const EPHEMERAL = 64; // only the person who pressed sees it

const say = (content: string): Handled => ({ response: { type: REPLY, data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } } } });
const quiet = { parse: [] as string[] };

const failed = "Something went wrong and nothing may have changed. Please try again, and check the server if it keeps happening.";

export function handleInteraction(cfg: PromoteConfig, it: Interaction, deps: { client?: DiscordClient; now?: Date } = {}): Handled {
  if (it.type === PING) return { response: PONG };
  const actor = it.member?.user?.id ?? it.user?.id ?? "";
  if (it.guild_id && it.guild_id !== cfg.guildId) return say("This only works in the edith server.");
  if (!actor || !cfg.promoterIds.includes(actor)) return say("Only the people who run edith's promotions can do that.");
  const now = deps.now ?? new Date();
  const client = () => deps.client ?? discord(cfg);
  const opt = (name: string) => it.data?.options?.find((o) => o.name === name)?.value;
  const text = (name: string) => (typeof opt(name) === "string" ? (opt(name) as string) : "");

  // Slash commands: answer "working on it" (only the person who typed it sees this), then edit it into the result.
  const later = (act: (d: DiscordClient) => Promise<ActionResult>): Handled => ({
    response: { type: DEFER_REPLY, data: { flags: EPHEMERAL } },
    work: async () => {
      const d = client();
      let message = failed;
      try {
        message = (await act(d)).message;
      } catch (e) {
        console.error("[promote] a command failed:", e instanceof Error ? e.message : e);
      }
      await d.editInteraction(it.token, { content: message, allowed_mentions: quiet }).catch((e) => console.error("[promote] could not edit the reply:", e instanceof Error ? e.message : e));
    },
  });

  if (it.type === COMMAND) {
    const id = text("user");
    switch (it.data?.name) {
      case "promote":
        return later((d) => promote(cfg, d, id, actor, now));
      case "demote":
        return later((d) => demote(cfg, d, id, actor, now));
      case "credit":
        return later((d) => creditNote(cfg, d, id, actor, text("reason"), now));
      case "list":
        return later(() => listPerson(cfg, text("github"), now));
      case "unlist":
        return later(() => unlistPerson(cfg, text("github")));
      default:
        return say("I do not know that command.");
    }
  }

  if (it.type === BUTTON) {
    const m = /^promo:(yes|no):(\d{5,25})$/.exec(it.data?.custom_id ?? "");
    if (!m) return say("I do not know that button.");
    const [, choice, target] = m;
    // Pressing a button on the nomination message: acknowledge it, then rewrite the message with the outcome and no buttons.
    return {
      response: { type: DEFER_UPDATE },
      work: async () => {
        const d = client();
        let content = failed;
        let done = false;
        try {
          const r = choice === "yes" ? await promote(cfg, d, target, actor, now) : await snooze(cfg, target, now);
          content = `${r.message}\nDecided by <@${actor}>.`;
          done = r.ok;
        } catch (e) {
          console.error("[promote] a button failed:", e instanceof Error ? e.message : e);
        }
        await d
          .editInteraction(it.token, { content, allowed_mentions: quiet, ...(done ? { components: [] } : {}) })
          .catch((e) => console.error("[promote] could not edit the nomination:", e instanceof Error ? e.message : e));
      },
    };
  }

  return say("I do not know what to do with that.");
}
