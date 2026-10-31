import { headers } from "next/headers";
import Link from "next/link";
import { PublicHeader, SiteFooter } from "@/components/SiteChrome";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export const metadata = { title: "개인정보 처리방침 · Unlabeled" };

const rows: [string, string, string][] = [
  ["이메일 주소", "로그인 링크 보내기", "탈퇴할 때까지"],
  ["AI에게 받은 답 (붙여 넣은 글)", "마음의 초상과 분신 만들기. 다른 사람에게 보이지 않음", "분신을 지우거나 탈퇴할 때까지. 가입 전 체험의 답은 7일 안에 가입하지 않으면 지움"],
  ["초상 그림과 한 문장", "공유 카드로 보여 주기", "탈퇴할 때까지"],
  ["국적·나이·직업 라벨 (선택)", "두 사람이 모두 원할 때만 서로에게 공개", "탈퇴할 때까지"],
  ["IP 주소의 해시값", "가입 전 체험을 하루 몇 번으로 제한", "하루 단위 집계, 원래 주소는 저장하지 않음"],
];

export default async function Privacy() {
  const t = dict(guessLang((await headers()).get("accept-language")));
  return (
    <>
    <PublicHeader t={t} />
    <main className="prose" style={{ paddingTop: 48 }}>
      <p className="eyebrow">Unlabeled</p>
      <h1>개인정보 처리방침</h1>
      <p className="small muted">시행일 2026년 11월 1일 · Privacy policy (English summary below)</p>
      <table className="table">
        <thead><tr><th align="left">무엇을</th><th align="left">왜</th><th align="left">언제까지</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c) => <td key={c}>{c}</td>)}</tr>)}</tbody>
      </table>
      <p>글과 대화는 번역과 분신 대화를 위해 AI 서비스(Anthropic)로 보내지며, Anthropic의 API 약관상 이 내용은 모델 학습에 쓰이지 않습니다. 데이터는 Supabase(데이터베이스)와 Vercel(서버)에 저장됩니다. 광고 회사에 개인정보를 팔거나 넘기지 않습니다.</p>
      <p>내 정보를 보거나 지우고 싶으면 {CONTACT ? <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a> : "서비스 안의 신고 버튼"}으로 알려 주세요. 7일 안에 처리합니다.</p>
      <h2>English summary</h2>
      <p className="small">We store your email (to send sign-in links), the AI answer you paste (to draw your portrait and build your twin; never shown to anyone), the portrait and one sentence (shown on your share card), optional labels (revealed only when both people agree), and a hashed IP for daily trial limits. Text is sent to Anthropic for translation and twin conversations and is not used for training. Data lives on Supabase and Vercel. We never sell it. Contact us{CONTACT ? ` at ${CONTACT}` : " with the in-app report button"} to see or delete your data.</p>
      <Link href="/" className="link">← Unlabeled</Link>
    </main>
    <SiteFooter t={t} />
    </>
  );
}
