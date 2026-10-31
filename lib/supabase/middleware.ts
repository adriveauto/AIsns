import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { setupBlocked } from "@/lib/setup";

const PUBLIC_PATHS = ["/", "/auth/callback", "/auth/confirm", "/manifest.webmanifest", "/icon.svg", "/about", "/privacy", "/opengraph-image"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Without a usable Supabase URL and key nothing can sign in; let the layout explain what to fix.
  if (setupBlocked()) return response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // When the redirect URL is not on Supabase's allow list, the link lands on the Site URL
  // with ?code= or ?token_hash=; finish the sign-in instead of showing the email form again.
  if (path === "/" && !user) {
    const q = request.nextUrl.searchParams;
    if (q.get("code") || q.get("token_hash")) {
      const url = request.nextUrl.clone();
      url.pathname = q.get("token_hash") ? "/auth/confirm" : "/auth/callback";
      return NextResponse.redirect(url);
    }
  }
  const isPublic = PUBLIC_PATHS.includes(path) || path.startsWith("/api") || path === "/recipes" || path.startsWith("/p/") || path.startsWith("/c/") || /^\/recipes\/[0-9a-f-]{36}$/.test(path);
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  // Remember whose portrait card brought this visitor, so the inviter can see it worked.
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[a-z0-9]{8}$/.test(ref) && !user) response.cookies.set("ul_ref", ref, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  return response;
}
