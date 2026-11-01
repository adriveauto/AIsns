"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Signed in: compare with my own portrait right away. Not yet: draw mine first (30 seconds).
export function CompareButton({ code, label, busyLabel, lang }: { code: string; label: string; busyLabel: string; lang: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch("/api/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ with: code, lang }) });
    const d = (await r.json().catch(() => ({}))) as { path?: string };
    if (d.path) return router.push(d.path);
    router.push(`/?ref=${code}`);
  }
  return <button type="button" className="btn tag" disabled={busy} onClick={go}>{busy ? busyLabel : label}</button>;
}
