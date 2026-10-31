import { ImageResponse } from "next/og";
import { loadFont, siteHost } from "@/lib/cardImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Unlabeled: how does your AI see you?";

export default async function Image() {
  const ko = "매일 쓰는 AI는 나를 어떻게 보고 있을까?";
  const en = "How does the AI you talk to every day see you?";
  const site = siteHost();
  const font = await loadFont("ko", ko + en + site + "Unlabeled");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#151A2E", color: "#F5F1E8", padding: 72, fontFamily: font ? "card" : "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F2B544" }} />
          Unlabeled
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, lineHeight: 1.2, wordBreak: "keep-all" }}>{ko}</div>
          <div style={{ fontSize: 34, opacity: 0.7 }}>{en}</div>
        </div>
        <div style={{ fontSize: 30, color: "#F2B544" }}>{site}</div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "card", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
