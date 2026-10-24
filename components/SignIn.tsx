"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export function SignIn({ t }: { t: Dict }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
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
      <button
        type="button"
        className="btn ghost"
        onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })}
      >
        {t.google}
      </button>
      {msg && <p className="small muted" role="status">{msg}</p>}
    </div>
  );
}
