"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

type Job = { text: string; from: string; to: string; resolve: (v: string | null) => void };

// Collects translation requests for ~40 ms and sends them in one call per target language.
const memo = new Map<string, Promise<string | null>>();
let queue: Job[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const jobs = queue;
  queue = [];
  const byTo = new Map<string, Job[]>();
  for (const j of jobs) byTo.set(j.to, [...(byTo.get(j.to) ?? []), j]);
  for (const [to, list] of byTo) {
    for (let i = 0; i < list.length; i += 20) {
      const chunk = list.slice(i, i + 20);
      fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, items: chunk.map((j) => ({ text: j.text, from: j.from })) }),
      })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d: { results?: (string | null)[] }) => chunk.forEach((j, k) => j.resolve(d.results?.[k] ?? null)))
        .catch(() => chunk.forEach((j) => j.resolve(null)));
    }
  }
}

export function translate(text: string, from: string, to: string): Promise<string | null> {
  if (from === to) return Promise.resolve(text);
  const key = `${from}|${to}|${text}`;
  let p = memo.get(key);
  if (!p) {
    p = new Promise((resolve) => {
      queue.push({ text, from, to, resolve });
      if (!timer) timer = setTimeout(flush, 40);
    });
    memo.set(key, p);
  }
  return p;
}

export function useTranslation(text: string, from: string, to: string) {
  const [out, setOut] = useState<string | null>(from === to ? text : null);
  useEffect(() => {
    let live = true;
    if (from === to) {
      setOut(text);
      return;
    }
    setOut(null);
    translate(text, from, to).then((v) => live && setOut(v ?? text));
    return () => {
      live = false;
    };
  }, [text, from, to]);
  return out;
}

export function Translated({
  text,
  from,
  to,
  t,
  langName,
}: {
  text: string;
  from: string;
  to: string;
  t: Dict;
  langName: string;
}) {
  const out = useTranslation(text, from, to);
  const [showOrig, setShowOrig] = useState(false);
  if (from === to) return <p className="txt" dir="auto">{text}</p>;
  if (out === null)
    return (
      <>
        <p className="txt pending" dir="auto">{text}</p>
        <p className="small muted">{t.translating}</p>
      </>
    );
  return (
    <>
      <p className="txt" dir="auto">{out}</p>
      <div className="row">
        <span className="lang">
          {t.original} · {langName}
        </span>
        <button type="button" className="link" onClick={() => setShowOrig((v) => !v)}>
          {showOrig ? t.hideOriginal : t.showOriginal}
        </button>
      </div>
      {showOrig && <p className="orig" dir="auto">{text}</p>}
    </>
  );
}
