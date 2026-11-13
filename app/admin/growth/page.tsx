import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "홍보 성과 · admin", robots: { index: false } };
export const dynamic = "force-dynamic";

type Row = { src: string; visits: number; signups: number; back: number; eligible: number };

// Which promotion link brought people, how many signed up, and how many came back on their own
// on a later day within 7 days of signing up. "eligible" = signed up at least a day ago.
export default async function Growth() {
  if (!(await requireAdmin())) notFound();
  const db = createServiceClient();
  const [{ data: events }, { data: active }, { count: totalUsers }] = await Promise.all([
    db.from("promo_events").select("src, kind, user_id, created_at").order("created_at", { ascending: false }).limit(20000),
    db.from("daily_active").select("user_id, day").gte("day", new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)).limit(50000),
    db.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const days = new Map<string, Set<string>>();
  for (const a of active ?? []) {
    if (!days.has(a.user_id)) days.set(a.user_id, new Set());
    days.get(a.user_id)!.add(a.day);
  }
  const cameBack = (uid: string, signedUp: string) => {
    const start = Date.parse(signedUp.slice(0, 10));
    for (const d of days.get(uid) ?? []) {
      const diff = (Date.parse(d) - start) / 864e5;
      if (diff >= 1 && diff <= 7) return true;
    }
    return false;
  };
  const rows = new Map<string, Row>();
  for (const e of events ?? []) {
    const r = rows.get(e.src) ?? { src: e.src, visits: 0, signups: 0, back: 0, eligible: 0 };
    if (e.kind === "visit") r.visits++;
    if (e.kind === "signup" && e.user_id) {
      r.signups++;
      if (Date.now() - Date.parse(e.created_at) >= 864e5) r.eligible++;
      if (cameBack(e.user_id, e.created_at)) r.back++;
    }
    rows.set(e.src, r);
  }
  const list = [...rows.values()].sort((a, b) => b.signups - a.signups || b.visits - a.visits);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

  return (
    <main style={{ paddingTop: 24 }}>
      <h1>홍보 성과 · Growth</h1>
      <p className="small muted">
        링크 끝에 <code>?src=이름</code>을 붙여 올린 글별로 셉니다. 방문은 처음 들어온 사람만(봇 제외), 재방문은 가입 다음 날부터 7일 안에 스스로 다시 들어온 사람이에요. 전체 가입자 {totalUsers ?? 0}명.
      </p>
      {list.length === 0 && <p className="muted">아직 기록이 없어요. ?src= 링크로 글을 올리면 여기에 쌓여요.</p>}
      {list.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th align="left">글(src)</th><th align="right">방문</th><th align="right">가입</th><th align="right">가입률</th><th align="right">7일 안 재방문</th></tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.src} style={{ borderTop: "1px solid var(--line, #ddd)" }}>
                <td>{r.src}</td>
                <td align="right">{r.visits}</td>
                <td align="right">{r.signups}</td>
                <td align="right">{pct(r.signups, r.visits)}</td>
                <td align="right">{r.back} / {r.eligible}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
