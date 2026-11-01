import "server-only";
import { createServiceClient } from "./supabase/server";

// Everyone together: model calls per UTC day. Keeps a bad day (or an attack) from
// running up the bill. Set AI_DAILY_CAP in Vercel to change it.
const GLOBAL_CAP = Number(process.env.AI_DAILY_CAP ?? 20000);

// Per person, per UTC day.
export const LIMITS = {
  twin: 6, // create or rebuild a twin (3 model calls each)
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

// Counts n model calls for everyone together; false once today's total is over the cap.
export async function allowGlobal(n = 1): Promise<boolean> {
  if (n <= 0) return true;
  const { data, error } = await createServiceClient().rpc("bump_usage", { p_key: "ai:all", p_n: n, p_max: GLOBAL_CAP });
  return error ? true : data !== false;
}

export class OverBudget extends Error {
  constructor() {
    super("daily AI limit reached");
  }
}
