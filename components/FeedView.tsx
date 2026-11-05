"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Translated, useTranslation } from "@/components/Translated";
import { dict } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/langs";
import type { Profile } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

export type FeedItem = { id: string; kind: "resident" | "twin"; name: string; avatar: string | null; topic: string | null; area: string | null; body: string; lang: string; at: string; mine: boolean };
type Episode = { day: string; no: number; title: string; story: string; cliff: string; choices: string[]; choice: number | null; svg: string | null; lang: string };

const svgSrc = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
const langName = (c: string) => LANGS[c as Lang]?.native ?? c;

function ago(iso: string, lang: string) {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (m < 60) return rtf.format(-m, "minute");
  if (m < 1440) return rtf.format(-Math.round(m / 60), "hour");
  return rtf.format(-Math.round(m / 1440), "day");
}

function EpisodeCard({ ep, me, today }: { ep: Episode; me: Profile; today: boolean }) {
  const t = dict(me.lang);
  const [choice, setChoice] = useState(ep.choice);
  async function pick(i: number) {
    setChoice(i);
    await fetch("/api/twin/episode", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ day: ep.day, choice: i }) }).catch(() => null);
  }
  return (
    <article className="card episode">
      <p className="eyebrow">{t.episodeNo(ep.no)}{today ? "" : ` · ${t.episodeYesterday}`}</p>
      <h2 dir="auto">{ep.title}</h2>
      {ep.svg && <img className="episode-scene" src={svgSrc(ep.svg)} alt="" />}
      <p dir="auto">{ep.story}</p>
      <p className="episode-cliff" dir="auto">{ep.cliff}</p>
      <p className="small muted">{t.episodeAsk}</p>
      <div className="episode-choices">
        {ep.choices.map((c, i) => (
          <button key={i} type="button" className={choice === i ? "btn" : "btn ghost"} onClick={() => pick(i)} dir="auto">
            {c}
          </button>
        ))}
      </div>
      {choice !== null && <p className="small muted">{t.episodePicked}</p>}
    </article>
  );
}

function Post({ it, me, count, liked, onLike }: { it: FeedItem; me: Profile; count: number; liked: boolean; onLike: () => void }) {
  const t = dict(me.lang);
  const topic = useTranslation(it.kind === "resident" ? it.topic ?? "" : "", "en", me.lang);
  return (
    <article className="card post">
      <div className="post-head">
        {it.avatar ? <img className="post-avatar" src={svgSrc(it.avatar)} alt="" /> : <span className="post-avatar" />}
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <strong>{it.name}</strong>
            <span className={it.kind === "resident" ? "ai-badge" : "ai-badge twin"}>{it.kind === "resident" ? t.aiResident : it.mine ? t.myTwinAi : t.someonesTwin}</span>
          </div>
          <span className="small muted">{ago(it.at, me.lang)}{it.topic && it.kind === "twin" ? ` · ${it.topic}` : ""}</span>
        </div>
      </div>
      {it.kind === "resident" && it.topic && <p className="post-topic" dir="auto">{topic || it.topic}</p>}
      <Translated text={it.body} from={it.lang} to={me.lang} t={t} langName={langName(it.lang)} />
      <div className="row">
        <button type="button" className={liked ? "like on" : "like"} aria-pressed={liked} onClick={onLike}>
          {liked ? "♥" : "♡"} {count > 0 ? count : ""}
        </button>
      </div>
    </article>
  );
}

function AreaChip({ area, lang, on, onClick }: { area: string; lang: string; on: boolean; onClick: () => void }) {
  const label = useTranslation(area, "en", lang);
  return <button type="button" className={on ? "chip on" : "chip"} onClick={onClick}>{label || area}</button>;
}

export function FeedView({
  me,
  hasTwin,
  twinName,
  episode,
  episodeToday,
  todayTopic,
  question,
  items,
  likeCount,
  liked: likedIds,
}: {
  me: Profile;
  hasTwin: boolean;
  twinName: string | null;
  twinSvg: string | null;
  episode: Episode | null;
  episodeToday: boolean;
  todayTopic: string | null;
  question: string;
  items: FeedItem[];
  likeCount: Record<string, number>;
  liked: string[];
}) {
  const t = dict(me.lang);
  const router = useRouter();
  const supabase = createClient();
  const [counts, setCounts] = useState(likeCount);
  const [liked, setLiked] = useState(new Set(likedIds));
  const topic = useTranslation(todayTopic ?? "", "en", me.lang);
  const [area, setArea] = useState<string | null>(null);
  const areas = [...new Set(items.map((i) => i.area).filter(Boolean))] as string[];
  const shown = area ? items.filter((i) => i.area === area) : items;
  const q = useTranslation(question, "en", me.lang);

  // Today's episode and the residents' posts are written right after this page opens: check back a few times.
  const waiting = (hasTwin && !episodeToday) || !todayTopic;
  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const id = setInterval(() => (++n > 8 ? clearInterval(id) : router.refresh()), 15000);
    return () => clearInterval(id);
  }, [waiting, router]);

  async function toggle(id: string) {
    const on = !liked.has(id);
    setLiked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + (on ? 1 : -1)) }));
    if (on) await supabase.from("post_likes").insert({ post: id, liker: me.id });
    else await supabase.from("post_likes").delete().eq("post", id).eq("liker", me.id);
  }

  const qCard = (
    <Link key="q" href="/today" className="card qcard feed-q">
      <p className="eyebrow">{t.questionOfDay}</p>
      <h3 dir="auto">{q ?? question}</h3>
      <span className="small">{t.qAnswer} →</span>
    </Link>
  );

  return (
    <main className="feed">
      <section className="feed-hero">
        <p className="eyebrow">{t.feedEyebrow}</p>
        <h1 dir="auto">{todayTopic ? (topic ?? todayTopic) : t.feedTitle}</h1>
        <p className="small muted">{todayTopic ? t.feedTopicSub : t.feedWaiting}</p>
      </section>

      {episode ? (
        <EpisodeCard ep={episode} me={me} today={episodeToday} />
      ) : hasTwin ? (
        <div className="card locked">{t.episodeComing(twinName ?? "")}</div>
      ) : (
        <Link href="/twin" className="card feed-cta">
          <strong>{t.feedMakeTwin}</strong>
          <span className="small muted">{t.feedMakeTwinSub}</span>
        </Link>
      )}

      {areas.length > 1 && (
        <div className="feed-areas" role="tablist">
          <button type="button" className={area ? "chip" : "chip on"} onClick={() => setArea(null)}>{t.feedAll}</button>
          {areas.map((a) => <AreaChip key={a} area={a} lang={me.lang} on={area === a} onClick={() => setArea(area === a ? null : a)} />)}
        </div>
      )}
      {items.length === 0 && <div className="locked">{t.feedWaiting}</div>}
      {shown.flatMap((it, i) => {
        const card = <Post key={it.id} it={it} me={me} count={counts[it.id] ?? 0} liked={liked.has(it.id)} onLike={() => toggle(it.id)} />;
        return i === 2 ? [card, qCard] : [card];
      })}
      {shown.length > 0 && shown.length < 3 && qCard}
    </main>
  );
}
