import { headers } from "next/headers";
import Link from "next/link";
import { PublicHeader } from "@/components/SiteChrome";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";
import { PrivacyText } from "@/components/LegalText";

export const metadata = { title: "개인정보 처리방침 · Privacy Policy · Unlabeled" };

export default async function Privacy() {
  const t = dict(guessLang((await headers()).get("accept-language")));
  return (
    <>
    <PublicHeader t={t} />
    <main className="prose" style={{ paddingTop: 48 }}>
      <p className="eyebrow">Unlabeled</p>
      <h1>개인정보 처리방침 · Privacy Policy</h1>
      <PrivacyText />
      <Link href="/" className="link">← Unlabeled</Link>
    </main>
    </>
  );
}
