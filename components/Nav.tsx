import Link from "next/link";
import type { Dict } from "@/lib/i18n";

export function Nav({ t, active, alias }: { t: Dict; active: "today" | "chats" | "recipes" | "me"; alias: string | null }) {
  const items = [
    ["today", "/today", t.today],
    ["chats", "/chats", t.chats],
    ["recipes", "/recipes", t.recipes],
    ["me", "/me", t.me],
  ] as const;
  return (
    <header className="bar">
      <div className="brand">
        <Link href="/today" className="logo">Unlabeled</Link>
        {alias ? <span className="who">{alias}</span> : <Link href="/" className="who">Sign in</Link>}
      </div>
      <nav>
        {items.map(([key, href, label]) => (
          <Link key={key} href={href} aria-current={active === key ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
