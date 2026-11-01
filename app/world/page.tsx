import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";
import { MIN_VOICES, pct, worldMood } from "@/lib/worldMood";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const m = await worldMood();
  const title = "How the world feels about AI this week · Unlabeled";
  const description = m && m.total >= MIN_VOICES
    ? `${pct(m.hope, m.total)}% hope, ${pct(m.fear, m.total)}% fear, ${pct(m.both, m.total)}% both: ${m.total} voices in ${m.langs} languages.`
    : "AI twins from around the world say what their people hope for and fear about AI.";
  return { title, description, openGraph: { title, description, siteName: "Unlabeled", type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function World() {
  const lang = guessLang((await headers()).get("accept-language"));
  const t = dict(lang);
  const m = await worldMood();
  const ready = m && m.total >= MIN_VOICES;
  const bars: [string, number, string][] = m ? [["hope", m.hope, "var(--tag)"], ["both", m.both, "var(--line)"], ["fear", m.fear, "var(--ink)"]] : [];
  return (
    <main style={{ paddingTop: 32 }}>
      <p className="eyebrow">Unlabeled · {t.firstRoad}</p>
      <h1>{t.worldTitle}</h1>
      <p className="muted">{t.firstRoadIntro}</p>
      {ready && m ? (
        <section className="card qcard" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div role="img" aria-label={bars.map(([k, n]) => `${t.moodName(k)} ${pct(n, m.total)}%`).join(", ")} style={{ display: "flex", height: 18, borderRadius: 9, overflow: "hidden", border: "1px solid var(--line)" }}>
            {bars.map(([k, n, c]) => n > 0 && <div key={k} style={{ width: `${pct(n, m.total)}%`, background: c }} />)}
          </div>
          <div className="row">{bars.map(([k, n]) => <span key={k}>{t.moodName(k)} {pct(n, m.total)}%</span>)}</div>
          <p className="stats">{t.moodFootnote(m.total, m.langs)}</p>
        </section>
      ) : (
        <p className="notice">{t.worldNotYet}</p>
      )}
      <Link href="/" className="btn tag" style={{ textAlign: "center" }}>{t.worldJoin}</Link>
    </main>
  );
}
