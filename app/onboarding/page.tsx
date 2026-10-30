import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/server";

export default async function Onboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) redirect("/twin");
  const lang = guessLang((await headers()).get("accept-language"));
  const t = dict(lang);
  return (
    <main style={{ paddingTop: 32 }}>
      <h2>{t.tagline}</h2>
      <p className="muted">{t.intro}</p>
      <ProfileForm userId={user.id} initial={null} labels={{ country: "", age: "", job: "" }} next="/twin" />
    </main>
  );
}
