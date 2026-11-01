import { TAG_LIST, isTag } from "./areas";
import { LANGS, isLang } from "./langs";
import { createServiceClient } from "./supabase/server";
import { NEVER, askJson, type TwinPrivate } from "./twin";

// One thing the twin understands about its person, tagged with a part of life (see lib/areas.ts).
export type Item = { tag: string; text: string };
export type Needs = { worries: Item[]; offers: Item[]; seeks: Item[]; loves: Item[] };
export const LISTS = ["worries", "offers", "seeks", "loves"] as const;
export const KINDS = ["same_worry", "can_help_you", "you_can_help", "kindred"] as const;
export type Kind = (typeof KINDS)[number];
const SEARCH_EVERY_MS = 20 * 3600e3;

const cleanList = (xs: unknown): Item[] =>
  (Array.isArray(xs) ? xs : [])
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
    .filter((x) => isTag(x.tag) && typeof x.text === "string" && x.text.trim())
    .map((x) => ({ tag: String(x.tag), text: String(x.text).trim().slice(0, 80) }))
    .slice(0, 6);

export function asNeeds(v: unknown): Needs | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const n: Needs = { worries: cleanList(o.worries), offers: cleanList(o.offers), seeks: cleanList(o.seeks), loves: cleanList(o.loves) };
  return LISTS.some((k) => n[k].length) ? n : null;
}

// What the twin understands its person is struggling with, good at, looking for and loves,
// across every part of life. In the person's language so they can read and correct it.
export async function extractNeeds(p: TwinPrivate, lang: string): Promise<Needs | null> {
  const l = isLang(lang) ? LANGS[lang].english : "English";
  const o = await askJson<Partial<Needs>>(
    `You help an AI twin on Unlabeled understand its person in every part of life, so it can introduce them to people with the same worries, people who can help, people they can help, and kindred spirits. Never include ${NEVER}, names of people or companies, or anything the person said never to share. Reply with only JSON.`,
    `What their own AI said about them:\n${p.ai_answer || "(none)"}\nInterests: ${p.interests}\nField: ${p.work || "-"}\nNever share: ${p.bounds || "-"}\n\nTags (use only these ids):\n${TAG_LIST}\n\nFor each list give at most 6 items, each {"tag": one tag id, "text": a short generic phrase in ${l}, 3-10 words}. Only include what the text supports; empty lists are fine.\n- worries: what they struggle with or often worry about\n- offers: what they could genuinely help someone else with\n- seeks: help, partners or people that would make a real difference to them\n- loves: passions, goals and pastimes they would love to share\nJSON: {"worries":[],"offers":[],"seeks":[],"loves":[]}`,
    2000,
  );
  return asNeeds(o);
}

const tagsOf = (xs: Item[]) => new Set(xs.map((x) => x.tag));
const areaOf = (t: string) => t.split(".")[0];

// How promising a pair looks before asking the model: exact tags count more than shared areas.
export function overlap(a: Needs, b: Needs): number {
  const score = (x: Item[], y: Item[]) => {
    const ty = tagsOf(y);
    const ay = new Set([...ty].map(areaOf));
    return x.reduce((s, i) => s + (ty.has(i.tag) ? 3 : ay.has(areaOf(i.tag)) ? 1 : 0), 0);
  };
  return score(a.worries, b.worries) + score(a.seeks, b.offers) + score(a.offers, b.seeks) + score(a.loves, b.loves) + score(a.worries, b.offers);
}

type Pick = { id?: string; kind?: string; tag?: string; reason?: string };

// The twin looks, on its own, through people who also said yes and picks up to three worth meeting.
export async function findHelpers(owner: string, force = false): Promise<{ found: number } | { skipped: string }> {
  const db = createServiceClient();
  const { data: me } = await db.from("twin_private").select("needs, match_ok, last_match_at").eq("owner", owner).maybeSingle();
  const myNeeds = asNeeds(me?.needs);
  if (!me?.match_ok || !myNeeds) return { skipped: "off" };
  if (!force && me.last_match_at && Date.now() - new Date(me.last_match_at).getTime() < SEARCH_EVERY_MS) return { skipped: "recent" };
  await db.from("twin_private").update({ last_match_at: new Date().toISOString() }).eq("owner", owner);

  const [{ data: twin }, { data: blocks }, { data: had }] = await Promise.all([
    db.from("twins").select("name, lang").eq("owner", owner).single(),
    db.from("blocks").select("blocker, blocked").or(`blocker.eq.${owner},blocked.eq.${owner}`),
    db.from("help_matches").select("other").eq("owner", owner),
  ]);
  const skip = new Set<string>([owner, ...(had ?? []).map((h) => h.other), ...(blocks ?? []).map((b) => (b.blocker === owner ? b.blocked : b.blocker))]);
  const { data: pool } = await db.from("twin_private").select("owner, needs").eq("match_ok", true).not("needs", "is", null).order("updated_at", { ascending: false }).limit(1000);
  const cands = (pool ?? [])
    .filter((c) => !skip.has(c.owner))
    .map((c) => ({ id: c.owner, needs: asNeeds(c.needs) }))
    .filter((c): c is { id: string; needs: Needs } => !!c.needs)
    .map((c) => ({ ...c, score: overlap(myNeeds, c.needs) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);
  if (!cands.length || !twin) return { found: 0 };
  const l = isLang(twin.lang) ? LANGS[twin.lang].english : "English";

  const o = await askJson<{ picks?: Pick[] }>(
    `You are "${twin.name}", an AI twin on Unlabeled. You know your person well and, on your own, introduce them to people worth meeting in any part of life. Other people's lists are private: never quote them, and describe any overlap only in broad terms. Never mention ${NEVER}. Reply with only JSON.`,
    `Your person:\n${JSON.stringify(myNeeds)}\n\nPeople who also want introductions (lists may be in any language):\n${JSON.stringify(cands.map((c) => ({ id: c.id, ...c.needs })))}\n\nPick up to 3 people where meeting would really matter, best first. For each give:\n- kind: "same_worry" (they struggle with the same thing), "can_help_you" (they offer what your person needs), "you_can_help" (your person offers what they need) or "kindred" (same passion or goal: a friend, study buddy, co-founder, training partner)\n- tag: the tag id the match is about\n- reason: one warm sentence in ${l} to your person on why, in broad terms\nSkip weak matches; an empty list is fine.\nJSON: {"picks":[{"id":"...","kind":"...","tag":"...","reason":"..."}]}`,
    1200,
  );
  const ids = new Set(cands.map((c) => c.id));
  const rows = (o.picks ?? [])
    .filter((p) => p.id && ids.has(p.id) && KINDS.includes(p.kind as Kind) && p.reason)
    .slice(0, 3)
    .map((p) => ({ owner, other: p.id!, kind: p.kind!, tag: isTag(p.tag) ? p.tag : null, reason: p.reason!.slice(0, 300) }));
  if (rows.length) await db.from("help_matches").upsert(rows, { onConflict: "owner,other", ignoreDuplicates: true });
  return { found: rows.length };
}
