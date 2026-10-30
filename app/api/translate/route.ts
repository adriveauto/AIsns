import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { LANGS, isLang } from "@/lib/langs";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type Item = { text: string; from: string };

const MAX_ITEMS = 20;
const MAX_CHARS = 1200;
const MODEL = process.env.TRANSLATE_MODEL ?? "claude-haiku-5-5";

// Small per-instance limiter; swap for a shared store (e.g. Upstash) when scaling out.
const hits = new Map<string, { n: number; at: number }>();
function allow(userId: string): boolean {
  const now = Date.now();
  const h = hits.get(userId);
  if (!h || now - h.at > 60_000) {
    hits.set(userId, { n: 1, at: now });
    return true;
  }
  h.n += 1;
  return h.n <= 120;
}

const hashOf = (from: string, text: string) =>
  createHash("sha256").update(from + "\u0000" + text).digest("hex");

async function translateOne(text: string, from: string, to: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You translate short messages between strangers on a global social app. Keep the tone, warmth, slang and emoji. Output only the translation, with no notes or quotes.",
      messages: [
        {
          role: "user",
          content: `Translate from ${LANGS[from as keyof typeof LANGS]?.english ?? "the source language"} into ${LANGS[to as keyof typeof LANGS].english}:\n\n${text}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`translate failed: ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  if (!allow(user.id)) return NextResponse.json({ error: "slow down" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { to?: string; items?: Item[] } | null;
  const to = body?.to;
  const items = body?.items;
  if (!isLang(to) || !Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const clean = items.map((i) => ({
    text: String(i?.text ?? "").slice(0, MAX_CHARS),
    from: isLang(i?.from) ? i.from : "en",
  }));

  const admin = createServiceClient();
  const hashes = clean.map((i) => hashOf(i.from, i.text));
  const { data: cached } = await admin
    .from("translations")
    .select("source_hash, body")
    .eq("target_lang", to)
    .in("source_hash", hashes);
  const hit = new Map((cached ?? []).map((r) => [r.source_hash as string, r.body as string]));

  const results = await Promise.all(
    clean.map(async (item, i) => {
      if (item.from === to || !item.text) return item.text;
      const cachedBody = hit.get(hashes[i]);
      if (cachedBody) return cachedBody;
      try {
        const out = await translateOne(item.text, item.from, to);
        if (out) {
          await admin
            .from("translations")
            .upsert({ source_hash: hashes[i], target_lang: to, body: out });
        }
        return out || null;
      } catch {
        return null;
      }
    }),
  );

  return NextResponse.json({ results });
}
