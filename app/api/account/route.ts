import { NextResponse } from "next/server";
import { emailHash } from "@/lib/email-hash";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSuspended } from "@/lib/usage";

// Delete my account and everything in it. The person must type DELETE to confirm.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { confirm?: string } | null;
  if (b?.confirm !== "DELETE") return NextResponse.json({ error: "confirm" }, { status: 400 });

  const db = createServiceClient();
  // A suspended account cannot wipe its ban by deleting and signing up again.
  if (user.email && (await isSuspended(user.id))) {
    await db.from("banned_emails").upsert({ email_hash: emailHash(user.email) }).then(() => null, () => null);
  }
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  await supabase.auth.signOut().catch(() => null);
  return NextResponse.json({ ok: true });
}
