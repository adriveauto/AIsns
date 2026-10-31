import { randomBytes } from "node:crypto";
import { createPersona } from "./twin";
import { createServiceClient } from "./supabase/server";

export const TRIAL_COOKIE = "ul_trial";
export const REF_COOKIE = "ul_ref";
export const CODE_RE = /^[a-z0-9]{8}$/;

export function newToken(): string {
  return randomBytes(18).toString("base64url");
}

export function newCode(): string {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(8), (b) => abc[b % abc.length]).join("");
}

export type PublicCard = { code: string; svg: string; title: string | null; view: string | null; ai_source: string | null; lang: string; owner: string | null };

export async function getCard(code: string): Promise<PublicCard | null> {
  if (!CODE_RE.test(code)) return null;
  const { data } = await createServiceClient().from("portrait_cards").select("code, svg, title, view, ai_source, lang, owner").eq("code", code).maybeSingle();
  return data;
}

// The owner's own card, created from their twin's portrait the first time they share.
export async function cardForOwner(owner: string): Promise<string | null> {
  const db = createServiceClient();
  const { data: card } = await db.from("portrait_cards").select("code").eq("owner", owner).maybeSingle();
  const { data: twin } = await db.from("twins").select("portrait_svg, portrait_title, ai_view, ai_source, lang").eq("owner", owner).maybeSingle();
  if (!twin?.portrait_svg) return card?.code ?? null;
  const row = { svg: twin.portrait_svg, title: twin.portrait_title, view: twin.ai_view, ai_source: twin.ai_source, lang: twin.lang };
  if (card) {
    await db.from("portrait_cards").update(row).eq("code", card.code);
    return card.code;
  }
  const code = newCode();
  const { error } = await db.from("portrait_cards").insert({ code, owner, ...row });
  return error ? null : code;
}

// Who invited this person: the owner of the card whose link they arrived from.
export async function inviterOf(ref: string | undefined, self: string): Promise<string | null> {
  if (!ref) return null;
  const card = await getCard(ref);
  return card?.owner && card.owner !== self ? card.owner : null;
}

// Turn a portrait drawn before signing up into the new person's twin, with no extra typing.
export async function claimTrial(token: string | undefined, owner: string, lang: string): Promise<boolean> {
  if (!token || token.length < 20) return false;
  const db = createServiceClient();
  const { data: card } = await db.from("portrait_cards").select("code, owner, svg, title, view, ai_source, ai_answer").eq("claim_token", token).maybeSingle();
  if (!card || card.owner || !card.ai_answer) return false;
  const { data: had } = await db.from("twins").select("owner").eq("owner", owner).maybeSingle();
  if (had) return false;
  const priv = { interests: card.ai_answer.slice(0, 400), work: null, style: null, bounds: null, ai_answer: card.ai_answer };
  const persona = await createPersona(priv, lang);
  await db.from("twin_private").upsert({ owner, ...priv, updated_at: new Date().toISOString() });
  await db.from("twins").upsert({ owner, lang, ...persona, portrait_svg: card.svg, portrait_title: card.title, ai_view: card.view, ai_source: card.ai_source });
  await db.from("portrait_cards").delete().eq("owner", owner);
  await db.from("portrait_cards").update({ owner, ai_answer: null, claim_token: null }).eq("code", card.code);
  return true;
}
