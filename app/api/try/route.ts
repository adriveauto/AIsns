import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { TRIAL_COOKIE, newCode, newToken } from "@/lib/cards";
import { isLang } from "@/lib/langs";
import { createServiceClient } from "@/lib/supabase/server";
import { asNeeds, extractNeeds, overlap } from "@/lib/match";
import { isInappropriate } from "@/lib/moderate";
import { drawPortrait } from "@/lib/twin";
import { allowIp } from "@/lib/usage";

// Free portraits per day, counted per IP across trying and signed-in twin drawings.
const PER_IP = 2;
const PER_DAY = Number(process.env.TRIAL_DAILY_CAP ?? 300);
const SOURCES = ["ChatGPT", "Claude", "Gemini", "Other"];

// Draw a portrait of the mind for someone who has not signed up yet.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { ai_answer?: string; ai_source?: string; lang?: string; agreed?: boolean } | null;
  if (b?.agreed !== true) return NextResponse.json({ error: "consent" }, { status: 400 });
  const ai_answer = String(b?.ai_answer ?? "").trim().slice(0, 4000);
  if (ai_answer.length < 40) return NextResponse.json({ error: "too_short" }, { status: 400 });
  const lang = isLang(b?.lang) ? b.lang : "en";
  const ai_source = SOURCES.includes(String(b?.ai_source)) ? String(b?.ai_source) : "Other";

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = createHash("sha256").update(ip + (process.env.CRON_SECRET ?? "")).digest("hex").slice(0, 32);
  const db = createServiceClient();
  const { data: allowed } = await db.rpc("bump_trial", { p_ip: ipHash, p_max: PER_IP, p_global: PER_DAY });
  if (!allowed || !(await allowIp(ipHash))) return NextResponse.json({ error: "limit" }, { status: 429 });
  if (await isInappropriate(ai_answer)) return NextResponse.json({ error: "blocked" }, { status: 422 });

  try {
    const priv = { interests: "", work: null, style: null, bounds: null, ai_answer, ai_source };
    const [p, needs, stats] = await Promise.all([
      drawPortrait(priv, "", lang),
      extractNeeds(priv, lang).catch(() => null),
      db.rpc("square_stats").then((r) => (Array.isArray(r.data) ? r.data[0] : r.data) as { twins: number; langs: number } | null, () => null),
    ]);
    // How many people who said yes to introductions this person would already match. A real count, never padded.
    let found = 0;
    if (needs) {
      const { data: pool } = await db.from("twin_private").select("needs").eq("match_ok", true).not("needs", "is", null).limit(1000);
      found = (pool ?? []).filter((c) => {
        const n = asNeeds(c.needs);
        return n && overlap(needs, n) >= 3;
      }).length;
    }
    const code = newCode();
    const claim = newToken();
    const { error } = await db.from("portrait_cards").insert({ code, claim_token: claim, svg: p.portrait_svg, title: p.portrait_title, view: p.ai_view, ai_source, ai_answer, lang, needs });
    if (error) throw error;
    (await cookies()).set(TRIAL_COOKIE, claim, { maxAge: 60 * 60 * 24 * 7, httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    return NextResponse.json({ code, claim, svg: p.portrait_svg, title: p.portrait_title, view: p.ai_view, found, stats });
  } catch {
    return NextResponse.json({ error: "draw_failed" }, { status: 502 });
  }
}
