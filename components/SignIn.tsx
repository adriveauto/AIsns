"use client";

import { useEffect, useState } from "react";
import { Consent } from "@/components/Legal";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/client";

const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";
// Supabase's default email has no code; turn this on only once the template shows {{ .Token }} (needs custom SMTP).
const EMAIL_CODE = process.env.NEXT_PUBLIC_EMAIL_CODE === "1";

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// Google first (fewest steps for US users), the email link below as a small fallback.
// trial and ref ride along in the sign-up metadata, so they survive a magic link opened in another browser.
export function SignIn({ lang, trial, refCode, intro, agreed: agreedBefore = false }: { lang: Lang; trial?: string; refCode?: string; intro?: boolean; agreed?: boolean }) {
  const t = dict(lang);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(agreedBefore);
  const [showEmail, setShowEmail] = useState(!GOOGLE);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [supabase] = useState(() => createClient());
  // Read on click: window does not exist while the page renders on the server.
  const redirectTo = () => `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setBusy(true);
    const src = document.cookie.match(/(?:^|; )ul_src=([a-z0-9-]{1,40})/)?.[1];
    const data = { agreed_at: new Date().toISOString(), ...(src ? { src } : {}), ...(trial ? { trial } : {}), ...(refCode ? { ref: refCode } : {}), ...(intro ? { intro: "1" } : {}) };
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo(), data } });
    // Supabase's built-in mailer allows only a few emails an hour; say so instead of a vague error.
    const limited = error && (error.status === 429 || /rate limit/i.test(error.message));
    if (!error) setSent(true);
    setMsg(!error ? (EMAIL_CODE ? t.codeSent : t.linkSent) : limited ? t.emailLimited : t.error);
    setBusy(false);
  }

  // The 6-digit code keeps sign-in on this page: on phones the email link often opens
  // inside the mail app's own browser, which does not share the login with this one.
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) {
      setMsg(t.codeWrong);
      setBusy(false);
      return;
    }
    window.location.assign("/twin");
  }

  // If the email link is opened in another tab of this same browser, move this page along too.
  useEffect(() => {
    if (!sent) return;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.assign("/twin");
    };
    const timer = setInterval(check, 3000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [sent, supabase]);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!agreedBefore && <Consent lang={lang} checked={agreed} onChange={setAgreed} id={trial ? "consent-signup" : "consent-signin"} />}
      {/* Shown only once the Google provider is enabled in Supabase; otherwise the click ends on a 400 page. */}
      {GOOGLE && (
        <button
          type="button"
          className="btn google"
          disabled={!agreed}
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } })}
        >
          <GoogleMark />
          {t.google}
        </button>
      )}
      {GOOGLE && !showEmail && (
        <button type="button" className="link" style={{ alignSelf: "center" }} onClick={() => setShowEmail(true)}>{t.emailInstead}</button>
      )}
      {showEmail && sent && EMAIL_CODE && (
        <form onSubmit={verifyCode} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label htmlFor={trial ? "code-signup" : "code"}>
            {t.codeLabel}
            <input
              id={trial ? "code-signup" : "code"}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              maxLength={10}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button className="btn" type="submit" disabled={busy || code.length < 6}>{t.codeSubmit}</button>
          <button type="button" className="link" style={{ alignSelf: "center" }} onClick={() => { setSent(false); setCode(""); setMsg(""); }}>{t.codeResend}</button>
        </form>
      )}
      {showEmail && !sent && (
        <form onSubmit={sendLink} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label htmlFor={trial ? "email-signup" : "email"} className={GOOGLE ? "small" : undefined}>
            {t.emailLabel}
            <input id={trial ? "email-signup" : "email"} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className={GOOGLE ? "btn ghost" : "btn"} type="submit" disabled={busy || !agreed}>{t.sendLink}</button>
        </form>
      )}
      {msg && <p className="small muted" role="status">{msg}</p>}
    </div>
  );
}
