import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse, after } from "next/server";
import { isInappropriate } from "@/lib/moderate";
import { cardForOwner } from "@/lib/cards";
import { extractNeeds } from "@/lib/match";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { allowIp, allowUser } from "@/lib/usage";
import { createPersona, drawPortrait, runVisit, type TwinPrivate } from "@/lib/twin";

// Create or rebuild the signed-in person's twin.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("lang").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "finish onboarding first" }, { status: 400 });

  const b = (await req.json().catch(() => null)) as Partial<TwinPrivate> | null;
  const priv: TwinPrivate = {
    interests: String(b?.interests ?? "").trim().slice(0, 400),
    work: String(b?.work ?? "").trim().slice(0, 120) || null,
    style: String(b?.style ?? "").trim().slice(0, 120) || null,
    bounds: String(b?.bounds ?? "").trim().slice(0, 200) || null,
    ai_answer: String(b?.ai_answer ?? "").trim().slice(0, 4000) || null,
    ai_source: ["ChatGPT", "Claude", "Gemini", "Other"].includes(String(b?.ai_source)) ? String(b?.ai_source) : null,
  };
  if (!priv.interests && priv.ai_answer) priv.interests = priv.ai_answer.slice(0, 400);
  if (!priv.interests) return NextResponse.json({ error: "interests required" }, { status: 400 });
  // Free portraits: 2 a day per person and per IP.
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = createHash("sha256").update(ip + (process.env.CRON_SECRET ?? "")).digest("hex").slice(0, 32);
  if (!(await allowUser(user.id, "twin")) || !(await allowIp(ipHash))) return NextResponse.json({ error: "limit" }, { status: 429 });
  if (await isInappropriate(priv.ai_answer, priv.interests, priv.work, priv.style)) return NextResponse.json({ error: "blocked" }, { status: 422 });

  try {
    const persona = await createPersona(priv, profile.lang);
    // A failed drawing should not block the twin; the owner can redraw later.
    const [portrait, needs] = await Promise.all([
      drawPortrait(priv, persona.name, profile.lang).catch(() => null),
      extractNeeds(priv, profile.lang).catch(() => null),
    ]);
    const db = createServiceClient();
    const { ai_source, ...privRow } = priv;
    await db.from("twin_private").upsert({ owner: user.id, ...privRow, ...(needs ? { needs } : {}), updated_at: new Date().toISOString() });
    await db.from("twins").upsert({ owner: user.id, lang: profile.lang, ...persona, ...(portrait ?? { ai_source }) });
    if (portrait) await cardForOwner(user.id).catch(() => null);
    // A brand-new twin goes out right away; a rebuilt one waits for its usual trips.
    const { count } = await db.from("twin_diary").select("id", { count: "exact", head: true }).eq("owner", user.id);
    if (!count) after(() => runVisit(user.id).catch(() => null));
    return NextResponse.json({ ...persona, portrait: !!portrait });
  } catch {
    return NextResponse.json({ error: "could not create twin" }, { status: 502 });
  }
}
