import { ImageResponse } from "next/og";
import { loadFont, siteHost } from "@/lib/cardImage";
import { getPairing, tagNames } from "@/lib/compare";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Portrait compatibility on Unlabeled";
const uri = (svg: string) => "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");

export default async function Image({ params }: { params: Promise<{ a: string; b: string }> }) {
  const { a, b } = await params;
  const p = await getPairing(a, b);
  if (!p) return new Response("not found", { status: 404 });
  const ko = p.a.lang === "ko" && p.b.lang === "ko";
  const title = ko ? "두 사람의 AI가 본 궁합" : "What our AIs say about us";
  const tags = tagNames(p.tags, ko ? "ko" : "en").join(" · ");
  const site = siteHost();
  const font = await loadFont(ko ? "ko" : p.a.lang, title + p.body + tags + site + "Unlabeled");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#151A2E", color: "#F5F1E8", padding: 56, gap: 48, alignItems: "center", fontFamily: font ? "card" : "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uri(p.a.svg)} width={240} height={240} style={{ borderRadius: 36 }} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uri(p.b.svg)} width={240} height={240} style={{ borderRadius: 36 }} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
          <div style={{ fontSize: 28, color: "#F2B544" }}>{title}</div>
          <div style={{ fontSize: 36, lineHeight: 1.35, wordBreak: "keep-all" }}>{p.body}</div>
          {tags && <div style={{ fontSize: 24, opacity: 0.7 }}>{tags}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, marginTop: 10 }}>
            <div>Unlabeled</div>
            <div style={{ color: "#F2B544" }}>{site}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "card", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
