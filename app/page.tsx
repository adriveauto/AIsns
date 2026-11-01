import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignIn } from "@/components/SignIn";
import { TryPortrait } from "@/components/TryPortrait";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/server";

export default async function Home({ searchParams }: { searchParams: Promise<{ ref?: string; login?: string }> }) {
  const sp = await searchParams;
  const refCode = sp.ref && /^[a-z0-9]{8}$/.test(sp.ref) ? sp.ref : undefined;
  const failed = sp.login === "failed";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/twin");
  const lang = guessLang((await headers()).get("accept-language"));
  const { data: statRows } = await supabase.rpc("square_stats");
  const stats = (Array.isArray(statRows) ? statRows[0] : statRows) as { twins: number; langs: number } | null;
  const t = dict(lang);
  return (
    <main style={{ paddingTop: 40 }}>
      <p className="eyebrow">Unlabeled</p>
      {failed && <p className="notice" role="alert">{t.loginFailed}</p>}
      <h1>{t.tryHeadline}</h1>
      <p className="muted" style={{ fontSize: 17 }}>{t.tryLead}</p>
      {stats && stats.twins >= 20 && <p className="small" style={{ color: "var(--tag)" }}>● {t.squareNow(stats.twins, stats.langs)}</p>}
      <TryPortrait lang={lang} refCode={refCode} />
      <details open={failed}>
        <summary className="small muted">{t.haveAccount}</summary>
        <div style={{ marginTop: 12 }}><SignIn lang={lang} refCode={refCode} /></div>
      </details>
      <p className="small muted">{t.intro}</p>
    </main>
  );
}
