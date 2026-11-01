import "server-only";
import { createServiceClient } from "./supabase/server";

// Everyone together: model calls per UTC day. Keeps a bad day (or an attack) from
// running up the bill. Set AI_DAILY_CAP in Vercel to change it.
const GLOBAL_CAP = Number(process.env.AI_DAILY_CAP ?? 20000);

// Per person, per UTC day.
export const LIMITS = {
  twin: 2, // create or rebuild a twin, which draws a new portrait (free portraits: 2 a day)
  merge: 20, // merge two recipes
  translate: 1500, // texts actually sent to the model (cached ones are free)
  match: 10, // "search now" for introductions
} as const;

// Counts n uses of `kind` by this person today; false once over their daily cap.
// If the counter table is missing (migration 0011 not run yet) it lets the call through.
export async function allowUser(userId: string, kind: keyof typeof LIMITS, n = 1): Promise<boolean> {
  if (n <= 0) return true;
  const { data, error } = await createServiceClient().rpc("bump_usage", { p_key: `u:${userId}:${kind}`, p_n: n, p_max: LIMITS[kind] });
  return error ? true : data !== false;
}

// Portraits drawn from one IP today (hashed), shared by signed-out tries and signed-in twins.
export const PORTRAITS_PER_IP = 2;
export async function allowIp(ipHash: string): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("bump_usage", { p_key: `ip:${ipHash}:portrait`, p_n: 1, p_max: PORTRAITS_PER_IP });
  return error ? true : data !== false;
}

// Counts n model calls for everyone together; false once today's total is over the cap.
// Emergency stop: set AI_PAUSED=1 in Vercel (then redeploy) and every model call stops,
// including portraits, translation, recipe merges and the twin cron. Safety checks on chat
// messages keep running (they cost well under 1 KRW each).
export const aiPaused = () => process.env.AI_PAUSED === "1";

export async function allowGlobal(n = 1): Promise<boolean> {
  if (aiPaused()) return false;
  if (n <= 0) return true;
  const { data, error } = await createServiceClient().rpc("bump_usage", { p_key: "ai:all", p_n: n, p_max: GLOBAL_CAP });
  return error ? true : data !== false;
}

export class OverBudget extends Error {
  constructor() {
    super("daily AI limit reached");
  }
}

// True when an admin has suspended this account (table from migration 0012; missing table = not suspended).
export async function isSuspended(userId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().from("suspensions").select("user_id").eq("user_id", userId).maybeSingle();
  return !error && !!data;
}
