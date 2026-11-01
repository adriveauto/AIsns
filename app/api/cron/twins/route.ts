import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { findHelpers } from "@/lib/match";
import { runVisit } from "@/lib/twin";
import { aiPaused } from "@/lib/usage";

const BATCH = 25;

// Called by Vercel Cron (see vercel.json). Sends twins that have rested 6+ hours.
export async function GET(req: Request) {
  // Without a secret set, "Bearer undefined" would open the door, so refuse outright.
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (aiPaused()) return NextResponse.json({ paused: true });
  const db = createServiceClient();
  // Answers pasted before signing up are kept 7 days at most; the card itself stays shareable.
  const week = new Date(Date.now() - 7 * 86400e3).toISOString();
  await db.from("portrait_cards").update({ ai_answer: null, claim_token: null }).is("owner", null).lt("created_at", week).not("ai_answer", "is", null);
  const cutoff = new Date(Date.now() - 6 * 3600e3).toISOString();
  const { data: due } = await db
    .from("twins")
    .select("owner")
    .or(`last_visit_at.is.null,last_visit_at.lt.${cutoff}`)
    .order("last_visit_at", { ascending: true, nullsFirst: true })
    .limit(BATCH);
  const results = [];
  for (const t of due ?? []) {
    try {
      results.push(await runVisit(t.owner));
    } catch {
      results.push({ error: true });
    }
  }
  // Twins look for people worth meeting on their own; nobody has to search.
  const day = new Date(Date.now() - 20 * 3600e3).toISOString();
  const { data: seekers } = await db.from("twin_private").select("owner").eq("match_ok", true).or(`last_match_at.is.null,last_match_at.lt.${day}`).limit(BATCH);
  let introduced = 0;
  for (const s of seekers ?? []) {
    const r = await findHelpers(s.owner).catch(() => null);
    if (r && "found" in r) introduced += r.found ?? 0;
  }
  return NextResponse.json({ ran: results.length, introduced });
}
