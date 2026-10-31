import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Usually: the link was opened in a different browser than the one that asked for it.
    if (error) return NextResponse.redirect(new URL("/?login=failed", url.origin));
  }
  return NextResponse.redirect(new URL("/twin", url.origin));
}
