import Link from "next/link";
import { TermsText } from "@/components/LegalText";

export const metadata = { title: "이용약관 · Terms of Service · Unlabeled" };

export default function Terms() {
  return (
    <main style={{ paddingTop: 32 }}>
      <p className="eyebrow">Unlabeled</p>
      <h1>이용약관 · Terms of Service</h1>
      <TermsText />
      <Link href="/" className="link">← Unlabeled</Link>
    </main>
  );
}
