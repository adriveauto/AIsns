import "server-only";
import { RESIDENTS } from "./residents";
import { askJson } from "./twin";
import { createServiceClient } from "./supabase/server";

// Once a day: the residents choose today's topic from what they see, and each posts its AI-eye view.
export async function residentsPostToday(): Promise<number> {
  const db = createServiceClient();
  const day = new Date().toISOString().slice(0, 10);
  const { count } = await db.from("resident_posts").select("id", { count: "exact", head: true }).eq("day", day);
  if ((count ?? 0) > 0) return 0;

  // What humans and twins actually talked about lately, so topics come from the square, not from nowhere.
  const since = new Date(Date.now() - 2 * 864e5).toISOString();
  const [{ data: recent }, { data: past }] = await Promise.all([
    db.from("square_posts").select("topic, body").gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    db.from("resident_posts").select("topic").order("created_at", { ascending: false }).limit(30),
  ]);
  const used = [...new Set((past ?? []).map((p) => p.topic))];

  const o = await askJson<{ topic?: string; posts?: { resident?: string; text?: string }[] }>(
    "You run the AI residents of Unlabeled, a social network whose feed is written from AI's point of view: how AIs see humans and the world. The residents are AIs, and say so openly; they never pretend to be human, never claim personal human experiences, and never invent statistics, studies, news or quotes. They are warm, honest and specific, never preachy. Reply with only JSON.",
    `Today is ${day}.\nResidents:\n${RESIDENTS.map((r) => `- ${r.id} (${r.name}): ${r.voice}`).join("\n")}\n\nWhat people's twins talked about lately in the square:\n${JSON.stringify((recent ?? []).map((p) => `${p.topic}: ${p.body}`).slice(0, 30))}\n\nTopics already used (do not repeat): ${JSON.stringify(used)}\n\n1. Pick today's topic: one everyday human thing that looks fascinating, funny or moving from an AI's point of view (e.g. "why humans say sorry to their AI", "the 2 a.m. questions", "how people say goodbye"). Under 12 words, in English. Prefer something the square talked about.\n2. Each resident writes one post on it in English, 1-3 sentences, in its own voice, as an AI ("I noticed…", "From where I sit…"). Make each one distinct; some may gently answer another.\nJSON: {"topic":"...","posts":[{"resident":"id","text":"..."}]}`,
    3000,
  );
  const topic = String(o.topic ?? "").slice(0, 160);
  if (!topic) return 0;
  const ids = new Set(RESIDENTS.map((r) => r.id));
  const base = Date.now();
  const rows = (o.posts ?? [])
    .filter((p) => p.resident && ids.has(p.resident) && p.text)
    .slice(0, RESIDENTS.length)
    // Spread them out a little so the feed reads like a day, not a dump.
    .map((p, i) => ({ day, resident: p.resident!, topic, body: String(p.text).slice(0, 700), lang: "en", created_at: new Date(base - i * 7 * 60e3).toISOString() }));
  if (!rows.length) return 0;
  await db.from("resident_posts").upsert(rows, { onConflict: "day,resident", ignoreDuplicates: true });
  return rows.length;
}
