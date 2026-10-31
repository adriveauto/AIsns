import { TAGS, TAG_LIST, isTag } from "./areas";
import { getCard, type PublicCard } from "./cards";
import { LANGS, isLang } from "./langs";
import { asNeeds, type Needs } from "./match";
import { createServiceClient } from "./supabase/server";
import { NEVER, askJson } from "./twin";

export type Pairing = { a: PublicCard; b: PublicCard; body: string; tags: string[] };

async function needsFor(card: PublicCard): Promise<Needs | null> {
  const db = createServiceClient();
  if (card.owner) {
    const { data } = await db.from("twin_private").select("needs").eq("owner", card.owner).maybeSingle();
    return asNeeds(data?.needs);
  }
  const { data } = await db.from("portrait_cards").select("needs").eq("code", card.code).maybeSingle();
  return asNeeds(data?.needs);
}

// Order-independent key, so A-with-B and B-with-A share one result.
const key = (x: string, y: string) => (x < y ? [x, y] : [y, x]);

export async function getPairing(x: string, y: string): Promise<Pairing | null> {
  if (x === y) return null;
  const [a, b] = key(x, y);
  const [ca, cb] = await Promise.all([getCard(a), getCard(b)]);
  if (!ca || !cb) return null;
  const { data } = await createServiceClient().from("pairings").select("body, tags").eq("a", a).eq("b", b).maybeSingle();
  return data ? { a: ca, b: cb, body: data.body, tags: data.tags.filter(isTag) } : null;
}

export async function makePairing(x: string, y: string, lang: string): Promise<Pairing | null> {
  const have = await getPairing(x, y);
  if (have) return have;
  const [a, b] = key(x, y);
  const [ca, cb] = await Promise.all([getCard(a), getCard(b)]);
  if (!ca || !cb || a === b) return null;
  const [na, nb] = await Promise.all([needsFor(ca), needsFor(cb)]);
  const l = isLang(lang) ? LANGS[lang].english : "English";
  const o = await askJson<{ body?: string; tags?: string[] }>(
    `Two AI twins on Unlabeled compare the people they know, for a shareable "portrait compatibility" card. Both lists are private: never quote them or reveal worries, names, ${NEVER}. Speak in broad, warm, playful terms. Reply with only JSON.`,
    `Portrait A: "${ca.title}", "${ca.view}"\nWhat twin A knows (private): ${JSON.stringify(na)}\n\nPortrait B: "${cb.title}", "${cb.view}"\nWhat twin B knows (private): ${JSON.stringify(nb)}\n\nTags:\n${TAG_LIST}\n\nIn ${l}, write 2-3 sentences: what these two would click on, where they differ in a way that helps each other, and one thing they should do together. Also give 1-4 tag ids of the parts of life they share.\nJSON: {"body":"...","tags":["..."]}`,
    800,
  );
  const body = String(o.body ?? "").slice(0, 400);
  if (!body) return null;
  const tags = (o.tags ?? []).filter(isTag).slice(0, 4);
  await createServiceClient().from("pairings").upsert({ a, b, body, tags, lang });
  return { a: ca, b: cb, body, tags };
}

export const tagNames = (tags: string[], lang: string) => tags.map((t) => (lang === "ko" ? TAGS.get(t)?.ko : TAGS.get(t)?.en) ?? t);
