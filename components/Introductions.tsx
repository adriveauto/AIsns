"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { tagLabel } from "@/lib/areas";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";
import type { Item, Needs } from "@/lib/match";

export type Intro = { id: string; other: string; kind: string; tag: string | null; reason: string; created_at: string };
const KIND_ICON: Record<string, string> = { same_worry: "☁", can_help_you: "🤝", you_can_help: "🌱", kindred: "✦" };
const svgSrc = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

// The twin finds people on its own; the person only says yes once, and then just says hello.
export function Introductions({
  lang,
  on,
  needs,
  intros,
  names,
  portraits,
  chatWith,
  meet,
}: {
  lang: Lang;
  on: boolean;
  needs: Needs | null;
  intros: Intro[];
  names: Record<string, string>;
  portraits: Record<string, string>;
  chatWith: Record<string, string>;
  meet: (owner: string) => void;
}) {
  const t = dict(lang);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showNeeds, setShowNeeds] = useState(false);

  async function call(body: object, wait = "") {
    setBusy(true);
    setMsg(wait);
    const r = await fetch("/api/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = (await r.json().catch(() => ({}))) as { found?: number };
    setBusy(false);
    setMsg(!r.ok ? t.error : d.found === 0 ? t.introNoneYet : "");
    router.refresh();
  }

  function drop(list: keyof Needs, item: Item) {
    if (!needs) return;
    call({ action: "needs", needs: { ...needs, [list]: needs[list].filter((x) => x !== item) } });
  }

  if (!on) {
    return (
      <section className="card qcard" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="eyebrow">{t.introTitle}</p>
        <h2 dir="auto">{t.introPitchTitle}</h2>
        <p className="small" dir="auto">{t.introPitch}</p>
        <p className="small" style={{ opacity: 0.75 }} dir="auto">{t.introPrivacy}</p>
        <div><button type="button" className="btn tag" disabled={busy} onClick={() => call({ action: "on" }, t.introLooking)}>{busy ? t.introLooking : t.introTurnOn}</button></div>
        {msg && <p className="small" role="status">{msg}</p>}
      </section>
    );
  }

  const lists: [keyof Needs, string][] = [["worries", t.needWorries], ["seeks", t.needSeeks], ["offers", t.needOffers], ["loves", t.needLoves]];
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="eyebrow">{t.introTitle}</p>
      {intros.length === 0 && <p className="small muted">{msg || t.introWaiting}</p>}
      {intros.map((m) => (
        <article key={m.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="row">
            {portraits[m.other] && <img src={svgSrc(portraits[m.other])} alt="" width={40} height={40} style={{ borderRadius: 10 }} />}
            <span className="alias grow">{names[m.other] ?? "—"}</span>
            <span className="chip">{KIND_ICON[m.kind]} {t.introKind(m.kind)}</span>
          </div>
          {m.tag && <span className="small muted">{tagLabel(m.tag, lang)}</span>}
          <p dir="auto">{m.reason}</p>
          <div><button type="button" className="btn tag" onClick={() => meet(m.other)}>{chatWith[m.other] ? t.continueChat : t.introSayHi}</button></div>
        </article>
      ))}
      <button type="button" className="link small" style={{ textAlign: "left", background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={() => setShowNeeds(!showNeeds)}>
        {t.introWhatTwinKnows}
      </button>
      {showNeeds && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="small muted">{t.introEditHint}</p>
          {lists.map(([k, label]) => (needs?.[k].length ? (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="small" style={{ fontWeight: 600 }}>{label}</span>
              <div className="row">
                {needs[k].map((x) => (
                  <button key={x.tag + x.text} type="button" className="chip" title={t.introRemove} disabled={busy} onClick={() => drop(k, x)} style={{ cursor: "pointer" }}>
                    <span className="muted">{tagLabel(x.tag, lang).split(" · ")[1]}</span>&nbsp;{x.text} ×
                  </button>
                ))}
              </div>
            </div>
          ) : null))}
          <div><button type="button" className="btn ghost" disabled={busy} onClick={() => call({ action: "off" })}>{t.introTurnOff}</button></div>
        </div>
      )}
    </section>
  );
}
