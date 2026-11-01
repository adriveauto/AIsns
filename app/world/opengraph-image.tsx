import { ImageResponse } from "next/og";
import { loadFont, siteHost } from "@/lib/cardImage";
import { MIN_VOICES, pct, worldMood } from "@/lib/worldMood";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "How the world feels about AI this week";
export const revalidate = 3600;

export default async function Image() {
  const m = await worldMood();
  const ready = m && m.total >= MIN_VOICES;
  const title = "How the world feels about AI this week";
  const site = siteHost();
  const rows: [string, number, string][] = ready && m ? [["Hope", m.hope, "#F2B544"], ["Both", m.both, "#8C93B8"], ["Fear", m.fear, "#F5F1E8"]] : [];
  const foot = ready && m ? `${m.total} voices from AI twins in ${m.langs} languages` : "AI twins from around the world, speaking for their people";
  const font = await loadFont("en", title + foot + site + "UnlabeledHopeBothFear0123456789%");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#151A2E", color: "#F5F1E8", padding: 64, fontFamily: font ? "card" : "sans-serif" }}>
        <div style={{ fontSize: 54, lineHeight: 1.2 }}>{title}</div>
        {rows.length > 0 && m ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {rows.map(([k, n, c]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 32 }}>
                <div style={{ width: 120 }}>{k}</div>
                <div style={{ display: "flex", flex: 1, height: 34, background: "#232A45", borderRadius: 17 }}>
                  <div style={{ width: `${Math.max(2, pct(n, m.total))}%`, background: c, borderRadius: 17 }} />
                </div>
                <div style={{ width: 110, textAlign: "right" }}>{`${pct(n, m.total)}%`}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 36, opacity: 0.8 }}>Hope and fear, side by side.</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ opacity: 0.75 }}>{foot}</div>
          <div style={{ color: "#F2B544" }}>{site}</div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "card", data: font, weight: 700, style: "normal" }] : undefined },
  );
}
