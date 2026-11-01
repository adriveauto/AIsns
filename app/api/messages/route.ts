import { NextResponse } from "next/server";
import { isLang } from "@/lib/langs";
import { isInappropriate } from "@/lib/moderate";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSuspended } from "@/lib/usage";

// Every chat message goes through here: it is checked for sexual content, hate and violence
// before it is saved. Browsers can no longer insert messages directly (migration 0012).
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  if (await isSuspended(user.id)) return NextResponse.json({ error: "suspended" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as { chat_id?: string; body?: string; lang?: string } | null;
  const body = String(b?.body ?? "").trim().slice(0, 800);
  const chatId = String(b?.chat_id ?? "");
  if (!body || !/^[0-9a-f-]{36}$/i.test(chatId)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  // Row-level security returns the chat only to its two members.
  const { data: chat } = await supabase.from("chats").select("id, user_a, user_b").eq("id", chatId).maybeSingle();
  if (!chat) return NextResponse.json({ error: "not found" }, { status: 404 });
  const other = chat.user_a === user.id ? chat.user_b : chat.user_a;
  const db = createServiceClient();
  const { data: blocked } = await db.from("blocks").select("blocker").or(`and(blocker.eq.${user.id},blocked.eq.${other}),and(blocker.eq.${other},blocked.eq.${user.id})`).limit(1);
  if (blocked?.length) return NextResponse.json({ error: "blocked_user" }, { status: 403 });

  if (await isInappropriate(body)) return NextResponse.json({ error: "blocked" }, { status: 422 });

  const { data: profile } = await supabase.from("profiles").select("lang").eq("id", user.id).maybeSingle();
  const lang = isLang(b?.lang) ? b.lang : profile?.lang ?? "en";
  const { data, error } = await db
    .from("messages")
    .insert({ chat_id: chatId, sender: user.id, lang, body })
    .select("id, sender, lang, body, created_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json(data);
}
