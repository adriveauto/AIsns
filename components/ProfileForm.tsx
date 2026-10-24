"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { randomAlias } from "@/lib/alias";
import { dict } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/client";

type Labels = { country: string; age: string; job: string };

export function ProfileForm({
  userId,
  initial,
  labels,
  next,
}: {
  userId: string;
  initial: { alias: string; lang: Lang } | null;
  labels: Labels;
  next?: string;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(initial?.lang ?? "en");
  const [alias, setAlias] = useState(initial?.alias ?? randomAlias());
  const [l, setL] = useState<Labels>(labels);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const t = dict(lang);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const p = await supabase.from("profiles").upsert({ id: userId, alias: alias.trim(), lang });
    const q = await supabase.from("labels").upsert({ user_id: userId, ...l, updated_at: new Date().toISOString() });
    setBusy(false);
    if (p.error || q.error) return setMsg(t.error);
    setMsg(t.saved);
    if (next) router.push(next);
    router.refresh();
  }

  return (
    <form className="card" onSubmit={save}>
      <label htmlFor="lang">
        {t.language}
        <select id="lang" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {Object.entries(LANGS).map(([k, v]) => (
            <option key={k} value={k}>{v.native}</option>
          ))}
        </select>
      </label>
      <label htmlFor="alias">
        {t.alias}
        <input id="alias" required minLength={2} maxLength={24} value={alias} onChange={(e) => setAlias(e.target.value)} />
      </label>
      <p className="eyebrow">{t.hiddenLabels}</p>
      <label htmlFor="country">
        {t.country}
        <input id="country" maxLength={40} value={l.country} onChange={(e) => setL({ ...l, country: e.target.value })} />
      </label>
      <div className="row">
        <label className="grow" htmlFor="age">
          {t.age}
          <input id="age" maxLength={10} value={l.age} onChange={(e) => setL({ ...l, age: e.target.value })} />
        </label>
        <label className="grow" htmlFor="job">
          {t.job}
          <input id="job" maxLength={40} value={l.job} onChange={(e) => setL({ ...l, job: e.target.value })} />
        </label>
      </div>
      <div className="row">
        <span className="small muted grow" role="status">{msg}</span>
        <button className="btn" type="submit" disabled={busy}>{initial ? t.save : t.start}</button>
      </div>
    </form>
  );
}
