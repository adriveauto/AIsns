"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, Modal } from "@/components/Modal";
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
  const [menu, setMenu] = useState(false);
  const [popup, setPopup] = useState("");
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);

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
    // Sent through the server, which checks the message before anyone can see it.
    const r = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, body, lang: me.lang }) });
    const data = (await r.json().catch(() => null)) as (Msg & { error?: string }) | null;
    if (!r.ok || !data?.id) {
      setText(body);
      if (data?.error === "blocked") return setPopup(t.blockedContent);
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

  // Blocking hides this chat from my list right away, and the database refuses any new chat
  // or message between us from then on.
  async function block() {
    await supabase.from("blocks").upsert({ blocker: me.id, blocked: otherId }, { onConflict: "blocker,blocked", ignoreDuplicates: true });
    router.push("/chats");
    router.refresh();
  }

  async function report(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    const label = t.reportReasons.find(([k]) => k === reason)?.[1] ?? reason;
    const text = `${reason}: ${label}${detail.trim() ? ` | ${detail.trim()}` : ""}`.slice(0, 500);
    let { error } = await supabase.from("reports").insert({ reporter: me.id, reported: otherId, chat_id: chatId, reason: text, category: reason });
    // Before migration 0012 there is no category column; the reason text still carries it.
    if (error) ({ error } = await supabase.from("reports").insert({ reporter: me.id, reported: otherId, chat_id: chatId, reason: text }));
    setReporting(false);
    setReason("");
    setDetail("");
    if (error) return setErr(t.error);
    if (alsoBlock) return block();
    setPopup(t.reported);
  }

  // Share the reveal picture itself (KakaoTalk, Instagram, X…) where the phone allows it; otherwise save it.
  async function shareCard() {
    const blob = await drawRevealCard({ alias: otherAlias, labels: theirLabels, messages: msgs.length, days: Math.max(1, days) });
    const file = new File([blob], "unlabeled-reveal.png", { type: "image/png" });
    const data = { files: [file], text: t.revealShareText, url: window.location.origin };
    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
      } catch {
        /* dismissed */
      }
      return;
    }
    saveCard();
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
      <div className="chat-head">
        <Link href="/chats" className="link" aria-label={t.back}>←</Link>
        <span className="avatar" style={{ width: 40, height: 40, fontSize: 15 }}>{otherAlias.slice(0, 1)}</span>
        <h2 className="grow">{otherAlias}</h2>
        <div className="menu-wrap">
          <button type="button" className="btn ghost" aria-haspopup="menu" aria-expanded={menu} aria-label={t.more} onClick={() => setMenu((v) => !v)}>⋯</button>
          {menu && (
            <div className="menu card" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenu(false); setReporting(true); }}>🚩 {t.report}</button>
              <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); setConfirmBlock(true); }}>⛔ {t.block}</button>
            </div>
          )}
        </div>
      </div>
      {popup && <Alert text={popup} ok={t.ok} onClose={() => setPopup("")} />}
      {confirmBlock && (
        <Modal title={t.block} onClose={() => setConfirmBlock(false)} closeLabel={t.close}>
          <p dir="auto">{t.blockConfirm(otherAlias)}</p>
          <div className="row">
            <button type="button" className="btn" onClick={block}>{t.block}</button>
            <button type="button" className="btn ghost" onClick={() => setConfirmBlock(false)}>{t.cancel}</button>
          </div>
        </Modal>
      )}
      {reporting && (
        <Modal title={t.reportTitle} onClose={() => setReporting(false)} closeLabel={t.close}>
          <form onSubmit={report} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="reasons" role="radiogroup">
              {t.reportReasons.map(([k, label]) => (
                <label key={k}>
                  <input type="radio" name="reason" value={k} checked={reason === k} onChange={() => setReason(k)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <textarea rows={3} maxLength={400} dir="auto" placeholder={t.reportDetail} value={detail} onChange={(e) => setDetail(e.target.value)} />
            <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", flexDirection: "row" }}>
              <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} style={{ width: "auto" }} />
              <span>{t.reportAlsoBlock}</span>
            </label>
            <div><button type="submit" className="btn" disabled={!reason}>{t.reportSend}</button></div>
          </form>
        </Modal>
      )}

      {mine && theirs ? (
        <section className="reveal">
          <span className="eyebrow">Reveal</span>
          <p className="big">{t.revealedTitle(otherAlias)}<br />{theirLabels.join(", ") || "…"}</p>
          <div className="row">
            {theirLabels.map((l) => <span key={l} className="label">{l}</span>)}
          </div>
          <p className="small">{t.revealSharePrompt}</p>
          <div className="row">
            <button type="button" className="btn tag" onClick={shareCard}>{t.revealShare}</button>
            <button type="button" className="btn ghost" onClick={saveCard}>{t.saveCard}</button>
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
