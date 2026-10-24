import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isLang, type Lang } from "./langs";

export type Profile = { id: string; alias: string; lang: Lang };

// For signed-in pages: returns the viewer's profile or sends them to sign in / onboarding.
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data } = await supabase.from("profiles").select("id, alias, lang").eq("id", user.id).maybeSingle();
  if (!data) redirect("/onboarding");
  const profile: Profile = { id: data.id, alias: data.alias, lang: isLang(data.lang) ? data.lang : "en" };
  return { supabase, user, profile };
}
