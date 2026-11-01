"use client";

import { useState } from "react";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";

// Share a portrait card: the system share sheet (KakaoTalk, Instagram, X…), a copied link,
// or a story-size picture with the site name printed on it, which travels without any link.
export function ShareButtons({ code, lang }: { code: string; lang: Lang }) {
  const t = dict(lang);
  const [msg, setMsg] = useState("");
  const url = () => `${window.location.origin}/p/${code}`;

  async function share() {
    const data = { title: "Unlabeled", text: t.shareText, url: url() };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        return; // dismissed
      }
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${t.shareText} ${url()}`);
      setMsg(t.copied);
    } catch {
      setMsg(url());
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="row">
        <button type="button" className="btn" onClick={share}>{t.shareCard}</button>
        <button type="button" className="btn ghost" onClick={copy}>{t.copyLink}</button>
        <a className="btn ghost" href={`/p/${code}/story?download=1`} download={`unlabeled-${code}.png`}>{t.saveImage}</a>
      </div>
      {msg && <p className="small muted" role="status">{msg}</p>}
    </div>
  );
}
