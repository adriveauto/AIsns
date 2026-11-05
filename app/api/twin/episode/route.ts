import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// The owner picks tomorrow's mission at the end of today's episode. Can be changed until the next trip.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { day?: string; choice?: number } | null;
  if (!b || typeof b.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.day) || ![0, 1, 2].includes(b.choice as number)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { error } = await createServiceClient().from("twin_episodes").update({ choice: b.choice }).eq("owner", user.id).eq("day", b.day);
  return error ? NextResponse.json({ error: "failed" }, { status: 500 }) : NextResponse.json({ ok: true });
}
