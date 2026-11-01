import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { MIN_SHOWN, dayStats } from "@/lib/dayStats";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";
import { isAiDay } from "@/lib/questions";

// Public page for today's question: the same question for all of Earth, real counts, and a way in.
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await dayStats();
  const title = `"${s.question}" · Today's question for all of Earth`;
  const description = s.people >= MIN_SHOWN
    ? `${s.people} people in ${s.langs} languages answered today. Answer in your language to read theirs in yours.`
    : "One question a day for everyone on Earth. Answer in your language, read the world's answers in yours.";
  return { title, description, openGraph: { title, description, siteName: "Unlabeled", type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function TodayQuestion() {
  const lang = guessLang((await headers()).get("accept-language"));
  const t = dict(lang);
  const s = await dayStats();
  return (
    <main style={{ paddingTop: 32 }}>
      <p className="eyebrow">Unlabeled · {isAiDay(s.day) ? t.aiSunday : t.questionOfDay} · {s.day}</p>
      <section className="card qcard">
        <h1 dir="auto" style={{ margin: 0 }}>{s.question}</h1>
      </section>
      <p className="stats">{s.people >= MIN_SHOWN ? t.qStats(s.people, s.langs) : t.qFirst}</p>
      <p className="muted">{t.qHow}</p>
      <Link href="/today" className="btn tag" style={{ textAlign: "center" }}>{t.qAnswer}</Link>
    </main>
  );
}
