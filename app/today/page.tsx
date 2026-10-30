import { Nav } from "@/components/Nav";
import { TodayView, type AnswerRow } from "@/components/TodayView";
import { dict } from "@/lib/i18n";
import { isAiDay, questionFor, todayUtc } from "@/lib/questions";
import { requireProfile } from "@/lib/session";

export default async function Today() {
  const { supabase, profile } = await requireProfile();
  const t = dict(profile.lang);
  const day = todayUtc();

  // RLS returns other people's answers only once the viewer has answered today.
  const { data: answers } = await supabase
    .from("answers")
    .select("id, author, lang, body, created_at, profiles(alias)")
    .eq("day", day)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: chats } = await supabase.from("chats").select("id, user_a, user_b");
  const chatWith: Record<string, string> = {};
  for (const c of chats ?? []) chatWith[c.user_a === profile.id ? c.user_b : c.user_a] = c.id;

  const rows: AnswerRow[] = (answers ?? []).map((a) => ({
    id: a.id,
    author: a.author,
    lang: a.lang,
    body: a.body,
    alias: (a.profiles as unknown as { alias: string } | null)?.alias ?? "—",
  }));

  return (
    <>
      <Nav t={t} active="today" alias={profile.alias} />
      <TodayView
        me={profile}
        day={day}
        question={questionFor(day)}
        aiDay={isAiDay(day)}
        answers={rows}
        chatWith={chatWith}
      />
    </>
  );
}
