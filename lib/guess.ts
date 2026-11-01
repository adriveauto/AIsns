import { askJson } from "./twin";
import { LANGS, isLang } from "./langs";
import { questionFor, todayUtc } from "./questions";
import { createServiceClient } from "./supabase/server";

export type Verdict = "right" | "close" | "wrong";
export const isVerdict = (v: unknown): v is Verdict => v === "right" || v === "close" || v === "wrong";

// How well the twin knows its owner, from the last 30 marked guesses. Null until 3 are marked.
export async function knowsYou(owner: string): Promise<{ pct: number; days: number } | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("twin_guesses")
    .select("verdict")
    .eq("owner", owner)
    .not("verdict", "is", null)
    .order("day", { ascending: false })
    .limit(30);
  const rows = data ?? [];
  if (rows.length < 3) return rows.length ? { pct: -1, days: rows.length } : null;
  const score = rows.reduce((s, r) => s + (r.verdict === "right" ? 1 : r.verdict === "close" ? 0.5 : 0), 0);
  return { pct: Math.round((score / rows.length) * 100), days: rows.length };
}

// Today's guess, made once per owner per day. The twin learns from past answers and how its guesses were marked.
export async function todaysGuess(owner: string): Promise<string | null> {
  const db = createServiceClient();
  const day = todayUtc();
  const { data: have } = await db.from("twin_guesses").select("guess").eq("owner", owner).eq("day", day).maybeSingle();
  if (have) return have.guess;

  const [{ data: priv }, { data: twin }, { data: past }, { data: marks }] = await Promise.all([
    db.from("twin_private").select("interests, work, style, ai_answer").eq("owner", owner).maybeSingle(),
    db.from("twins").select("name, lang").eq("owner", owner).maybeSingle(),
    db.from("answers").select("day, body").eq("author", owner).order("day", { ascending: false }).limit(8),
    db.from("twin_guesses").select("day, guess, verdict").eq("owner", owner).not("verdict", "is", null).order("day", { ascending: false }).limit(5),
  ]);
  if (!priv || !twin) return null;
  const l = isLang(twin.lang) ? LANGS[twin.lang].english : "English";
  const history = (past ?? []).map((a) => `Q: ${questionFor(a.day)}\nThey answered: ${a.body}`).join("\n\n");
  const feedback = (marks ?? []).map((g) => `You guessed "${g.guess}" and they said: ${g.verdict}`).join("\n");

  const o = await askJson<{ guess?: string }>(
    "You are someone's AI twin on Unlabeled. Each day everyone on Earth answers one question. Before your owner answers, you guess what they will say, in their own voice, so they can tap 'that's me' or correct you. Be specific and personal, never generic, but never invent private facts like names, places, employers or ages. Reply with only JSON.",
    `What their own AI said about them:\n${(priv.ai_answer || "(none)").slice(0, 1500)}\nInterests: ${priv.interests}\nField: ${priv.work || "-"}\nTone: ${priv.style || "-"}\n\nTheir past answers:\n${history || "(none yet)"}\n\nHow your past guesses landed:\n${feedback || "(none yet)"}\n\nToday's question: ${questionFor(day)}\n\nWrite the answer they would most likely post: 1 to 3 sentences, first person, in ${l}, in their tone.\nJSON: {"guess":"..."}`,
    600,
  );
  const guess = String(o.guess ?? "").trim().slice(0, 400);
  if (!guess) return null;
  // Two tabs at once: keep whichever guess landed first.
  await db.from("twin_guesses").upsert({ owner, day, guess }, { onConflict: "owner,day", ignoreDuplicates: true });
  const { data: row } = await db.from("twin_guesses").select("guess").eq("owner", owner).eq("day", day).single();
  return row?.guess ?? guess;
}
