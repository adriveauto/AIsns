import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

// Admin actions on reports: dismiss, suspend the reported account, or lift a suspension.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as { action?: string; report?: string; user?: string; reason?: string } | null;
  const db = createServiceClient();
  const now = new Date().toISOString();
  if (b?.action === "dismiss" && UUID.test(b.report ?? "")) {
    await db.from("reports").update({ status: "dismissed", reviewed_at: now }).eq("id", b.report!);
    return NextResponse.json({ ok: true });
  }
  if (b?.action === "suspend" && UUID.test(b.user ?? "")) {
    const reason = String(b.reason ?? "").slice(0, 500) || `by ${admin.email}`;
    await db.from("suspensions").upsert({ user_id: b.user!, reason });
    // Their twin stops introducing them, and every open report about them is closed as acted on.
    await db.from("twin_private").update({ match_ok: false }).eq("owner", b.user!);
    await db.from("reports").update({ status: "actioned", reviewed_at: now }).eq("reported", b.user!).eq("status", "open");
    return NextResponse.json({ ok: true });
  }
  if (b?.action === "unsuspend" && UUID.test(b.user ?? "")) {
    await db.from("suspensions").delete().eq("user_id", b.user!);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
