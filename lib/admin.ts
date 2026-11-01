import "server-only";
import { createClient } from "./supabase/server";

// Admins are listed by email in ADMIN_EMAILS (comma separated) in Vercel. Nobody else can
// open /admin or call /api/admin, whatever they send.
export async function requireAdmin(): Promise<{ id: string; email: string } | null> {
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!user || !email || !user.email_confirmed_at || !allowed.includes(email)) return null;
  return { id: user.id, email };
}
