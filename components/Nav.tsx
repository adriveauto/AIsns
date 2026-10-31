import Link from "next/link";
import { IconChats, IconMe, IconRecipes, IconToday, IconTwin, LogoMark } from "@/components/Icons";
import type { Dict } from "@/lib/i18n";

type Key = "twin" | "today" | "chats" | "recipes" | "me";

// Signed-in chrome: a top bar with the main menu on wide screens, and a bottom tab bar on phones.
export function Nav({ t, active, alias }: { t: Dict; active: Key; alias: string | null }) {
  const items = [
    ["twin", "/twin", t.tabTwin, IconTwin],
    ["today", "/today", t.tabToday, IconToday],
    ["chats", "/chats", t.tabChats, IconChats],
    ["recipes", "/recipes", t.tabRecipes, IconRecipes],
    ["me", "/me", t.tabMe, IconMe],
  ] as const;
  return (
    <>
      <header className="site-header">
        <div className="inner">
          <Link href={alias ? "/twin" : "/"} className="logo" aria-label="Unlabeled home">
            <LogoMark />
            <span>Unlabeled</span>
          </Link>
          <nav className="site-nav" aria-label="Main">
            {items.map(([key, href, label, Icon]) => (
              <Link key={key} href={href} aria-current={active === key ? "page" : undefined}>
                <Icon />
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-end">
            {alias ? (
              <Link href="/me" className="me-pill" aria-label={t.tabMe}>
                <span className="avatar">{alias.slice(0, 1)}</span>
                <span>{alias}</span>
              </Link>
            ) : (
              <Link href="/" className="btn">{t.signIn}</Link>
            )}
          </div>
        </div>
      </header>
      {alias && (
        <nav className="tabbar" aria-label="Main">
          {items.map(([key, href, label, Icon]) => (
            <Link key={key} href={href} aria-current={active === key ? "page" : undefined}>
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}
