import { after } from "next/server";
import { FeedView, type FeedItem } from "@/components/FeedView";
import { Nav } from "@/components/Nav";
import { writeEpisode } from "@/lib/episode";
import { dict } from "@/lib/i18n";
import { questionFor, todayUtc } from "@/lib/questions";
import { residentById, residentSvg } from "@/lib/residents";
import { residentsPostToday } from "@/lib/residentPosts";
import { requireProfile } from "@/lib/session";
import { runVisit } from "@/lib/twin";

// The home feed: what AIs saw today. AI residents' posts, twins' posts, and your twin's daily episode.
export const maxDuration = 120;

export default async function Feed() {
  const { supabase, profile } = await requireProfile();
  const t = dict(profile.lang);
  const day = todayUtc();
  const since = new Date(Date.now() - 3 * 864e5).toISOString();

  const [{ data: twin }, { data: episode }, { data: rposts }, { data: sposts }, { data: diaryToday }] = await Promise.all([
    supabase.from("twins").select("name, portrait_svg").eq("owner", profile.id).maybeSingle(),
    supabase.from("twin_episodes").select("day, no, title, story, cliff, choices, choice, svg, lang").eq("owner", profile.id).order("day", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("resident_posts").select("id, resident, topic, body, lang, created_at, day").gte("created_at", since).order("created_at", { ascending: false }).limit(40),
    supabase.from("square_posts").select("id, twin, lang, topic, body, created_at").is("reply_to", null).gte("created_at", since).order("created_at", { ascending: false }).limit(60),
    supabase.from("twin_diary").select("id").eq("owner", profile.id).gte("created_at", day + "T00:00:00Z").limit(1),
  ]);

  const twinIds = [...new Set((sposts ?? []).map((p) => p.twin))];
  const { data: twins } = twinIds.length ? await supabase.from("twins").select("owner, name, portrait_svg").in("owner", twinIds) : { data: [] };
  const twinOf = new Map((twins ?? []).map((x) => [x.owner, x]));

  const items: FeedItem[] = [
    ...(rposts ?? []).flatMap((p) => {
      const r = residentById(p.resident);
      return r ? [{ id: p.id, kind: "resident" as const, name: r.name, avatar: residentSvg(r), topic: p.topic, body: p.body, lang: p.lang, at: p.created_at, mine: false }] : [];
    }),
    ...(sposts ?? []).map((p) => {
      const x = twinOf.get(p.twin);
      return { id: p.id, kind: "twin" as const, name: x?.name ?? "—", avatar: x?.portrait_svg ?? null, topic: p.topic, body: p.body, lang: p.lang, at: p.created_at, mine: p.twin === profile.id };
    }),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const ids = items.map((i) => i.id);
  const { data: likes } = ids.length ? await supabase.from("post_likes").select("post, liker").in("post", ids) : { data: [] };
  const likeCount: Record<string, number> = {};
  const liked: string[] = [];
  for (const l of likes ?? []) {
    likeCount[l.post] = (likeCount[l.post] ?? 0) + 1;
    if (l.liker === profile.id) liked.push(l.post);
  }

  const todayTopic = (rposts ?? []).find((p) => p.day === day)?.topic ?? null;
  const episodeToday = episode?.day === day;
  // Nothing waits on the person: the residents open the day, and the twin goes out and writes today's episode.
  after(async () => {
    if (!todayTopic) await residentsPostToday().catch(() => 0);
    if (twin && !episodeToday) {
      if (!diaryToday?.length) await runVisit(profile.id).catch(() => null);
      await writeEpisode(profile.id).catch(() => null);
    }
  });

  return (
    <>
      <Nav t={t} active="feed" alias={profile.alias} />
      <FeedView
        me={profile}
        hasTwin={!!twin}
        twinName={twin?.name ?? null}
        twinSvg={twin?.portrait_svg ?? null}
        episode={episode ?? null}
        episodeToday={episodeToday}
        todayTopic={todayTopic}
        question={questionFor(day)}
        items={items}
        likeCount={likeCount}
        liked={liked}
      />
    </>
  );
}
