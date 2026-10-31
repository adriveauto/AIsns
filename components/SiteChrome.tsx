import Link from "next/link";
import { LogoMark } from "@/components/Icons";
import type { Dict } from "@/lib/i18n";

// Header and footer for public pages (landing, share cards, about, privacy).
export function PublicHeader({ t, cta = true }: { t: Dict; cta?: boolean }) {
  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="logo" aria-label="Unlabeled home">
          <LogoMark />
          <span>Unlabeled</span>
        </Link>
        <div className="header-end">
                    <Link href="/?signin=1#signin" className={cta ? "btn ghost hide-sm" : "btn ghost"}>{t.signIn}</Link>
          {cta && <Link href="/#try" className="btn">{t.getStarted}</Link>}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ t }: { t: Dict }) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span className="logo" style={{ fontSize: 14 }}><LogoMark /> Unlabeled</span>
        <span>{t.footerLine}</span>
        <nav>
          <Link href="/about">{t.aboutLink}</Link>
          <Link href="/privacy">{t.privacyLink}</Link>
          <Link href="/recipes">{t.recipesTitle}</Link>
        </nav>
      </div>
    </footer>
  );
}
