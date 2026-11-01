"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Text } from "@/components/Text";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";
import type { Recipe } from "@/lib/recipes";

export function RecipeList({
  lang,
  signedIn,
  q,
  recipes,
  stats,
  aliases,
}: {
  lang: Lang;
  signedIn: boolean;
  q: string;
  recipes: Recipe[];
  stats: Record<string, { votes: number; remixes: number }>;
  aliases: Record<string, string>;
}) {
  const t = dict(lang);
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : [p[1], id]));

  return (
    <main>
      <div className="page-head">
        <h1>{t.recipesTitle}</h1>
        <p>{t.recipesIntro}</p>
      </div>
      <form className="row" action="/recipes">
        <input className="grow" name="q" defaultValue={q} placeholder={t.search} aria-label={t.search} />
      </form>
      {signedIn ? (
        <div className="row">
          <Link href="/recipes/new" className="btn">{t.newRecipe}</Link>
          <button type="button" className="btn tag" disabled={picked.length !== 2} onClick={() => router.push(`/recipes/new?merge=${picked.join(",")}`)}>
            {t.mergeSelected(picked.length)}
          </button>
        </div>
      ) : (
        <p className="notice">{t.signInToWrite} <Link href="/">→</Link></p>
      )}
      {recipes.map((r) => (
        <article key={r.id} className="card">
          <div className="post-head">
            <span className="avatar">{(aliases[r.author] ?? "—").slice(0, 1)}</span>
            <span className="alias grow">{aliases[r.author] ?? "—"}</span>
            <span className="stats">{stats[r.id]?.votes ?? 0} {t.votes} · {stats[r.id]?.remixes ?? 0} {t.remixes}</span>
          </div>
          <Link href={`/recipes/${r.id}`} className="recipe-title">
            <Text text={r.title} from={r.lang} to={lang} signedIn={signedIn} />
          </Link>
          <Text text={r.goal} from={r.lang} to={lang} signedIn={signedIn} />
          <div className="row">
            {r.tools.map((x) => <span key={x} className="chip">{x}</span>)}
            {r.parents.length > 0 && <span className="chip">remix</span>}
            <span className="grow" />
            {signedIn && (
              <label className="row" style={{ flexDirection: "row" }}>
                <input type="checkbox" style={{ width: "auto" }} checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
                {t.pickToMerge}
              </label>
            )}
          </div>
        </article>
      ))}
    </main>
  );
}
