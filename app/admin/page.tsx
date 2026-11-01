import { notFound } from "next/navigation";
import { AdminActions } from "@/components/AdminActions";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "신고함 · Unlabeled admin", robots: { index: false } };
export const dynamic = "force-dynamic";

type Report = { id: string; reporter: string; reported: string; chat_id: string | null; reason: string; category: string | null; status: string; created_at: string };

// Report inbox. Urgent categories (minor, sexual, scam) come first. Private chats are not shown here.
export default async function Admin() {
  if (!(await requireAdmin())) notFound();
  const db = createServiceClient();
  const [{ data: reports }, { data: susp }] = await Promise.all([
    db.from("reports").select("id, reporter, reported, chat_id, reason, category, status, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(200),
    db.from("suspensions").select("user_id, reason, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const list = (reports ?? []) as Report[];
  const ids = [...new Set([...list.flatMap((r) => [r.reporter, r.reported]), ...(susp ?? []).map((s) => s.user_id)])];
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, alias").in("id", ids) : { data: [] };
  const alias = new Map((profiles ?? []).map((p) => [p.id, p.alias as string]));
  const suspended = new Set((susp ?? []).map((s) => s.user_id));
  const count = new Map<string, number>();
  list.forEach((r) => count.set(r.reported, (count.get(r.reported) ?? 0) + 1));
  const urgent = (c: string | null) => (c === "minor" ? 0 : c === "sexual" ? 1 : c === "scam" ? 2 : 3);
  list.sort((a, b) => urgent(a.category) - urgent(b.category));

  return (
    <main style={{ paddingTop: 24 }}>
      <h1>신고함 · Reports</h1>
      <p className="small muted">열린 신고 {list.length}건. 18세 미만·성적·스캠 신고가 위에 있어요. 대화 내용은 여기서 보이지 않아요.</p>
      {list.length === 0 && <p className="muted">열린 신고가 없어요.</p>}
      {list.map((r) => (
        <section key={r.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="row">
            <span className="label">{r.category ?? "other"}</span>
            <span className="small muted grow">{new Date(r.created_at).toLocaleString("ko-KR")}</span>
          </div>
          <p dir="auto">{r.reason}</p>
          <p className="small">
            신고 대상 <strong>{alias.get(r.reported) ?? r.reported}</strong> (열린 신고 {count.get(r.reported)}건){suspended.has(r.reported) ? " · 정지됨" : ""} · 신고자 {alias.get(r.reporter) ?? r.reporter}
          </p>
          <AdminActions report={r.id} user={r.reported} suspended={suspended.has(r.reported)} />
        </section>
      ))}
      <h2>정지된 계정 · Suspended</h2>
      {(susp ?? []).length === 0 && <p className="small muted">없음</p>}
      {(susp ?? []).map((s) => (
        <section key={s.user_id} className="card row">
          <span className="grow">{alias.get(s.user_id) ?? s.user_id} <span className="small muted">· {s.reason}</span></span>
          <AdminActions user={s.user_id} suspended />
        </section>
      ))}
    </main>
  );
}
