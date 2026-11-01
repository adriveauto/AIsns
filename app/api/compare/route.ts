import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CODE_RE, cardForOwner } from "@/lib/cards";
import { makePairing } from "@/lib/compare";
import { isLang } from "@/lib/langs";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Compare two portraits. "mine" means the signed-in person's own card.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { with?: string; mine?: string; lang?: string } | null;
  const other = String(b?.with ?? "");
  let mine = String(b?.mine ?? "");
  if (!CODE_RE.test(other)) return NextResponse.json({ error: "bad code" }, { status: 400 });
  if (!CODE_RE.test(mine)) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "draw your portrait first" }, { status: 400 });
    mine = (await cardForOwner(user.id)) ?? "";
    if (!mine) return NextResponse.json({ error: "no portrait yet" }, { status: 400 });
  }
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = "c:" + createHash("sha256").update(ip + (process.env.CRON_SECRET ?? "")).digest("hex").slice(0, 30);
  const { data: allowed } = await createServiceClient().rpc("bump_trial", { p_ip: ipHash, p_max: 10, p_global: Number(process.env.TRIAL_DAILY_CAP ?? 300) * 3 });
  if (!allowed) return NextResponse.json({ error: "limit" }, { status: 429 });
  try {
    const p = await makePairing(mine, other, isLang(b?.lang) ? b.lang : "en");
    return p ? NextResponse.json({ path: `/c/${p.a.code}/${p.b.code}`, body: p.body }) : NextResponse.json({ error: "failed" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
