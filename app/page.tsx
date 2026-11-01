import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { IconCheck, IconGlobe, IconLock, IconTag, LogoMark } from "@/components/Icons";
import { SignIn } from "@/components/SignIn";
import { PublicHeader } from "@/components/SiteChrome";
import { TryPortrait } from "@/components/TryPortrait";
import { dict } from "@/lib/i18n";
import { guessLang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/server";

export default async function Home({ searchParams }: { searchParams: Promise<{ ref?: string; login?: string; signin?: string }> }) {
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
  const steps = [
    [t.how1T, t.how1],
    [t.how2T, t.how2],
    [t.how3T, t.how3],
  ];
  const why = [
    [IconTag, t.why1T, t.why1],
    [IconGlobe, t.why2T, t.why2],
    [IconLock, t.why3T, t.why3],
  ] as const;

  return (
    <>
      <PublicHeader t={t} cta={false} />
      <main className="landing">
        <section className="band hero">
          <div className="wrap">
            <div className="hero-copy">
              <span className="kicker"><i />{t.heroKicker}</span>
              <h1>
                {t.heroLine1}
                <br />
                <em>{t.heroLine2}</em>
              </h1>
              <p className="lead">{t.tryLead}</p>
              <p className="proof"><IconCheck />{t.heroProof}</p>
              {stats && stats.twins >= 20 && <p className="proof"><span className="live-dot" />{t.squareNow(stats.twins, stats.langs)}</p>}
              {failed && <p className="notice err" role="alert">{t.loginFailed}</p>}
              <details id="signin" open={failed || sp.signin === "1"}>
                <summary>{t.haveAccount}</summary>
                <div style={{ marginTop: 12, maxWidth: 420 }}><SignIn lang={lang} refCode={refCode} /></div>
              </details>
            </div>
            <div className="hero-card" id="try">
              <TryPortrait lang={lang} refCode={refCode} />
            </div>
          </div>
        </section>

        <section className="band alt">
          <div className="wrap">
            <div className="band-head">
              <p className="eyebrow">{t.howTitle}</p>
              <h2>{t.tryHeadline}</h2>
            </div>
            <div className="grid3">
              {steps.map(([title, body], i) => (
                <div key={title} className="step">
                  <span className="num">{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap example">
            <figure className="portrait-card" style={{ margin: 0 }}>
              <p className="eyebrow">{t.exampleLabel} · {t.seesMe("Claude")}</p>
              <img src="/sample-portrait.svg" alt={t.exampleTitle} width={240} height={240} />
              <p className="quote" dir="auto">“{t.exampleQuote}”</p>
              <p className="small">{t.exampleTitle}</p>
              <span className="brandline"><LogoMark /> Unlabeled</span>
            </figure>
            <div className="stack" style={{ gap: 28 }}>
              <div className="band-head" style={{ marginBottom: 0 }}>
                <h2>{t.whyTitle}</h2>
                <p className="muted" style={{ fontSize: 17 }}>{t.intro}</p>
              </div>
              {why.map(([Icon, title, body]) => (
                <div key={title} className="row" style={{ alignItems: "flex-start", gap: 16, flexWrap: "nowrap" }}>
                  <span className="feature-ico"><Icon /></span>
                  <div className="stack" style={{ gap: 4 }}>
                    <h3>{title}</h3>
                    <p className="muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band alt cta-band">
          <div className="wrap">
            <h2>{t.ctaTitle}</h2>
            <a href="#try" className="btn lg">{t.getStarted}</a>
            <p className="small muted">{t.heroProof}</p>
          </div>
        </section>
      </main>
    </>
  );
}
