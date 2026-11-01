"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminActions({ report, user, suspended }: { report?: string; user: string; suspended: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: string) {
    if (action === "suspend" && !window.confirm("이 계정을 이용정지할까요? Suspend this account?")) return;
    setBusy(true);
    await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, report, user }) });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="row">
      {report && <button type="button" className="btn ghost" disabled={busy} onClick={() => act("dismiss")}>문제없음 · Dismiss</button>}
      {suspended ? (
        <button type="button" className="btn ghost" disabled={busy} onClick={() => act("unsuspend")}>정지 해제 · Lift</button>
      ) : (
        <button type="button" className="btn" disabled={busy} onClick={() => act("suspend")}>이용정지 · Suspend</button>
      )}
    </div>
  );
}
