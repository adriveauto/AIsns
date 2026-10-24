"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dict } from "@/lib/i18n";
import { splitList } from "@/lib/recipes";
import type { Profile } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

export type Draft = {
  title: string;
  goal: string;
  tools: string;
  steps: string;
  prompt: string;
  tags: string;
  sourceUrl: string;
  sourceCredit: string;
  parents: string[];
};

const EMPTY: Draft = { title: "", goal: "", tools: "", steps: "", prompt: "", tags: "", sourceUrl: "", sourceCredit: "", parents: [] };

export function RecipeForm({ me, draft, mergeIds }: { me: Profile; draft: Draft | null; mergeIds: string[] }) {
  const t = dict(me.lang);
  const router = useRouter();
  const [d, setD] = useState<Draft>(draft ?? EMPTY);
  const [busy, setBusy] = useState(mergeIds.length === 2);
  const [msg, setMsg] = useState(mergeIds.length === 2 ? t.merging : "");

  useEffect(() => {
    if (mergeIds.length !== 2) return;
    fetch("/api/recipes/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: mergeIds, lang: me.lang }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m: Omit<Draft, "parents" | "sourceUrl" | "sourceCredit">) => {
        setD({ ...EMPTY, ...m, parents: mergeIds });
        setMsg("");
      })
      .catch(() => setMsg(t.error))
      .finally(() => setBusy(false));
  }, [mergeIds, me.lang, t.error]);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await createClient()
      .from("recipes")
      .insert({
        author: me.id,
        lang: me.lang,
        title: d.title.trim(),
        goal: d.goal.trim(),
        tools: splitList(d.tools),
        steps: d.steps.trim(),
        prompt: d.prompt.trim() || null,
        tags: splitList(d.tags),
        source_url: d.sourceUrl.trim() || null,
        source_credit: d.sourceCredit.trim() || null,
        parents: d.parents,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) return setMsg(t.error);
    router.push(`/recipes/${data.id}`);
  }

  return (
    <form className="card" onSubmit={publish}>
      {msg && <p className="notice" role="status">{msg}</p>}
      <label htmlFor="r-title">{t.title}<input id="r-title" required minLength={3} maxLength={120} dir="auto" value={d.title} onChange={set("title")} /></label>
      <label htmlFor="r-goal">{t.goal}<textarea id="r-goal" required minLength={3} maxLength={400} dir="auto" value={d.goal} onChange={set("goal")} /></label>
      <label htmlFor="r-tools">{t.tools}<input id="r-tools" dir="auto" value={d.tools} onChange={set("tools")} /></label>
      <label htmlFor="r-steps">{t.steps}<textarea id="r-steps" required minLength={3} maxLength={6000} rows={8} dir="auto" value={d.steps} onChange={set("steps")} /></label>
      <label htmlFor="r-prompt">{t.prompt}<textarea id="r-prompt" maxLength={6000} rows={5} dir="auto" value={d.prompt} onChange={set("prompt")} /></label>
      <label htmlFor="r-tags">{t.tags}<input id="r-tags" dir="auto" value={d.tags} onChange={set("tags")} /></label>
      <label htmlFor="r-src">{t.sourceUrl}<input id="r-src" type="url" value={d.sourceUrl} onChange={set("sourceUrl")} /></label>
      <label htmlFor="r-credit">{t.sourceCredit}<input id="r-credit" maxLength={120} value={d.sourceCredit} onChange={set("sourceCredit")} /></label>
      <button className="btn" type="submit" disabled={busy}>{t.publish}</button>
    </form>
  );
}
