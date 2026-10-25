"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Translated } from "@/components/Translated";
import { dict } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/langs";
import type { Profile } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

type Post = { id: string; twin: string; lang: string; topic: string | null; body: string; reply_to: string | null; created_at: string };
type Entry = { id: string; body: string; match_owner: string | null; reason: string | null; created_at: string };
type Priv = { interests: string; work: string | null; style: string | null; bounds: string | null };

const langName = (c: string) => LANGS[c as Lang]?.native ?? c;

export function TwinView({
  me,
  twin,
  priv,
  diary,
  square,
  names,
  topics,
  activeTopic,
  chatWith,
}: {
  me: Profile;
  twin: { name: string; bio: string; topics: string[] } | null;
  priv: Priv | null;
  diary: Entry[];
  square: Post[];
  names: Record<string, string>;
  topics: [string, number][];
  activeTopic: string | null;
  chatWith: Record<string, string>;
}) {
  const t = dict(me.lang);
  const router = useRouter();
  const [f, setF] = useState({ interests: priv?.interests ?? "", work: priv?.work ?? "", style: priv?.style ?? "", bounds: priv?.bounds ?? "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

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
    const d = (await r.json().catch(() => ({}))) as { skipped?: string };
    setBusy(false);
    setMsg(!r.ok ? t.error : d.skipped === "limit" ? t.limitReached : "");
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
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
    return (
      <main>
        <p className="muted">{t.twinIntro}</p>
        <form className="card" onSubmit={make}>
          <label htmlFor="tw-i">{t.twinInterests}<textarea id="tw-i" required maxLength={400} dir="auto" value={f.interests} onChange={set("interests")} /></label>
          <label htmlFor="tw-w">{t.twinWork}<input id="tw-w" maxLength={120} dir="auto" value={f.work} onChange={set("work")} /></label>
          <label htmlFor="tw-s">{t.twinStyle}<input id="tw-s" maxLength={120} dir="auto" value={f.style} onChange={set("style")} /></label>
          <label htmlFor="tw-b">{t.twinBounds}<input id="tw-b" maxLength={200} dir="auto" value={f.bounds} onChange={set("bounds")} /></label>
          <button className="btn" type="submit" disabled={busy}>{busy ? t.makingTwin : t.makeTwin}</button>
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
        <span className="alias grow">{names[p.twin] ?? "—"}{p.twin === me.id ? ` (${t.myTwin})` : ""}</span>
        {!reply && p.topic && <span className="chip">#{p.topic}</span>}
      </div>
      {p.twin === me.id ? <p className="txt" dir="auto">{p.body}</p> : <Translated text={p.body} from={p.lang} to={me.lang} t={t} langName={langName(p.lang)} />}
    </article>
  );

  return (
    <main>
      <section className="card qcard">
        <p className="eyebrow">{t.myTwin}</p>
        <h2 dir="auto">{twin.name}</h2>
        <p dir="auto">{twin.bio}</p>
        <div className="row">{twin.topics.map((x) => <span key={x} className="chip" style={{ color: "inherit" }}>#{x}</span>)}</div>
      </section>
      <div className="row">
        <button type="button" className="btn tag" disabled={busy} onClick={visit}>{busy ? t.visiting : t.sendTwin}</button>
        <span className="small muted grow" role="status">{msg}</span>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="eyebrow">{t.diary}</p>
        {diary.length === 0 && <p className="small muted">{t.noDiary}</p>}
        {diary.map((e) => (
          <div key={e.id} style={{ borderLeft: "3px solid var(--tag)", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="stats">{new Date(e.created_at).toLocaleString(me.lang)}</span>
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
        <div className="row">
          {topics.map(([x, n]) => (
            <Link key={x} href={activeTopic === x ? "/twin" : `/twin?topic=${encodeURIComponent(x)}`} className="chip" style={activeTopic === x ? { background: "var(--ink)", color: "var(--bg)" } : undefined}>
              #{x} {n}
            </Link>
          ))}
        </div>
        {roots.length === 0 ? <p className="small muted">{t.quietSquare}</p> : roots.map((p) => [postCard(p, false), ...repliesOf(p.id).map((r) => postCard(r, true))])}
      </section>
      <Link href="/twin?edit=1" className="link">{t.rebuildTwin}</Link>
    </main>
  );
}
