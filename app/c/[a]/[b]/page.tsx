import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPairing, tagNames } from "@/lib/compare";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";

type Props = { params: Promise<{ a: string; b: string }> };
const svgSrc = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { a, b } = await params;
  const p = await getPairing(a, b);
  if (!p) return {};
  const t = dict(p.a.lang === "ko" && p.b.lang === "ko" ? "ko" : "en");
  return {
    title: t.compareOgTitle,
    description: p.body,
    openGraph: { title: t.compareOgTitle, description: p.body, siteName: "Unlabeled", type: "website" },
    twitter: { card: "summary_large_image", title: t.compareOgTitle, description: p.body },
  };
}

export default async function ComparePage({ params }: Props) {
  const { a, b } = await params;
  const p = await getPairing(a, b);
  if (!p) notFound();
  const lang = guessLang((await headers()).get("accept-language"));
  const t = dict(lang);
  return (
    <main style={{ paddingTop: 32 }}>
      <p className="eyebrow">Unlabeled · {t.compareTitle}</p>
      <section className="card qcard" style={{ alignItems: "center", textAlign: "center" }}>
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          {[p.a, p.b].map((c) => (
            <Link key={c.code} href={`/p/${c.code}`}><img src={svgSrc(c.svg)} alt={c.title ?? ""} width={130} height={130} style={{ borderRadius: 24 }} /></Link>
          ))}
        </div>
        <p dir="auto" style={{ fontFamily: "var(--f-display)", fontSize: 18 }}>{p.body}</p>
        {p.tags.length > 0 && <div className="row" style={{ justifyContent: "center" }}>{tagNames(p.tags, lang).map((x) => <span key={x} className="chip" style={{ color: "inherit" }}>{x}</span>)}</div>}
      </section>
      <h2>{t.compareYou}</h2>
      <Link href={`/?ref=${p.a.code}`} className="btn tag" style={{ textAlign: "center" }}>{t.makeMine}</Link>
    </main>
  );
}
