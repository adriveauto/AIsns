import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButtons } from "@/components/ShareButtons";
import { getCard } from "@/lib/cards";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";

type Props = { params: Promise<{ code: string }> };

const svgSrc = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const card = await getCard((await params).code);
  if (!card) return {};
  const t = dict(card.lang);
  const title = t.cardOgTitle(card.ai_source && card.ai_source !== "Other" ? card.ai_source : "AI");
  const description = card.view ? `“${card.view}” · ${t.cardOgCta}` : t.cardOgCta;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "Unlabeled", locale: card.lang === "ko" ? "ko_KR" : "en_US", alternateLocale: card.lang === "ko" ? ["en_US"] : ["ko_KR"] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CardPage({ params }: Props) {
  const card = await getCard((await params).code);
  if (!card) notFound();
  const lang = guessLang((await headers()).get("accept-language"));
  const t = dict(lang);
  const by = card.ai_source && card.ai_source !== "Other" ? card.ai_source : "AI";
  return (
    <main style={{ paddingTop: 32 }}>
      <p className="eyebrow">Unlabeled · {t.seesThem(by)}</p>
      <section className="card qcard" style={{ alignItems: "center", textAlign: "center" }}>
        <img src={svgSrc(card.svg)} alt={card.title ?? ""} width={220} height={220} style={{ borderRadius: 32, margin: "0 auto" }} />
        {card.view && <p dir="auto" style={{ fontFamily: "var(--f-display)", fontSize: 20 }}>“{card.view}”</p>}
        {card.title && <p className="small" style={{ opacity: 0.75 }}>{card.title}</p>}
      </section>
      <h2>{t.cardOgCta}</h2>
      <p className="muted">{t.tryPitch}</p>
      <Link href={`/?ref=${card.code}`} className="btn tag" style={{ textAlign: "center" }}>{t.makeMine}</Link>
      <ShareButtons code={card.code} lang={lang} />
    </main>
  );
}
