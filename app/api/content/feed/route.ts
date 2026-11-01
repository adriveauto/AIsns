import { siteUrl } from "@/lib/cardImage";
import { MIN_SHOWN, dayStats } from "@/lib/dayStats";
import { isAiDay } from "@/lib/questions";
import { MIN_VOICES, pct, worldMood } from "@/lib/worldMood";

// A ready-to-post content feed for schedulers (Metricool, Buffer, IFTTT…): JSON by default, RSS with ?format=rss.
// Only real, aggregate numbers. No user text, no portraits without consent.
export const revalidate = 3600;

type Item = { id: string; kind: "question" | "world"; date: string; link: string; images: Record<string, string>; caption: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(req: Request) {
  const site = siteUrl();
  const items: Item[] = [];
  const now = Date.now();
  for (let i = 0; i < 7; i++) {
    const day = new Date(now - i * 864e5).toISOString().slice(0, 10);
    const s = await dayStats(day);
    const img = (size: string) => `${site}/api/content/q-image?day=${day}&size=${size}`;
    const tail = s.people >= MIN_SHOWN ? ` ${s.people} people in ${s.langs} languages answered.` : "";
    items.push({
      id: `q-${day}`,
      kind: "question",
      date: day,
      link: `${site}/q`,
      images: { wide: img("wide"), square: img("square"), story: img("story") },
      caption: `${isAiDay(day) ? "This Sunday's question about living with AI" : "Today's question for all of Earth"}: “${s.question}”${tail} Answer in your own language and read the world's answers in yours. ${site}/q #Unlabeled #QuestionOfTheDay`,
    });
  }
  const m = await worldMood();
  if (m && m.total >= MIN_VOICES) {
    const week = new Date(now - (new Date(now).getUTCDay() * 864e5)).toISOString().slice(0, 10);
    items.push({
      id: `world-${week}`,
      kind: "world",
      date: week,
      link: `${site}/world`,
      images: { wide: `${site}/world/opengraph-image` },
      caption: `How the world feels about AI this week: ${pct(m.hope, m.total)}% hope, ${pct(m.fear, m.total)}% fear, ${pct(m.both, m.total)}% both. ${m.total} voices in ${m.langs} languages. ${site}/world #AI #Unlabeled`,
    });
  }

  if (new URL(req.url).searchParams.get("format") !== "rss") return Response.json({ items });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Unlabeled</title><link>${site}</link><description>One question a day for all of Earth.</description>
${items
  .map((it) => `<item><guid isPermaLink="false">${it.id}</guid><title>${esc(it.caption.split(":")[0])}</title><link>${esc(it.link)}</link><description>${esc(it.caption)}</description><pubDate>${new Date(it.date + "T00:00:00Z").toUTCString()}</pubDate><enclosure url="${esc(it.images.square ?? it.images.wide)}" type="image/png" length="0"/></item>`)
  .join("\n")}
</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
