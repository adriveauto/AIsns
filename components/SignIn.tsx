"use client";

import { useState } from "react";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/client";

export function SignIn({ lang }: { lang: Lang }) {
  const t = dict(lang);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  // Read on click: window does not exist while the page renders on the server.
  const redirectTo = () => `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setMsg(error ? t.error : t.linkSent);
    setBusy(false);
  }

  return (
    <div className="card">
      <form onSubmit={sendLink} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label htmlFor="email">
          {t.emailLabel}
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button className="btn" type="submit" disabled={busy}>{t.sendLink}</button>
      </form>
      {/* Shown only once the Google provider is enabled in Supabase; otherwise the click ends on a 400 page. */}
      {process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1" && (
        <button
          type="button"
          className="btn ghost"
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } })}
        >
          {t.google}
        </button>
      )}
      {msg && <p className="small muted" role="status">{msg}</p>}
    </div>
  );
}
