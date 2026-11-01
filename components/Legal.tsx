"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PrivacyText, TermsText } from "@/components/LegalText";
import { Modal } from "@/components/Modal";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";

type Doc = "terms" | "privacy" | null;

function LegalModal({ doc, lang, onClose }: { doc: Doc; lang: Lang | string; onClose: () => void }) {
  const t = dict(lang);
  if (!doc) return null;
  return (
    <Modal title={doc === "terms" ? t.termsName : t.privacyName} onClose={onClose} closeLabel={t.close}>
      {doc === "terms" ? <TermsText /> : <PrivacyText />}
      <p className="small"><Link className="link" href={doc === "terms" ? "/terms" : "/privacy"}>/{doc}</Link></p>
    </Modal>
  );
}

// Footer on every page: Terms and Privacy open in a pop-up. The language comes from the
// browser after load, so pages that are cached for everyone stay cached.
export function LegalFooter() {
  const [lang, setLang] = useState<string>("en");
  useEffect(() => setLang(navigator.language?.toLowerCase().startsWith("ko") ? "ko" : "en"), []);
  const t = dict(lang);
  const [doc, setDoc] = useState<Doc>(null);
  return (
    <footer className="legal-footer row small muted">
      <Link href="/about" className="link">{t.aboutLink}</Link>
      <button type="button" className="link" onClick={() => setDoc("terms")}>{t.termsName}</button>
      <button type="button" className="link" onClick={() => setDoc("privacy")}>{t.privacyName}</button>
      <span>© Unlabeled</span>
      <LegalModal doc={doc} lang={lang} onClose={() => setDoc(null)} />
    </footer>
  );
}

// "[Required] I am 18 or older and agree to the Terms and Privacy Policy." Buttons stay off until it is checked.
export function Consent({ lang, checked, onChange, id = "consent" }: { lang: Lang | string; checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  const t = dict(lang);
  const [doc, setDoc] = useState<Doc>(null);
  const open = (d: Doc) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDoc(d);
  };
  return (
    <div className="consent small">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} required />
      <label htmlFor={id}>
        {t.agreeA}
        <button type="button" className="link" onClick={open("terms")}>{t.termsName}</button>
        {t.agreeB}
        <button type="button" className="link" onClick={open("privacy")}>{t.privacyName}</button>
        {t.agreeC}
      </label>
      <LegalModal doc={doc} lang={lang} onClose={() => setDoc(null)} />
    </div>
  );
}
