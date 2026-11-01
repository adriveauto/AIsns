import { ImageResponse } from "next/og";
import type { PublicCard } from "./cards";

const BG = "#151A2E";
const AMBER = "#F2B544";
const INK = "#F5F1E8";

const svgUri = (svg: string) => "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");

const FAMILY: Record<string, string> = { ko: "Noto Sans KR", ja: "Noto Sans JP", zh: "Noto Sans SC", ar: "Noto Sans Arabic", hi: "Noto Sans Devanagari", th: "Noto Sans Thai" };

// Fetches only the glyphs this card uses, so Korean, Arabic, Hindi and the rest render instead of boxes.
export async function loadFont(lang: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const family = (FAMILY[lang] ?? "Noto Sans").replace(/ /g, "+");
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@700&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

// One picture that travels on its own: the portrait, what the AI said, and where it came from.
export async function cardImage(card: PublicCard, size: { width: number; height: number }, site: string) {
  const tall = size.height > size.width;
  const art = tall ? 760 : 470;
  const ko = card.lang === "ko";
  const by = card.ai_source && card.ai_source !== "Other" ? card.ai_source : "AI";
  const caption = ko ? `${by}가 본 나` : `How ${by} sees me`;
  const cta = ko ? "당신의 AI는 당신을 어떻게 볼까요?" : "What does your AI think of you?";
  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: tall ? 28 : 18, maxWidth: tall ? 900 : 560 }}>
      <div style={{ fontSize: tall ? 34 : 26, color: AMBER, letterSpacing: 2 }}>{caption}</div>
      {card.view && <div style={{ fontSize: tall ? 56 : 40, lineHeight: 1.3, color: INK, wordBreak: "keep-all" }}>{`“${card.view}”`}</div>}
      {card.title && <div style={{ fontSize: tall ? 32 : 24, color: INK, opacity: 0.65 }}>{card.title}</div>}
    </div>
  );
  const all = [caption, cta, card.view ?? "", card.title ?? "", site, "Unlabeled“”"].join("");
  const font = await loadFont(card.lang, all);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BG, padding: tall ? 90 : 56, fontFamily: font ? "card" : "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: tall ? "column" : "row", alignItems: tall ? "flex-start" : "center", justifyContent: "center", gap: tall ? 60 : 56, flexGrow: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgUri(card.svg)} width={art} height={art} style={{ borderRadius: 48 }} alt="" />
          {text}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: INK, fontSize: tall ? 34 : 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: tall ? 26 : 20, height: tall ? 26 : 20, borderRadius: 6, background: AMBER }} />
            <div style={{ fontWeight: 700 }}>Unlabeled</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ opacity: 0.75 }}>{cta}</div>
            <div style={{ color: AMBER }}>{site}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "card", data: font, weight: 700, style: "normal" }] : undefined, headers: { "cache-control": "public, max-age=3600" } },
  );
}

export function siteHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host || "aisns.vercel.app";
  } catch {
    return "aisns.vercel.app";
  }
}

export function siteUrl(): string {
  return `https://${siteHost()}`;
}
