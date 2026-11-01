import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign-in links that carry a token_hash work in any browser, including the
// in-app browsers of mail apps (Naver, Gmail, Daum), which do not share
// cookies with the browser where the email was typed.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  if (token_hash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL("/twin", url.origin));
  }
  return NextResponse.redirect(new URL("/?login=failed", url.origin));
}
