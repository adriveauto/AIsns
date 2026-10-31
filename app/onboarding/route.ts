import { cookies } from "next/headers";
import { NextResponse, after } from "next/server";
import { randomAlias } from "@/lib/alias";
import { REF_COOKIE, TRIAL_COOKIE, claimTrial, inviterOf } from "@/lib/cards";
import { guessLang } from "@/lib/langs";
import { createClient } from "@/lib/supabase/server";
import { runVisit } from "@/lib/twin";

// First visit after signing in: nothing to fill in. Name and language are picked
// for you (change them any time under My labels), and a portrait drawn before
// signing up becomes your twin straight away.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/", origin));

  const jar = await cookies();
  const meta = (user.user_metadata ?? {}) as { trial?: string; ref?: string; intro?: string };
  const refCode = jar.get(REF_COOKIE)?.value ?? meta.ref;
  const trialCode = jar.get(TRIAL_COOKIE)?.value ?? meta.trial;
  const { data: existing } = await supabase.from("profiles").select("id, lang").eq("id", user.id).maybeSingle();
  const lang = existing?.lang ?? guessLang(req.headers.get("accept-language"));
  if (!existing) {
    const invited_by = await inviterOf(refCode, user.id).catch(() => null);
    let { error } = await supabase.from("profiles").insert({ id: user.id, alias: randomAlias(), lang, invited_by });
    // A database without the 0006 migration has no invited_by column; still let the person in.
    if (error) ({ error } = await supabase.from("profiles").insert({ id: user.id, alias: randomAlias(), lang }));
    if (error) return new NextResponse("Could not create your profile. Please try again in a minute.", { status: 500 });
  }
  const claimed = await claimTrial(trialCode, user.id, lang, meta.intro === "1").catch(() => false);
  // The twin's first trip to the square starts now, so the first report is waiting within a minute.
  if (claimed) after(() => runVisit(user.id).catch(() => null));
  const res = NextResponse.redirect(new URL(claimed ? "/twin?welcome=1" : "/twin", origin));
  res.cookies.delete(TRIAL_COOKIE);
  res.cookies.delete(REF_COOKIE);
  return res;
}
