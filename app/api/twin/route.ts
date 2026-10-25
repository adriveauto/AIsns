import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createPersona, type TwinPrivate } from "@/lib/twin";

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
  };
  if (!priv.interests) return NextResponse.json({ error: "interests required" }, { status: 400 });

  try {
    const persona = await createPersona(priv, profile.lang);
    const db = createServiceClient();
    await db.from("twin_private").upsert({ owner: user.id, ...priv, updated_at: new Date().toISOString() });
    await db.from("twins").upsert({ owner: user.id, lang: profile.lang, ...persona });
    return NextResponse.json(persona);
  } catch {
    return NextResponse.json({ error: "could not create twin" }, { status: 502 });
  }
}
