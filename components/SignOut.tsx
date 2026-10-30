"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOut({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="btn ghost"
      onClick={async () => {
        await createClient().auth.signOut();
        window.location.href = "/";
      }}
    >
      {label}
    </button>
  );
}
