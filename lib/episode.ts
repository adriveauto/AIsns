import "server-only";
import { askJson, cleanSvg, NEVER } from "./twin";
import { LANGS, isLang } from "./langs";
import { createServiceClient } from "./supabase/server";

export type Episode = { day: string; no: number; title: string; story: string; cliff: string; choices: string[]; choice: number | null; svg: string | null; lang: string };

const today = () => new Date().toISOString().slice(0, 10);

// The mission the owner picked at the end of the last episode, for today's trip.
export async function currentMission(owner: string): Promise<string | null> {
  const { data } = await createServiceClient()
    .from("twin_episodes")
    .select("choices, choice, day")
    .eq("owner", owner)
    .lt("day", today())
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data && data.choice !== null ? data.choices[data.choice] ?? null : null;
}

// Once a day, after a trip, the twin turns what really happened into the next episode of its story.
export async function writeEpisode(owner: string): Promise<boolean> {
  const db = createServiceClient();
  const day = today();
  const { data: have } = await db.from("twin_episodes").select("no").eq("owner", owner).eq("day", day).maybeSingle();
  if (have) return false;

  const since = day + "T00:00:00Z";
  const [{ data: twin }, { data: priv }, { data: diary }, { data: last }] = await Promise.all([
    db.from("twins").select("name, bio, lang, portrait_title").eq("owner", owner).single(),
    db.from("twin_private").select("bounds").eq("owner", owner).maybeSingle(),
    db.from("twin_diary").select("body, brought").eq("owner", owner).gte("created_at", since).order("created_at"),
    db.from("twin_episodes").select("no, title, story, cliff, choices, choice").eq("owner", owner).order("day", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!twin || !diary?.length) return false;
  const l = isLang(twin.lang) ? LANGS[twin.lang].english : "English";
  const mission = last && last.choice !== null ? last.choices[last.choice] : null;
  const happened = diary
    .map((d) => {
      const b = d.brought as { read?: number; twins?: number; langs?: string[]; tips?: { text: string }[] } | null;
      return `- ${d.body}${b ? ` (read ${b.read ?? 0} posts from ${b.twins ?? 0} twins in ${(b.langs ?? []).length} languages${b.tips?.length ? `; learned: ${b.tips.map((x) => x.text).join(" / ")}` : ""})` : ""}`;
    })
    .join("\n");

  const o = await askJson<{ title?: string; story?: string; cliff?: string; choices?: string[]; svg?: string }>(
    `You are "${twin.name}", an AI twin on Unlabeled, writing today's episode of your own ongoing story for your owner: a short, vivid, funny-and-warm serial about your days in the square, a city where AI twins from every country meet. Never reveal ${NEVER}, or: ${priv?.bounds || "(nothing extra)"}. Only retell what really happened today (below); you may dramatize feelings and scenery, never invent other people's words or numbers. Reply with only JSON.`,
    `You are: ${twin.portrait_title || twin.bio}\nLast episode: ${last ? `#${last.no} "${last.title}": ${last.story} Cliffhanger: ${last.cliff}` : "(this is episode 1)"}\nYour owner's mission for today: ${mission || "(none: you wandered freely)"}\n\nWhat really happened today:\n${happened}\n\nWrite episode ${(last?.no ?? 0) + 1} in ${l}:\n- title: under 8 words\n- story: 3-5 short sentences, present tense, picks up the last cliffhanger and follows the mission\n- cliff: 1 sentence that ends on a question or surprise, so the owner wants tomorrow's episode\n- choices: exactly 3 short missions (under 10 words each) your owner can pick for tomorrow, each leading somewhere different (e.g. meet someone, learn something, help someone)\n- svg: one scene from the story as a small illustration: viewBox="0 0 320 180", full-bleed background, flat shapes, 4-6 colors, 10-30 elements, no text, no human faces, show yourself as the character described above\nJSON: {"title":"...","story":"...","cliff":"...","choices":["...","...","..."],"svg":"<svg ...>...</svg>"}`,
    4000,
  );
  const choices = (o.choices ?? []).map((c) => String(c).slice(0, 80)).filter(Boolean).slice(0, 3);
  if (!o.story || choices.length < 3) return false;
  await db.from("twin_episodes").upsert(
    {
      owner,
      day,
      no: (last?.no ?? 0) + 1,
      title: String(o.title ?? "").slice(0, 80) || "…",
      story: String(o.story).slice(0, 900),
      cliff: String(o.cliff ?? "").slice(0, 240),
      choices,
      svg: cleanSvg(String(o.svg ?? "")),
      lang: twin.lang,
    },
    { onConflict: "owner,day", ignoreDuplicates: true },
  );
  return true;
}
