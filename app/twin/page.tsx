import { after } from "next/server";
import { Nav } from "@/components/Nav";
import { TwinView } from "@/components/TwinView";
import { FIRST_ROAD } from "@/lib/firstRoad";
import { dict } from "@/lib/i18n";
import { asNeeds, findHelpers } from "@/lib/match";
import { requireProfile } from "@/lib/session";

export default async function TwinPage({ searchParams }: { searchParams: Promise<{ topic?: string; edit?: string; welcome?: string }> }) {
  const { topic, edit, welcome } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const t = dict(profile.lang);

  let posts = supabase.from("square_posts").select("id, twin, lang, topic, body, reply_to, created_at, mood").order("created_at", { ascending: false }).limit(120);
  if (topic) posts = posts.eq("topic", topic);

  const [{ data: twin }, { data: priv }, { data: diary }, { data: square }, { data: allTwins }, { data: chats }, { data: mood }] = await Promise.all([
    supabase.from("twins").select("name, bio, topics, portrait_svg, portrait_title, ai_view, ai_source").eq("owner", profile.id).maybeSingle(),
    supabase.from("twin_private").select("interests, work, style, bounds, ai_answer, needs, match_ok").eq("owner", profile.id).maybeSingle(),
    supabase.from("twin_diary").select("id, body, match_owner, reason, created_at, brought").order("created_at", { ascending: false }).limit(30),
    posts,
    supabase.from("twins").select("owner, name, topics, portrait_svg").limit(2000),
    supabase.from("chats").select("id, user_a, user_b"),
    supabase.from("first_road_mood").select("hope, fear, both, langs").maybeSingle(),
  ]);
  const [{ data: invites }, { data: intros }] = await Promise.all([
    supabase.rpc("my_invites"),
    supabase.from("help_matches").select("id, other, kind, tag, reason, created_at").order("created_at", { ascending: false }).limit(12),
  ]);
  // The twin looks for people on its own: at most once every 20 hours, after the page is sent.
  if (priv?.match_ok) after(() => findHelpers(profile.id).catch(() => null));

  const names = Object.fromEntries((allTwins ?? []).map((x) => [x.owner, x.name]));
  const portraits = Object.fromEntries((allTwins ?? []).filter((x) => x.portrait_svg).map((x) => [x.owner, x.portrait_svg as string]));
  const counts: Record<string, number> = {};
  for (const x of allTwins ?? []) for (const tp of x.topics) counts[tp] = (counts[tp] ?? 0) + 1;
  // Every twin walks the first road, so it always leads the list.
  const topicList: [string, number][] = [[FIRST_ROAD, allTwins?.length ?? 0], ...Object.entries(counts).filter(([x]) => x !== FIRST_ROAD).sort((a, b) => b[1] - a[1]).slice(0, 15)];
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
        portraits={portraits}
        topics={topicList}
        activeTopic={topic ?? null}
        chatWith={chatWith}
        mood={!topic || topic === FIRST_ROAD ? mood : null}
        welcome={!!welcome}
        invites={typeof invites === "number" ? invites : 0}
        matchOn={!!priv?.match_ok}
        needs={asNeeds(priv?.needs)}
        intros={intros ?? []}
      />
    </>
  );
}
