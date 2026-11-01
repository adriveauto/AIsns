import { NextResponse } from "next/server";
import { cardForOwner } from "@/lib/cards";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in person's shareable portrait card code.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const code = await cardForOwner(user.id);
  return code ? NextResponse.json({ code }) : NextResponse.json({ error: "no portrait yet" }, { status: 404 });
}
