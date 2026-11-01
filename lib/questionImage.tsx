import { ImageResponse } from "next/og";
import { loadFont, siteHost } from "./cardImage";
import { MIN_SHOWN, dayStats } from "./dayStats";
import { todayUtc } from "./questions";

// The question of a day as a picture: link previews, and the daily post a scheduler picks up.
export async function questionImage(size: { width: number; height: number }, day = todayUtc()) {
  const s = await dayStats(day);
  const site = siteHost();
  const tall = size.height > size.width;
  const eyebrow = "Today's question for all of Earth";
  const foot = s.people >= MIN_SHOWN ? `${s.people} people · ${s.langs} languages answered` : "Answer in your language. Read the world in yours.";
  const font = await loadFont("en", eyebrow + s.question + foot + site + "“”");
  const big = tall ? 84 : s.question.length > 70 ? 52 : 64;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#151A2E", color: "#F5F1E8", padding: tall ? 96 : 64, fontFamily: font ? "card" : "sans-serif" }}>
        <div style={{ fontSize: tall ? 40 : 28, color: "#F2B544" }}>{eyebrow}</div>
        <div style={{ fontSize: big, lineHeight: 1.2 }}>{`“${s.question}”`}</div>
        <div style={{ display: "flex", flexDirection: tall ? "column" : "row", justifyContent: "space-between", gap: 16, fontSize: tall ? 36 : 26 }}>
          <div style={{ opacity: 0.8 }}>{foot}</div>
          <div style={{ color: "#F2B544" }}>{site}</div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "card", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
