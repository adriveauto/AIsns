import Link from "next/link";
import { Nav } from "@/components/Nav";
import { dict } from "@/lib/i18n";
import { requireProfile } from "@/lib/session";

export default async function Chats() {
  const { supabase, profile } = await requireProfile();
  const t = dict(profile.lang);
  const [{ data: chats }, { data: blocks }] = await Promise.all([
    supabase.from("chats").select("id, user_a, user_b, last_message_at").order("last_message_at", { ascending: false }),
    supabase.from("blocks").select("blocked"),
  ]);
  const blocked = new Set((blocks ?? []).map((b) => b.blocked));
  const visible = (chats ?? []).filter((c) => !blocked.has(c.user_a === profile.id ? c.user_b : c.user_a));
  const otherIds = visible.map((c) => (c.user_a === profile.id ? c.user_b : c.user_a));
  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, alias").in("id", otherIds)
    : { data: [] as { id: string; alias: string }[] };
  const aliasOf = new Map((profiles ?? []).map((p) => [p.id, p.alias]));

  return (
    <>
      <Nav t={t} active="chats" alias={profile.alias} />
      <main>
        {visible.length === 0 ? (
          <p className="muted">{t.noChats}</p>
        ) : (
          visible.map((c) => {
            const other = c.user_a === profile.id ? c.user_b : c.user_a;
            return (
              <Link key={c.id} href={`/chats/${c.id}`} className="card" style={{ textDecoration: "none" }}>
                <h3>{aliasOf.get(other) ?? "—"}</h3>
                <span className="small muted">{new Date(c.last_message_at).toLocaleString(profile.lang)}</span>
              </Link>
            );
          })
        )}
      </main>
    </>
  );
}
