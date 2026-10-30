"use client";

import Link from "next/link";
import { useState } from "react";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/client";

export function RecipeActions({
  recipeId,
  prompt,
  signedIn,
  userId,
  lang,
  votes,
  voted,
}: {
  recipeId: string;
  prompt: string | null;
  signedIn: boolean;
  userId: string | null;
  lang: Lang;
  votes: number;
  voted: boolean;
}) {
  const t = dict(lang);
  const [v, setV] = useState({ n: votes, on: voted });
  const [copied, setCopied] = useState(false);

  async function vote() {
    if (!userId) return;
    const supabase = createClient();
    if (v.on) {
      await supabase.from("recipe_votes").delete().eq("recipe_id", recipeId).eq("user_id", userId);
      setV({ n: v.n - 1, on: false });
    } else {
      await supabase.from("recipe_votes").insert({ recipe_id: recipeId, user_id: userId });
      setV({ n: v.n + 1, on: true });
    }
  }

  return (
    <div className="row">
      {prompt && (
        <button
          type="button"
          className="btn ghost"
          onClick={() => navigator.clipboard.writeText(prompt).then(() => setCopied(true), () => setCopied(false))}
        >
          {copied ? t.copied : t.copy}
        </button>
      )}
      {signedIn ? (
        <>
          <button type="button" className={v.on ? "btn tag" : "btn ghost"} onClick={vote}>{t.markUseful} · {v.n}</button>
          <Link href={`/recipes/new?from=${recipeId}`} className="btn">{t.remix}</Link>
        </>
      ) : (
        <Link href="/" className="small">{t.signInToWrite}</Link>
      )}
    </div>
  );
}
