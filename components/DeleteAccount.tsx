"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "./Modal";

export function DeleteAccount({ t }: { t: Pick<Dict, "deleteAccount" | "deleteWarn" | "deleteType" | "deleteFailed" | "cancel"> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <>
      <button type="button" className="link small danger" onClick={() => setOpen(true)}>
        {t.deleteAccount}
      </button>
      {open && (
        <Modal title={t.deleteAccount} onClose={() => setOpen(false)}>
          <p>{t.deleteWarn}</p>
          <label>
            {t.deleteType}
            <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          </label>
          {err && <p className="small error">{err}</p>}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={text !== "DELETE" || busy}
              onClick={async () => {
                setBusy(true);
                const r = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: text }) });
                if (r.ok) {
                  await createClient().auth.signOut().catch(() => null);
                  window.location.href = "/";
                } else {
                  setErr(t.deleteFailed);
                  setBusy(false);
                }
              }}
            >
              {t.deleteAccount}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
