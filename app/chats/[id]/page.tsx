import { notFound } from "next/navigation";
import { ChatRoom } from "@/components/ChatRoom";
import { Nav } from "@/components/Nav";
import { dict } from "@/lib/i18n";
import { requireProfile } from "@/lib/session";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const t = dict(profile.lang);
  const { data: chat } = await supabase.from("chats").select("id, user_a, user_b, created_at").eq("id", id).maybeSingle();
  if (!chat) notFound();
  const otherId = chat.user_a === profile.id ? chat.user_b : chat.user_a;
  const [{ data: other }, { data: messages }, { data: reveals }] = await Promise.all([
    supabase.from("profiles").select("alias, lang").eq("id", otherId).maybeSingle(),
    supabase.from("messages").select("id, sender, lang, body, created_at").eq("chat_id", id).order("id").limit(1000),
    supabase.from("reveals").select("user_id, country, age, job").eq("chat_id", id),
  ]);
  return (
    <>
      <Nav t={t} active="chats" alias={profile.alias} />
      <ChatRoom
        me={profile}
        chatId={id}
        createdAt={chat.created_at}
        otherId={otherId}
        otherAlias={other?.alias ?? "—"}
        otherLang={other?.lang ?? "en"}
        initialMessages={messages ?? []}
        initialReveals={reveals ?? []}
      />
    </>
  );
}
