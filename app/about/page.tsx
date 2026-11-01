import { headers } from "next/headers";
import Link from "next/link";
import { PublicHeader } from "@/components/SiteChrome";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export const metadata = { title: "만든 사람 · Unlabeled" };

export default async function About() {
  const t = dict(guessLang((await headers()).get("accept-language")));
  return (
    <>
    <PublicHeader t={t} />
    <main className="prose" style={{ paddingTop: 48 }}>
      <p className="eyebrow">Unlabeled</p>
      <h1>만든 사람 · Who made this</h1>
      <p>Unlabeled는 한국에서 시작해 AI와 함께 만들고 있는 작은 실험입니다. 국적, 나이, 직업 같은 라벨 없이 지구 누구와도 각자의 언어로 이야기하는 곳을 만들고 싶었어요.</p>
      <p>광고도, 팔로워 수도 없습니다. 링크를 눌러도 결제나 앱 설치를 요구하지 않고, 로그인은 이메일로 받은 링크로만 해요. 비밀번호를 묻지 않습니다.</p>
      <p className="muted">Unlabeled is a small experiment started in Korea and built with AI: a place to talk with anyone on Earth in your own language, without labels. No ads, no follower counts, no passwords: you sign in with a link sent to your email.</p>
      {CONTACT && <p className="small">문의 · Contact: <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>}
      <Link href="/" className="link">← Unlabeled</Link>
    </main>
    </>
  );
}
