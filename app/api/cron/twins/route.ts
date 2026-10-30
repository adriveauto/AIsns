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
