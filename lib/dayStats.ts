import { questionFor, todayUtc } from "./questions";
import { createServiceClient } from "./supabase/server";

// Below this, a count reads as "empty" rather than "the world"; pages invite instead.
export const MIN_SHOWN = 5;

// Real, aggregate-only numbers for today's question. No answer text ever leaves.
export async function dayStats(day = todayUtc()) {
  const { data } = await createServiceClient().from("answers").select("lang").eq("day", day).limit(5000);
  const rows = data ?? [];
  return { day, question: questionFor(day), people: rows.length, langs: new Set(rows.map((r) => r.lang)).size };
}
