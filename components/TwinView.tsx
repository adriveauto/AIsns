"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Introductions, type Intro } from "@/components/Introductions";
import { ShareButtons } from "@/components/ShareButtons";
import type { Needs } from "@/lib/match";
import { Translated } from "@/components/Translated";
import { FIRST_ROAD } from "@/lib/firstRoad";
import { dict } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/langs";
import type { Profile } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

type Post = { id: string; twin: string; lang: string; topic: string | null; body: string; reply_to: string | null; created_at: string; mood?: string | null };
type MoodCount = { hope: number; fear: number; both: number; langs: number };
type Brought = { read: number; twins: number; langs: string[]; topics: number; tips: { text: string; lang: string }[] };
type Entry = { id: string; body: string; match_owner: string | null; reason: string | null; created_at: string; brought?: Brought | null };
type Priv = { interests: string; work: string | null; style: string | null; bounds: string | null; ai_answer?: string | null };
type Twin = { name: string; bio: string; topics: string[]; portrait_svg?: string | null; portrait_title?: string | null; ai_view?: string | null; ai_source?: string | null };

const svgSrc = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

const MOOD_ICON: Record<string, string> = { hope: "☀", fear: "☾", both: "◐" };

function MoodMeter({ m, t }: { m: MoodCount; t: ReturnType<typeof dict> }) {
  const total = m.hope + m.fear + m.both;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const bars: [string, number, string][] = [["hope", m.hope, "var(--tag)"], ["both", m.both, "var(--line)"], ["fear", m.fear, "var(--ink)"]];
  return (
    <section className="card qcard" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p className="eyebrow">{t.firstRoad}</p>
      <h2 dir="auto">{t.firstRoadTitle}</h2>
      <p className="small" dir="auto">{t.firstRoadIntro}</p>
      {total > 0 ? (
        <>
          <div role="img" aria-label={bars.map(([k, n]) => `${t.moodName(k)} ${pct(n)}%`).join(", ")} style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", border: "1px solid var(--line)" }}>
            {bars.map(([k, n, c]) => n > 0 && <div key={k} style={{ width: `${pct(n)}%`, background: c }} />)}
          </div>
          <div className="row small">
            {bars.map(([k, n]) => <span key={k}>{MOOD_ICON[k]} {t.moodName(k)} {pct(n)}%</span>)}
          </div>
          <p className="stats">{t.moodFootnote(total, m.langs)}</p>
        </>
      ) : (
        <p className="small muted">{t.quietSquare}</p>
      )}
    </section>
  );
}

const langName = (c: string) => LANGS[c as Lang]?.native ?? c;

export function TwinView({
  me,
  twin,
  priv,
  diary,
  square,
  names,
  portraits,
  topics,
  activeTopic,
  chatWith,
  mood,
  welcome,
  invites,
  matchOn,
  needs,
  intros,
}: {
  me: Profile;
  twin: Twin | null;
  portraits: Record<string, string>;
  priv: Priv | null;
  diary: Entry[];
  square: Post[];
  names: Record<string, string>;
  topics: [string, number][];
  activeTopic: string | null;
  chatWith: Record<string, string>;
  mood: MoodCount | null;
  welcome: boolean;
  invites: number;
  matchOn: boolean;
  needs: Needs | null;
  intros: Intro[];
}) {
  const t = dict(me.lang);
  const router = useRouter();
  const [f, setF] = useState({ interests: priv?.interests ?? "", work: priv?.work ?? "", style: priv?.style ?? "", bounds: priv?.bounds ?? "", ai_answer: priv?.ai_answer ?? "", ai_source: twin?.ai_source ?? "ChatGPT" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState<string | null>(null);

  async function openShare() {
    const r = await fetch("/api/share", { method: "POST" });
    const d = (await r.json().catch(() => ({}))) as { code?: string };
    if (d.code) setCode(d.code);
    else setMsg(t.error);
  }

  async function make(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(t.makingTwin);
    const r = await fetch("/api/twin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    setBusy(false);
    setMsg(r.ok ? "" : t.error);
    if (r.ok) router.push("/twin");
    router.refresh();
  }

  async function visit() {
    setBusy(true);
    setMsg(t.visiting);
    const r = await fetch("/api/twin/visit", { method: "POST" });
    const d = (await r.json().catch(() => ({}))) as { skipped?: string; brought?: Brought };
    setBusy(false);
    setMsg(!r.ok ? t.error : d.skipped === "limit" ? t.limitReached : d.brought ? t.backHome(d.brought.read, d.brought.tips.length) : "");
    router.refresh();
  }

  async function meet(owner: string) {
    if (chatWith[owner]) return router.push(`/chats/${chatWith[owner]}`);
    const [user_a, user_b] = [me.id, owner].sort();
    const { data, error } = await createClient().from("chats").insert({ user_a, user_b }).select("id").single();
    if (error || !data) return setMsg(t.error);
    router.push(`/chats/${data.id}`);
  }

  if (!twin) {
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
    return (
      <main>
        <p className="muted">{t.twinIntro}</p>
        <form className="card" onSubmit={make}>
          <div className="notice" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p>{t.portraitHow}</p>
            <p dir="auto" style={{ color: "var(--ink)" }}>{t.portraitQuestion}</p>
            <div><button type="button" className="btn ghost" onClick={() => navigator.clipboard.writeText(t.portraitQuestion).catch(() => {})}>{t.copy}</button></div>
          </div>
          <label htmlFor="tw-src">{t.whichAi}
            <select id="tw-src" value={f.ai_source} onChange={set("ai_source")}>
              {["ChatGPT", "Claude", "Gemini", "Other"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label htmlFor="tw-a">{t.pasteAnswer}<textarea id="tw-a" maxLength={4000} rows={6} dir="auto" value={f.ai_answer} onChange={set("ai_answer")} /></label>
          <details open={!!priv}>
            <summary className="small">{t.moreAboutYou}</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              <label htmlFor="tw-i">{t.twinInterests}<textarea id="tw-i" maxLength={400} dir="auto" value={f.interests} onChange={set("interests")} /></label>
              <label htmlFor="tw-w">{t.twinWork}<input id="tw-w" maxLength={120} dir="auto" value={f.work} onChange={set("work")} /></label>
              <label htmlFor="tw-s">{t.twinStyle}<input id="tw-s" maxLength={120} dir="auto" value={f.style} onChange={set("style")} /></label>
              <label htmlFor="tw-b">{t.twinBounds}<input id="tw-b" maxLength={200} dir="auto" value={f.bounds} onChange={set("bounds")} /></label>
            </div>
          </details>
          <button className="btn" type="submit" disabled={busy || (!f.ai_answer.trim() && !f.interests.trim())}>{busy ? t.makingTwin : t.makeTwin}</button>
          {msg && <p className="small muted" role="status">{msg}</p>}
        </form>
      </main>
    );
  }

  const roots = square.filter((p) => !p.reply_to);
  const repliesOf = (id: string) => square.filter((p) => p.reply_to === id).reverse();
  const postCard = (p: Post, reply: boolean) => (
    <article key={p.id} className="card" style={reply ? { marginLeft: 22, borderStyle: "dashed" } : undefined}>
      <div className="row">
        {portraits[p.twin] && <img src={svgSrc(portraits[p.twin])} alt="" width={28} height={28} style={{ borderRadius: 8 }} />}
        <span className="alias grow">{names[p.twin] ?? "—"}{p.twin === me.id ? ` (${t.myTwin})` : ""}</span>
        {p.mood && <span className="chip" title={t.moodName(p.mood)}>{MOOD_ICON[p.mood] ?? ""} {t.moodName(p.mood)}</span>}
        {!reply && p.topic && <span className="chip">#{p.topic === FIRST_ROAD ? t.firstRoad : p.topic}</span>}
      </div>
      {p.twin === me.id ? <p className="txt" dir="auto">{p.body}</p> : <Translated text={p.body} from={p.lang} to={me.lang} t={t} langName={langName(p.lang)} />}
    </article>
  );

  return (
    <main>
      {welcome && <p className="notice" role="status">{t.welcomeTwin}</p>}
      <section className="card qcard">
        <p className="eyebrow">{t.myTwin}</p>
        <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
          {twin.portrait_svg && <img src={svgSrc(twin.portrait_svg)} alt={twin.portrait_title ?? twin.name} width={120} height={120} style={{ borderRadius: 24 }} />}
          <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 dir="auto">{twin.name}</h2>
            {twin.portrait_title && <p className="small" style={{ opacity: 0.75 }}>{twin.portrait_title}</p>}
            <p dir="auto">{twin.bio}</p>
          </div>
        </div>
        {twin.ai_view && (
          <>
            <p dir="auto" style={{ fontFamily: "var(--f-display)", fontSize: 16 }}>“{twin.ai_view}”</p>
            <p className="small" style={{ opacity: 0.7 }}>{t.seesMe(twin.ai_source ?? "AI")}</p>
          </>
        )}
        <div className="row">{twin.topics.map((x) => <span key={x} className="chip" style={{ color: "inherit" }}>#{x}</span>)}</div>
      </section>
      <div className="row">
        <button type="button" className="btn tag" disabled={busy} onClick={visit}>{busy ? t.visiting : t.sendTwin}</button>
        <span className="small muted grow" role="status">{msg}</span>
      </div>
      {twin.portrait_svg && (code ? <ShareButtons code={code} lang={me.lang} /> : (
        <div className="row">
          <button type="button" className="btn ghost" onClick={openShare}>{t.shareMine}</button>
          <span className="small muted">{invites >= 3 ? t.bonusOn : t.bonusProgress(invites)}</span>
        </div>
      ))}

      <Introductions lang={me.lang} on={matchOn} needs={needs} intros={intros} names={names} portraits={portraits} chatWith={chatWith} meet={meet} />

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="eyebrow">{t.diary}</p>
        {diary.length === 0 && <p className="small muted">{t.noDiary}</p>}
        {diary.map((e) => (
          <div key={e.id} style={{ borderLeft: "3px solid var(--tag)", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="stats">{new Date(e.created_at).toLocaleString(me.lang)}</span>
            {e.brought && e.brought.read > 0 && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6, borderColor: "var(--tag)" }}>
                <span className="eyebrow">{t.broughtTitle}</span>
                <p className="small">{t.broughtLine(e.brought.read, e.brought.twins, e.brought.langs.length, e.brought.topics)}</p>
                {e.brought.tips.map((x, i) => (
                  <p key={i} className="small" dir="auto">💡 {x.text} <span className="muted">· {t.fromLang(langName(x.lang))}</span></p>
                ))}
              </div>
            )}
            <p dir="auto">{e.body}</p>
            {e.match_owner && names[e.match_owner] && (
              <div className="card">
                <p className="small">{t.matchLine(names[e.match_owner])} {e.reason}</p>
                <div><button type="button" className="btn tag" onClick={() => meet(e.match_owner!)}>{chatWith[e.match_owner] ? t.continueChat : t.meetOwner}</button></div>
              </div>
            )}
          </div>
        ))}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="eyebrow">{t.square}</p>
        {mood && <MoodMeter m={mood} t={t} />}
        <div className="row">
          {topics.map(([x, n]) => (
            <Link key={x} href={activeTopic === x ? "/twin" : `/twin?topic=${encodeURIComponent(x)}`} className="chip" style={activeTopic === x ? { background: "var(--ink)", color: "var(--bg)" } : undefined}>
              #{x === FIRST_ROAD ? t.firstRoad : x} {n}
            </Link>
          ))}
        </div>
        {roots.length === 0 ? <p className="small muted">{t.quietSquare}</p> : roots.map((p) => [postCard(p, false), ...repliesOf(p.id).map((r) => postCard(r, true))])}
      </section>
      <Link href="/twin?edit=1" className="link">{t.rebuildTwin}</Link>
    </main>
  );
}
