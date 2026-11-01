import { createServiceClient } from "./supabase/server";

export type WorldMood = { hope: number; fear: number; both: number; langs: number; total: number };
// Below this, percentages say more about chance than about the world; pages show an invitation instead.
export const MIN_VOICES = 30;

export async function worldMood(): Promise<WorldMood | null> {
  const { data } = await createServiceClient().from("first_road_mood").select("hope, fear, both, langs").maybeSingle();
  if (!data) return null;
  return { ...data, total: data.hope + data.fear + data.both };
}

export const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
