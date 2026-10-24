import { headers } from "next/headers";
import { createClient } from "./supabase/server";
import { guessLang, isLang, type Lang } from "./langs";

// For public pages: the viewer may be signed out.
export async function optionalViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let profile: { id: string; alias: string; lang: Lang } | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("id, alias, lang").eq("id", user.id).maybeSingle();
    if (data) profile = { id: data.id, alias: data.alias, lang: isLang(data.lang) ? data.lang : "en" };
  }
  const lang: Lang = profile?.lang ?? guessLang((await headers()).get("accept-language"));
  return { supabase, profile, lang };
}
