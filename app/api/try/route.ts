import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { TRIAL_COOKIE, newCode, newToken } from "@/lib/cards";
import { isLang } from "@/lib/langs";
import { createServiceClient } from "@/lib/supabase/server";
import { drawPortrait } from "@/lib/twin";

const PER_IP = 3;
const PER_DAY = Number(process.env.TRIAL_DAILY_CAP ?? 300);
const SOURCES = ["ChatGPT", "Claude", "Gemini", "Other"];

// Draw a portrait of the mind for someone who has not signed up yet.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { ai_answer?: string; ai_source?: string; lang?: string } | null;
  const ai_answer = String(b?.ai_answer ?? "").trim().slice(0, 4000);
  if (ai_answer.length < 40) return NextResponse.json({ error: "too_short" }, { status: 400 });
  const lang = isLang(b?.lang) ? b.lang : "en";
  const ai_source = SOURCES.includes(String(b?.ai_source)) ? String(b?.ai_source) : "Other";

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = createHash("sha256").update(ip + (process.env.CRON_SECRET ?? "")).digest("hex").slice(0, 32);
  const db = createServiceClient();
  const { data: allowed } = await db.rpc("bump_trial", { p_ip: ipHash, p_max: PER_IP, p_global: PER_DAY });
  if (!allowed) return NextResponse.json({ error: "limit" }, { status: 429 });

  try {
    const p = await drawPortrait({ interests: "", work: null, style: null, bounds: null, ai_answer, ai_source }, "", lang);
    const code = newCode();
    const claim = newToken();
    const { error } = await db.from("portrait_cards").insert({ code, claim_token: claim, svg: p.portrait_svg, title: p.portrait_title, view: p.ai_view, ai_source, ai_answer, lang });
    if (error) throw error;
    (await cookies()).set(TRIAL_COOKIE, claim, { maxAge: 60 * 60 * 24 * 7, httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    return NextResponse.json({ code, claim, svg: p.portrait_svg, title: p.portrait_title, view: p.ai_view });
  } catch {
    return NextResponse.json({ error: "draw_failed" }, { status: 502 });
  }
}
