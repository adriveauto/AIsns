import { NextResponse } from "next/server";
import { asNeeds, extractNeeds, findHelpers } from "@/lib/match";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Twin introductions: turn on or off, correct what the twin understood, or search now.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { action?: string; needs?: unknown } | null;
  const db = createServiceClient();
  const { data: priv } = await db.from("twin_private").select("interests, work, style, bounds, ai_answer, needs").eq("owner", user.id).maybeSingle();
  if (!priv) return NextResponse.json({ error: "make a twin first" }, { status: 400 });

  try {
    if (b?.action === "off") {
      await db.from("twin_private").update({ match_ok: false }).eq("owner", user.id);
      return NextResponse.json({ ok: true });
    }
    if (b?.action === "needs") {
      const needs = asNeeds(b.needs);
      await db.from("twin_private").update({ needs }).eq("owner", user.id);
      return NextResponse.json({ ok: true });
    }
    if (b?.action === "on") {
      let needs = asNeeds(priv.needs);
      if (!needs) {
        const { data: twin } = await db.from("twins").select("lang").eq("owner", user.id).single();
        needs = await extractNeeds(priv, twin?.lang ?? "en");
      }
      await db.from("twin_private").update({ match_ok: true, needs }).eq("owner", user.id);
      return NextResponse.json(await findHelpers(user.id, true));
    }
    if (b?.action === "search") return NextResponse.json(await findHelpers(user.id));
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
