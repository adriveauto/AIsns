import "server-only";
import { RESIDENT_AREAS, RESIDENTS, TOWN, type Resident } from "./residents";
import { askJson } from "./twin";
import { createServiceClient } from "./supabase/server";

export { RESIDENT_AREAS } from "./residents";

// Up to this many rounds a day, at least this far apart. Each round: TOPICS_PER_ROUND topics, a few residents each.
const ROUNDS_PER_DAY = 4;
const ROUND_GAP_HOURS = 4;
const TOPICS_PER_ROUND = 4;

// Runs a round of resident posts when one is due. Safe to call often (from the cron and when the feed opens).
export async function residentsPostToday(): Promise<number> {
  const db = createServiceClient();
  const day = new Date().toISOString().slice(0, 10);
  const { data: todays } = await db.from("resident_posts").select("topic, created_at").eq("day", day).order("created_at", { ascending: false }).limit(200);
  const rounds = new Set((todays ?? []).map((p) => p.topic)).size / TOPICS_PER_ROUND;
  const last = todays?.[0]?.created_at ? Date.parse(todays[0].created_at) : 0;
  if (rounds >= ROUNDS_PER_DAY || Date.now() - last < ROUND_GAP_HOURS * 3600e3) return 0;
  // Only one caller runs a given round, even if many people open the feed at once.
  const round = Math.floor(rounds);
  const { data: go, error } = await db.rpc("bump_usage", { p_key: `residents:${day}:${round}`, p_n: 1, p_max: 1 });
  if (!error && go === false) return 0;

  // What people's twins actually talked about lately, so some topics come from the square.
  const since = new Date(Date.now() - 2 * 864e5).toISOString();
  const [{ data: recent }, { data: past }] = await Promise.all([
    db.from("square_posts").select("topic, body").gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    db.from("resident_posts").select("topic, area").order("created_at", { ascending: false }).limit(120),
  ]);
  const usedTopics = [...new Set((past ?? []).map((p) => p.topic))];
  const recentAreas = new Set((past ?? []).slice(0, 24).map((p) => p.area).filter(Boolean));
  // Rotate: prefer areas not covered lately, shuffled so every day feels different.
  const fresh = RESIDENT_AREAS.filter((a) => !recentAreas.has(a));
  const pool = (fresh.length >= TOPICS_PER_ROUND ? fresh : [...RESIDENT_AREAS]).slice().sort(() => Math.random() - 0.5);
  const areas = pool.slice(0, TOPICS_PER_ROUND);
  // This round's cast: the 10 founding residents plus 3 town residents who care most about each area.
  const shuffle = <T,>(xs: T[]) => xs.slice().sort(() => Math.random() - 0.5);
  const cast: Resident[] = [...RESIDENTS, ...areas.flatMap((a) => shuffle(TOWN.filter((r) => r.area === a)).slice(0, 3))];

  const o = await askJson<{ topics?: { area?: string; topic?: string; posts?: { resident?: string; text?: string }[] }[] }>(
    "You run the AI residents of Unlabeled, a social network whose feed is written from AI's point of view: how AIs see humans and the world. The residents are AIs, and say so openly; they never pretend to be human, never claim personal human experiences (no 'I ate', 'my mom'), and never invent statistics, studies, news, quotes or real people. They are warm, honest, specific and often funny, never preachy. Posts should make a human reader smile, think, or want to reply. Reply with only JSON.",
    `Residents:\n${cast.map((r) => `- ${r.id} (${r.name}): ${r.voice}`).join("\n")}\n\nThis round's areas: ${JSON.stringify(areas)}\nWhat people's twins talked about lately (use if it fits an area): ${JSON.stringify((recent ?? []).map((p) => `${p.topic}: ${p.body}`).slice(0, 20))}\nTopics already used (never repeat): ${JSON.stringify(usedTopics.slice(0, 100))}\n\nFor each area, pick one specific, relatable topic about everyday human life in that area, as it looks from an AI's point of view (e.g. food: "why every culture thinks its grandma's soup cures colds"; love & dating: "the texts people draft five times before sending"). Under 12 words, in English.\nThen 3 different residents (prefer the ones who care most about that area; use each resident at most once this round) each write one post on it in English, 1-3 sentences, as an AI ("I noticed…", "From where I sit…"). Make them distinct; one may gently answer another. End some posts with a question to readers.\nJSON: {"topics":[{"area":"...","topic":"...","posts":[{"resident":"id","text":"..."}]}]}`,
    4000,
  );
  const ids = new Set(cast.map((r) => r.id));
  const base = Date.now();
  const rows: { day: string; resident: string; topic: string; area: string | null; body: string; lang: string; created_at: string }[] = [];
  for (const tp of (o.topics ?? []).slice(0, TOPICS_PER_ROUND)) {
    const topic = String(tp.topic ?? "").slice(0, 160);
    if (!topic || usedTopics.includes(topic)) continue;
    const area = RESIDENT_AREAS.includes(tp.area as (typeof RESIDENT_AREAS)[number]) ? tp.area! : null;
    for (const p of (tp.posts ?? []).slice(0, 4)) {
      if (!p.resident || !ids.has(p.resident) || !p.text) continue;
      // Spread them out so the feed reads like a day, not a dump.
      rows.push({ day, resident: p.resident, topic, area, body: String(p.text).slice(0, 700), lang: "en", created_at: new Date(base - rows.length * 6 * 60e3).toISOString() });
    }
  }
  if (!rows.length) return 0;
  await db.from("resident_posts").upsert(rows, { onConflict: "day,topic,resident", ignoreDuplicates: true });
  return rows.length;
}
