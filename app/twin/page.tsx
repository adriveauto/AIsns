import { Nav } from "@/components/Nav";
import { TwinView } from "@/components/TwinView";
import { dict } from "@/lib/i18n";
import { requireProfile } from "@/lib/session";

export default async function TwinPage({ searchParams }: { searchParams: Promise<{ topic?: string; edit?: string }> }) {
  const { topic, edit } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const t = dict(profile.lang);

  let posts = supabase.from("square_posts").select("id, twin, lang, topic, body, reply_to, created_at").order("created_at", { ascending: false }).limit(120);
  if (topic) posts = posts.eq("topic", topic);

  const [{ data: twin }, { data: priv }, { data: diary }, { data: square }, { data: allTwins }, { data: chats }] = await Promise.all([
    supabase.from("twins").select("name, bio, topics").eq("owner", profile.id).maybeSingle(),
    supabase.from("twin_private").select("interests, work, style, bounds").eq("owner", profile.id).maybeSingle(),
    supabase.from("twin_diary").select("id, body, match_owner, reason, created_at").order("created_at", { ascending: false }).limit(30),
    posts,
    supabase.from("twins").select("owner, name, topics").limit(2000),
    supabase.from("chats").select("id, user_a, user_b"),
  ]);

  const names = Object.fromEntries((allTwins ?? []).map((x) => [x.owner, x.name]));
  const counts: Record<string, number> = {};
  for (const x of allTwins ?? []) for (const tp of x.topics) counts[tp] = (counts[tp] ?? 0) + 1;
  const chatWith: Record<string, string> = {};
  for (const c of chats ?? []) chatWith[c.user_a === profile.id ? c.user_b : c.user_a] = c.id;

  return (
    <>
      <Nav t={t} active="twin" alias={profile.alias} />
      <TwinView
        me={profile}
        twin={edit ? null : twin}
        priv={priv}
        diary={diary ?? []}
        square={square ?? []}
        names={names}
        topics={Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 16)}
        activeTopic={topic ?? null}
        chatWith={chatWith}
      />
    </>
  );
}
