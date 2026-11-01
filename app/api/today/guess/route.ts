import { NextResponse } from "next/server";
import { isVerdict, knowsYou, todaysGuess } from "@/lib/guess";
import { todayUtc } from "@/lib/questions";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// action "guess": the twin guesses today's answer (once a day). action "mark": the owner says how close it was.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { action?: string; verdict?: unknown } | null;

  if (b?.action === "mark") {
    if (!isVerdict(b.verdict)) return NextResponse.json({ error: "bad verdict" }, { status: 400 });
    const db = createServiceClient();
    await db.from("twin_guesses").update({ verdict: b.verdict }).eq("owner", user.id).eq("day", todayUtc());
    return NextResponse.json({ ok: true, knows: await knowsYou(user.id) });
  }
  if (b?.action === "guess") {
    try {
      const guess = await todaysGuess(user.id);
      if (!guess) return NextResponse.json({ error: "no twin" }, { status: 400 });
      return NextResponse.json({ guess });
    } catch {
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
