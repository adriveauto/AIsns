"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Translated, useTranslation } from "@/components/Translated";
import { dict } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/langs";
import type { Profile } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

export type AnswerRow = { id: string; author: string; lang: string; body: string; alias: string };

const langName = (code: string) => LANGS[code as Lang]?.native ?? code;

export function TodayView({
  me,
  day,
  question,
  aiDay,
  answers,
  chatWith,
  hasTwin,
  guess: initialGuess,
  knows: initialKnows,
}: {
  me: Profile;
  day: string;
  question: string;
  aiDay?: boolean;
  answers: AnswerRow[];
  chatWith: Record<string, string>;
  hasTwin?: boolean;
  guess?: { guess: string; verdict: string | null } | null;
  knows?: { pct: number; days: number } | null;
}) {
  const t = dict(me.lang);
  const router = useRouter();
  const supabase = createClient();
  const q = useTranslation(question, "en", me.lang);
  const mine = answers.find((a) => a.author === me.id);
  const others = answers.filter((a) => a.author !== me.id);
  const [text, setText] = useState(mine?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [guess, setGuess] = useState(initialGuess?.guess ?? "");
  const [verdict, setVerdict] = useState(initialGuess?.verdict ?? null);
  const [knows, setKnows] = useState(initialKnows ?? null);
  const [guessing, setGuessing] = useState(false);

  // The twin guesses today's answer before the owner writes anything.
  useEffect(() => {
    if (!hasTwin || guess || mine) return;
    setGuessing(true);
    fetch("/api/today/guess", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "guess" }) })
      .then((r) => r.json())
      .then((d) => d.guess && setGuess(d.guess))
      .catch(() => {})
      .finally(() => setGuessing(false));
  }, [hasTwin, guess, mine]);

  // Share today's question with a friend; the link carries the portrait code so they land as our invitee.
  async function shareGuess() {
    const r = await fetch("/api/share", { method: "POST" }).catch(() => null);
    const code = r && r.ok ? (await r.json()).code : null;
    const url = `${window.location.origin}/q${code ? `?ref=${code}` : ""}`;
    const text = t.shareGuessText(knows ? knows.pct : null);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Unlabeled", text, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setErr(t.copied);
    } catch {}
  }

  async function mark(v: "right" | "close" | "wrong") {
    setVerdict(v);
    if (v === "wrong") setText("");
    else setText(guess);
    if (v !== "right") document.getElementById("answer")?.focus();
    const r = await fetch("/api/today/guess", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "mark", verdict: v }) });
    const d = await r.json().catch(() => null);
    if (d?.knows) setKnows(d.knows);
  }

  // Pick up new answers from around the world while the page is open.
  useEffect(() => {
    const ch = supabase
      .channel("answers-" + day)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers", filter: `day=eq.${day}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [day, router, supabase]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("answers")
      .upsert({ day, author: me.id, lang: me.lang, body: text.trim() }, { onConflict: "day,author" });
    setBusy(false);
    if (error) return setErr(t.error);
    router.refresh();
  }

  async function resonate(a: AnswerRow) {
    const existing = chatWith[a.author];
    if (existing) return router.push(`/chats/${existing}`);
    const [user_a, user_b] = [me.id, a.author].sort();
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_a, user_b, source_answer: a.id })
      .select("id")
      .single();
    if (error || !data) return setErr(t.error);
    router.push(`/chats/${data.id}`);
  }

  return (
    <main>
      <div className="card qcard">
        <p className="eyebrow">{aiDay ? t.aiSunday : t.questionOfDay} · {day}</p>
        <h2 dir="auto">{q ?? question}</h2>
      </div>
      {hasTwin && !mine && (guessing || guess) && (
        <div className="card guess">
          <p className="eyebrow">{t.twinGuessTitle}</p>
          {guessing && !guess ? (
            <p className="muted">{t.twinGuessing}</p>
          ) : (
            <>
              <p className="guess-text" dir="auto">“{guess}”</p>
              {verdict ? (
                <div className="row">
                  <p className="small muted grow">{t.twinGuessThanks[verdict as "right" | "close" | "wrong"]}</p>
                  <button type="button" className="btn tag" onClick={shareGuess}>{t.shareGuess}</button>
                </div>
              ) : (
                <div className="row">
                  <button type="button" className="btn" onClick={() => mark("right")}>{t.guessRight}</button>
                  <button type="button" className="btn ghost" onClick={() => mark("close")}>{t.guessClose}</button>
                  <button type="button" className="btn ghost" onClick={() => mark("wrong")}>{t.guessWrong}</button>
                </div>
              )}
            </>
          )}
          {knows && <p className="small muted">{knows.pct < 0 ? t.knowsYouSoon(3 - knows.days) : t.knowsYou(knows.pct, knows.days)}</p>}
        </div>
      )}
      <form className="card" onSubmit={post}>
        <label htmlFor="answer">{t.answerIn(langName(me.lang))}</label>
        <textarea id="answer" dir="auto" maxLength={600} required value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row">
          <span className="small muted grow">{mine ? "" : t.answerFirst}</span>
          <button className="btn" type="submit" disabled={busy}>{mine ? t.editAnswer : t.answer}</button>
        </div>
        {err && <p className="notice err">{err}</p>}
      </form>
      {!mine ? (
        <div className="locked">{t.answerFirst}</div>
      ) : others.length === 0 ? (
        <div className="locked">{t.noOthers}</div>
      ) : (
        <>
          <div className="row">
            <span className="eyebrow grow">{others.length + 1} · {new Set(answers.map((a) => a.lang)).size} lang</span>
          </div>
          {others.map((a) => (
            <article key={a.id} className="card">
              <div className="row">
                <span className="alias grow">{a.alias}</span>
                <span className="lang">{langName(a.lang)}</span>
              </div>
              <Translated text={a.body} from={a.lang} to={me.lang} t={t} langName={langName(a.lang)} />
              <div className="row">
                <span className="grow" />
                <button type="button" className={chatWith[a.author] ? "btn ghost" : "btn tag"} onClick={() => resonate(a)}>
                  {chatWith[a.author] ? t.continueChat : t.resonate}
                </button>
              </div>
            </article>
          ))}
        </>
      )}
    </main>
  );
}
