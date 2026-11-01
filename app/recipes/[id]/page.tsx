import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { RecipeActions } from "@/components/RecipeActions";
import { Text } from "@/components/Text";
import { dict } from "@/lib/i18n";
import { RECIPE_COLUMNS, type Recipe } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { optionalViewer } from "@/lib/viewer";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("title, goal").eq("id", id).maybeSingle();
  return data ? { title: `${data.title} · Unlabeled`, description: data.goal } : {};
}

export default async function RecipePage({ params }: Params) {
  const { id } = await params;
  const { supabase, profile, lang } = await optionalViewer();
  const t = dict(lang);
  const { data } = await supabase.from("recipes").select(RECIPE_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as Recipe;
  const [{ data: author }, { data: parents }, { data: children }, { data: stat }, { data: myVote }] = await Promise.all([
    supabase.from("profiles").select("alias").eq("id", r.author).maybeSingle(),
    r.parents.length ? supabase.from("recipes").select("id, title").in("id", r.parents) : Promise.resolve({ data: [] }),
    supabase.from("recipes").select("id, title").contains("parents", [r.id]).limit(20),
    supabase.from("recipe_stats").select("votes, remixes").eq("id", r.id).maybeSingle(),
    profile
      ? supabase.from("recipe_votes").select("user_id").eq("recipe_id", r.id).eq("user_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const signedIn = !!profile;

  return (
    <>
      <Nav t={t} active="recipes" alias={profile?.alias ?? null} />
      <main>
        <Link href="/recipes" className="link">← {t.recipesTitle}</Link>
        <div className="page-head">
          <div className="h1" role="heading" aria-level={1}><Text text={r.title} from={r.lang} to={lang} signedIn={signedIn} /></div>
          <p className="post-head small"><span className="avatar">{(author?.alias ?? "—").slice(0, 1)}</span>{author?.alias ?? "—"} · {r.created_at.slice(0, 10)}</p>
        </div>
        <section className="card">
          <p className="eyebrow">{t.goal}</p>
          <Text text={r.goal} from={r.lang} to={lang} signedIn={signedIn} />
          <div className="row">{r.tools.map((x) => <span key={x} className="chip">{x}</span>)}</div>
        </section>
        <section className="card">
          <p className="eyebrow">{t.steps}</p>
          <Text text={r.steps} from={r.lang} to={lang} signedIn={signedIn} />
        </section>
        {r.prompt && (
          <section className="card">
            <p className="eyebrow">{t.prompt}</p>
            <pre className="orig" style={{ margin: 0 }}>{r.prompt}</pre>
          </section>
        )}
        <RecipeActions
          recipeId={r.id}
          prompt={r.prompt}
          signedIn={signedIn}
          userId={profile?.id ?? null}
          lang={lang}
          votes={Number(stat?.votes ?? 0)}
          voted={!!myVote}
        />
        {r.source_url && (
          <p className="small muted">
            {t.sourceCredit}: <a href={r.source_url} target="_blank" rel="noopener noreferrer nofollow">{r.source_credit || r.source_url}</a>
          </p>
        )}
        {(parents ?? []).length > 0 && (
          <section>
            <p className="eyebrow">{t.remixedFrom}</p>
            {(parents ?? []).map((p) => <Link key={p.id} href={`/recipes/${p.id}`}>{p.title}</Link>)}
          </section>
        )}
        {(children ?? []).length > 0 && (
          <section>
            <p className="eyebrow">{t.remixedInto}</p>
            {(children ?? []).map((c) => <Link key={c.id} href={`/recipes/${c.id}`}>{c.title}</Link>)}
          </section>
        )}
      </main>
    </>
  );
}
