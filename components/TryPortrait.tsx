"use client";

import { useState } from "react";
import { ShareButtons } from "@/components/ShareButtons";
import { SignIn } from "@/components/SignIn";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";

const svgSrc = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
type Result = { code: string; claim: string; svg: string; title: string; view: string };

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

  async function draw(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/try", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ai_answer: answer, ai_source: src, lang }) });
    const d = (await r.json().catch(() => ({}))) as Partial<Result> & { error?: string };
    setBusy(false);
    if (r.ok && d.code) return setRes(d as Result);
    setErr(d.error === "limit" ? t.tryLimit : d.error === "too_short" ? t.tryTooShort : t.error);
  }

  if (res) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card qcard" style={{ alignItems: "center", textAlign: "center" }}>
          <p className="eyebrow">{t.seesMe(src === "Other" ? "AI" : src)}</p>
          <img src={svgSrc(res.svg)} alt={res.title} width={220} height={220} style={{ borderRadius: 32, margin: "0 auto" }} />
          {res.view && <p dir="auto" style={{ fontFamily: "var(--f-display)", fontSize: 20 }}>“{res.view}”</p>}
          {res.title && <p className="small" style={{ opacity: 0.75 }}>{res.title}</p>}
        </div>
        <ShareButtons code={res.code} lang={lang} />
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2>{t.keepTitle}</h2>
          <p className="small">{t.keepPitch}</p>
          <SignIn lang={lang} trial={res.claim} refCode={refCode} />
        </div>
      </section>
    );
  }

  const ais = ["ChatGPT", "Claude", "Gemini", "Other"];
  return (
    <form className="card" onSubmit={draw} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="eyebrow">{t.tryStep1}</p>
      <div className="row">
        {ais.map((x) => (
          <button key={x} type="button" className={src === x ? "btn" : "btn ghost"} onClick={() => setSrc(x)}>{x === "Other" ? t.otherAi : x}</button>
        ))}
      </div>
      <p dir="auto" className="notice" style={{ color: "var(--ink)" }}>{t.portraitQuestion}</p>
      <div>
        <button type="button" className="btn tag" onClick={() => navigator.clipboard.writeText(t.portraitQuestion).then(() => setCopied(true)).catch(() => {})}>
          {copied ? t.copiedGoAsk(src === "Other" ? "AI" : src) : t.copyQuestion}
        </button>
      </div>
      <label htmlFor="try-a" className="eyebrow">{t.tryStep2}
        <textarea id="try-a" required minLength={40} maxLength={4000} rows={6} dir="auto" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t.tryPlaceholder} />
      </label>
      <button className="btn" type="submit" disabled={busy || answer.trim().length < 40}>{busy ? t.drawing : t.drawMe}</button>
      {err && <p className="small muted" role="status">{err}</p>}
      <p className="small muted">{t.tryPrivacy}</p>
    </form>
  );
}
