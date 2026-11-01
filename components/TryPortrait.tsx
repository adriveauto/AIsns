"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconCopy, IconLock } from "@/components/Icons";
import { ShareButtons } from "@/components/ShareButtons";
import { Consent } from "@/components/Legal";
import { Alert } from "@/components/Modal";
import { SignIn } from "@/components/SignIn";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";

const svgSrc = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
type Result = { code: string; claim: string; svg: string; title: string; view: string; found?: number; stats?: { twins: number; langs: number } | null };

// The first thing anyone sees: ask your own AI how it sees you, paste the answer, get a portrait.
// No account needed. Signing up afterwards turns the portrait into your twin with nothing to type.
export function TryPortrait({ lang, refCode }: { lang: Lang; refCode?: string }) {
  const t = dict(lang);
  const [src, setSrc] = useState("ChatGPT");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [intro, setIntro] = useState(true);
  const [pair, setPair] = useState<{ path: string; body: string } | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [popup, setPopup] = useState("");

  // Arrived from someone's card: compare the two portraits as soon as this one is drawn.
  useEffect(() => {
    if (!res || !refCode || refCode === res.code) return;
    fetch("/api/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ with: refCode, mine: res.code, lang }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.path && setPair(d))
      .catch(() => {});
  }, [res, refCode, lang]);

  async function draw(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setBusy(true);
    setErr("");
    const r = await fetch("/api/try", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ai_answer: answer, ai_source: src, lang, agreed }) });
    const d = (await r.json().catch(() => ({}))) as Partial<Result> & { error?: string };
    setBusy(false);
    if (r.ok && d.code) return setRes(d as Result);
    if (d.error === "blocked") return setPopup(t.blockedContent);
    if (d.error === "limit") return setPopup(t.dailyPortraitLimit);
    setErr(d.error === "too_short" ? t.tryTooShort : t.error);
  }

  if (res) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <figure className="portrait-card" style={{ margin: 0, maxWidth: "none" }}>
          <p className="eyebrow">{t.seesMe(src === "Other" ? "AI" : src)}</p>
          <img src={svgSrc(res.svg)} alt={res.title} width={240} height={240} />
          {res.view && <p className="quote" dir="auto">“{res.view}”</p>}
          {res.title && <p className="small">{res.title}</p>}
        </figure>
        {refCode && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p className="eyebrow">{t.compareTitle}</p>
            {pair ? (
              <>
                <p dir="auto">{pair.body}</p>
                <div><a className="btn tag" href={pair.path}>{t.seeCompare}</a></div>
              </>
            ) : <p className="small muted">{t.comparing}</p>}
          </div>
        )}
        <ShareButtons code={res.code} lang={lang} />
        <div className="card">
          <h2>{t.keepTitle}</h2>
          {!!res.found && (
            <div className="notice" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <strong dir="auto">{t.trialFound(res.found)}</strong>
              <div className="row" aria-hidden="true">
                {Array.from({ length: Math.min(res.found, 3) }, (_, i) => (
                  <div key={i} style={{ width: 44, height: 44, borderRadius: 12, background: "var(--line)", filter: "blur(2px)" }} />
                ))}
              </div>
              <span className="small">{t.trialFoundHint}</span>
            </div>
          )}
          <p className="small">{t.trialWhatTwinDoes}</p>
          <label className="small" style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: "row", fontWeight: 400 }}>
            <input type="checkbox" checked={intro} onChange={(e) => setIntro(e.target.checked)} style={{ marginTop: 1, flex: "none" }} />
            <span>{t.trialIntroOk}</span>
          </label>
          <SignIn lang={lang} trial={res.claim} refCode={refCode} intro={intro} agreed />
        </div>
      </section>
    );
  }

  const ais = ["ChatGPT", "Claude", "Gemini", "Other"];
  return (
    <form className="card try" onSubmit={draw} style={{ padding: 24, gap: 18 }}>
      <Consent lang={lang} checked={agreed} onChange={setAgreed} id="consent-try" />
      <div className="stack" style={{ gap: 10 }}>
        <p className="try-step"><span>1</span>{t.tryStep1.replace(/^1\.\s*/, "")}</p>
        <div className="seg" role="group" aria-label={t.tryStep1}>
          {ais.map((x) => (
            <button key={x} type="button" aria-pressed={src === x} onClick={() => setSrc(x)}>{x === "Other" ? t.otherAi : x}</button>
          ))}
        </div>
      </div>
      <div className="question">
        <p dir="auto">{t.portraitQuestion}</p>
        <button type="button" className="btn tag" onClick={() => navigator.clipboard.writeText(t.portraitQuestion).then(() => setCopied(true)).catch(() => {})}>
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? t.copiedGoAsk(src === "Other" ? "AI" : src) : t.copyQuestion}
        </button>
      </div>
      <label htmlFor="try-a" className="stack" style={{ gap: 10 }}>
        <span className="try-step"><span>2</span>{t.tryStep2.replace(/^2\.\s*/, "")}</span>
        <textarea id="try-a" required minLength={40} maxLength={4000} rows={5} dir="auto" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t.tryPlaceholder} />
      </label>
      <button className="btn lg block" type="submit" disabled={busy || !agreed || answer.trim().length < 40}>{busy ? t.drawing : t.drawMe}</button>
      {err && <p className="notice err" role="status">{err}</p>}
      <p className="small muted" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><IconLock className="inline-ico" />{t.tryPrivacy}</p>
      {popup && <Alert text={popup} ok={t.ok} onClose={() => setPopup("")} />}
    </form>
  );
}
