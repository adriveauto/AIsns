import { Nav } from "@/components/Nav";
import { RecipeForm, type Draft } from "@/components/RecipeForm";
import { dict } from "@/lib/i18n";
import { RECIPE_COLUMNS, type Recipe } from "@/lib/recipes";
import { requireProfile } from "@/lib/session";

export default async function NewRecipe({ searchParams }: { searchParams: Promise<{ from?: string; merge?: string }> }) {
  const { from, merge } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const t = dict(profile.lang);

  let draft: Draft | null = null;
  if (from) {
    const { data } = await supabase.from("recipes").select(RECIPE_COLUMNS).eq("id", from).maybeSingle();
    if (data) {
      const r = data as Recipe;
      draft = {
        title: r.title,
        goal: r.goal,
        tools: r.tools.join(", "),
        steps: r.steps,
        prompt: r.prompt ?? "",
        tags: r.tags.join(", "),
        sourceUrl: r.source_url ?? "",
        sourceCredit: r.source_credit ?? "",
        parents: [r.id],
      };
    }
  }
  const mergeIds = (merge ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 2);

  return (
    <>
      <Nav t={t} active="recipes" alias={profile.alias} />
      <main>
        <p className="small muted">{t.creditRule}</p>
        <RecipeForm me={profile} draft={draft} mergeIds={mergeIds.length === 2 ? mergeIds : []} />
      </main>
    </>
  );
}
