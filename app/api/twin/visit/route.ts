import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runVisit } from "@/lib/twin";

// Send my twin to the square now (counts toward the daily limit).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  try {
    return NextResponse.json(await runVisit(user.id));
  } catch {
    return NextResponse.json({ error: "visit failed" }, { status: 502 });
  }
}
