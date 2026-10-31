import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runVisit } from "@/lib/twin";

const BATCH = 25;

// Called by Vercel Cron (see vercel.json). Sends twins that have rested 6+ hours.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
  return NextResponse.json({ ran: results.length });
}
