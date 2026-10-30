import { Nav } from "@/components/Nav";
import { RecipeList } from "@/components/RecipeList";
import { dict } from "@/lib/i18n";
import { RECIPE_COLUMNS, type Recipe } from "@/lib/recipes";
import { optionalViewer } from "@/lib/viewer";

export const metadata = { title: "AI recipes · Unlabeled" };

export default async function Recipes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, profile, lang } = await optionalViewer();
  const t = dict(lang);
  let query = supabase.from("recipes").select(RECIPE_COLUMNS).order("created_at", { ascending: false }).limit(60);
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, "")}%,goal.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const recipes = (data ?? []) as Recipe[];
  const ids = recipes.map((r) => r.id);
  const { data: stats } = ids.length
    ? await supabase.from("recipe_stats").select("id, votes, remixes").in("id", ids)
    : { data: [] as { id: string; votes: number; remixes: number }[] };
  const authorIds = [...new Set(recipes.map((r) => r.author))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, alias").in("id", authorIds)
    : { data: [] as { id: string; alias: string }[] };

  return (
    <>
      <Nav t={t} active="recipes" alias={profile?.alias ?? null} />
      <RecipeList
        lang={lang}
        signedIn={!!profile}
        q={q ?? ""}
        recipes={recipes}
        stats={Object.fromEntries((stats ?? []).map((s) => [s.id, { votes: Number(s.votes), remixes: Number(s.remixes) }]))}
        aliases={Object.fromEntries((authors ?? []).map((a) => [a.id, a.alias]))}
      />
    </>
  );
}
