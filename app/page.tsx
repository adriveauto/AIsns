import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignIn } from "@/components/SignIn";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/server";

export default async function Home({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const failed = (await searchParams).login === "failed";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/twin");
  const lang = guessLang((await headers()).get("accept-language"));
  const t = dict(lang);
  return (
    <main style={{ paddingTop: 48 }}>
      <p className="eyebrow">Unlabeled</p>
      <h1>{t.tagline}</h1>
      <p className="muted" style={{ fontSize: 17 }}>{t.intro}</p>
      {failed && <p className="notice" role="alert">{t.loginFailed}</p>}
      <SignIn lang={lang} />
    </main>
  );
}
