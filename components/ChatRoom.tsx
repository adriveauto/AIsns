"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Translated, translate } from "@/components/Translated";
import { dict } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/langs";
import { REVEAL_DAYS, REVEAL_MIN } from "@/lib/reveal";
import type { Profile } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import { drawRevealCard } from "@/components/revealCard";

type Msg = { id: number; sender: string; lang: string; body: string; created_at: string };
type Reveal = { user_id: string; country: string | null; age: string | null; job: string | null };

const langName = (code: string) => LANGS[code as Lang]?.native ?? code;

export function ChatRoom({
  me,
  chatId,
  createdAt,
  otherId,
  otherAlias,
  otherLang,
  initialMessages,
  initialReveals,
}: {
  me: Profile;
  chatId: string;
  createdAt: string;
  otherId: string;
  otherAlias: string;
  otherLang: string;
  initialMessages: Msg[];
  initialReveals: Reveal[];
}) {
  const t = dict(me.lang);
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [reveals, setReveals] = useState<Reveal[]>(initialReveals);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [theirLabels, setTheirLabels] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ch = supabase
      .channel("chat-" + chatId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reveals", filter: `chat_id=eq.${chatId}` }, async () => {
        const { data } = await supabase.from("reveals").select("user_id, country, age, job").eq("chat_id", chatId);
        if (data) setReveals(data);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [chatId, supabase]);

  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [msgs.length]);

  const mine = reveals.find((r) => r.user_id === me.id);
  const theirs = reveals.find((r) => r.user_id === otherId);
  const mineN = msgs.filter((m) => m.sender === me.id).length;
  const theirN = msgs.length - mineN;
  const days = Math.floor((Date.now() - Date.parse(createdAt)) / 864e5);
  const ready = days >= REVEAL_DAYS && mineN >= REVEAL_MIN && theirN >= REVEAL_MIN;

  // Their labels were typed in their language; show them in mine.
  useEffect(() => {
    if (!mine || !theirs) return;
    const raw = [theirs.country, theirs.age, theirs.job].filter((v): v is string => !!v);
    Promise.all(raw.map((v) => translate(v, otherLang, me.lang).then((x) => x ?? v))).then(setTheirLabels);
  }, [mine, theirs, me.lang, otherLang]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, sender: me.id, lang: me.lang, body })
      .select("id, sender, lang, body, created_at")
      .single();
    if (error || !data) {
      setText(body);
      return setErr(t.error);
    }
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
  }

  async function reveal() {
    const { error } = await supabase.rpc("reveal_labels", { p_chat: chatId });
    if (error) return setErr(error.message);
    const { data } = await supabase.from("reveals").select("user_id, country, age, job").eq("chat_id", chatId);
    if (data) setReveals(data);
  }

  async function block() {
    await supabase.from("blocks").insert({ blocker: me.id, blocked: otherId });
    router.push("/chats");
  }

  async function report() {
    const reason = window.prompt(t.reportPrompt);
    if (!reason) return;
    const { error } = await supabase.from("reports").insert({ reporter: me.id, reported: otherId, chat_id: chatId, reason });
    setErr(error ? t.error : t.reported);
  }

  async function saveCard() {
    const blob = await drawRevealCard({ alias: otherAlias, labels: theirLabels, messages: msgs.length, days: Math.max(1, days) });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "unlabeled-reveal.png";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const pct = Math.round(
    ((Math.min(mineN, REVEAL_MIN) + Math.min(theirN, REVEAL_MIN)) / (REVEAL_MIN * 2)) * 70 +
      (Math.min(days, REVEAL_DAYS) / REVEAL_DAYS) * 30,
  );

  return (
    <main>
      <div className="row">
        <h2 className="grow">{otherAlias}</h2>
        <button type="button" className="link" onClick={report}>{t.report}</button>
        <button type="button" className="link" onClick={block}>{t.block}</button>
      </div>

      {mine && theirs ? (
        <section className="reveal">
          <span className="eyebrow">Reveal</span>
          <p className="big">{t.revealedTitle(otherAlias)}<br />{theirLabels.join(", ") || "…"}</p>
          <div className="row">
            {theirLabels.map((l) => <span key={l} className="label">{l}</span>)}
          </div>
          <div className="row">
            <button type="button" className="btn tag" onClick={saveCard}>{t.saveCard}</button>
          </div>
        </section>
      ) : (
        <section className="card">
          <div className="row">
            <span className="eyebrow grow">{t.revealProgress}</span>
            <span className="stats">
              {Math.min(days, REVEAL_DAYS)}/{REVEAL_DAYS}d · {Math.min(mineN, REVEAL_MIN)}/{REVEAL_MIN} · {Math.min(theirN, REVEAL_MIN)}/{REVEAL_MIN}
            </span>
          </div>
          <div className="progress"><i style={{ width: `${pct}%` }} /></div>
          {mine ? (
            <p className="small muted">{t.waitingForThem}</p>
          ) : (
            <>
              <p className="small muted">{theirs ? t.theyRevealed : t.revealRule(REVEAL_DAYS, REVEAL_MIN)}</p>
              <div><button type="button" className="btn tag" disabled={!ready} onClick={reveal}>{theirs ? t.revealToo : t.revealMine}</button></div>
            </>
          )}
        </section>
      )}

      <div className="msgs">
        {msgs.map((m) => (
          <div key={m.id} className={m.sender === me.id ? "bubble me" : "bubble"}>
            {m.sender === me.id ? (
              <p className="txt" dir="auto">{m.body}</p>
            ) : (
              <Translated text={m.body} from={m.lang} to={me.lang} t={t} langName={langName(m.lang)} />
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      {err && <p className="notice err" role="status">{err}</p>}
      <form className="composer" onSubmit={send}>
        <input className="grow" dir="auto" maxLength={800} placeholder={t.writeHere} value={text} onChange={(e) => setText(e.target.value)} aria-label={t.writeHere} />
        <button className="btn" type="submit">{t.send}</button>
      </form>
    </main>
  );
}
