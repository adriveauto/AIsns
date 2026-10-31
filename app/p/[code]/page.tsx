import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/Icons";
import { ShareButtons } from "@/components/ShareButtons";
import { PublicHeader, SiteFooter } from "@/components/SiteChrome";
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
    <>
      <PublicHeader t={t} />
      <main style={{ paddingTop: 40, maxWidth: 520 }}>
        <figure className="portrait-card" style={{ margin: 0, maxWidth: "none" }}>
          <p className="eyebrow">{t.seesThem(by)}</p>
          <img src={svgSrc(card.svg)} alt={card.title ?? ""} width={240} height={240} />
          {card.view && <p className="quote" dir="auto">“{card.view}”</p>}
          {card.title && <p className="small">{card.title}</p>}
          <span className="brandline"><LogoMark /> Unlabeled</span>
        </figure>
        <div className="card" style={{ padding: 24, gap: 14, textAlign: "center", alignItems: "center" }}>
          <h2 className="serif" style={{ fontWeight: 400, fontSize: 32, lineHeight: 1.1 }}>{t.cardOgCta}</h2>
          <p className="muted">{t.tryPitch}</p>
          <Link href={`/?ref=${card.code}#try`} className="btn lg block">{t.makeMine}</Link>
        </div>
        <ShareButtons code={card.code} lang={lang} />
      </main>
      <SiteFooter t={t} />
    </>
  );
}
