import Link from "next/link";
import { PrivacyText } from "@/components/LegalText";

export const metadata = { title: "개인정보 처리방침 · Privacy Policy · Unlabeled" };

export default function Privacy() {
  return (
    <main style={{ paddingTop: 32 }}>
      <p className="eyebrow">Unlabeled</p>
      <h1>개인정보 처리방침 · Privacy Policy</h1>
      <PrivacyText />
      <Link href="/" className="link">← Unlabeled</Link>
    </main>
  );
}
