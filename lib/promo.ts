import "server-only";
import { createServiceClient } from "./supabase/server";

// ?src=<channel> on any link marks where a visitor came from (e.g. ?src=x-story, ?src=reddit-sideproject).
export const SRC_COOKIE = "ul_src";
export const cleanSrc = (s: string | null | undefined) => {
  const v = (s ?? "").toLowerCase().trim();
  return /^[a-z0-9-]{1,40}$/.test(v) ? v : null;
};

// Link-preview fetchers and crawlers are not people.
export const isBot = (ua: string | null) => !ua || /bot|crawl|spider|preview|facebookexternalhit|slack|discord|whatsapp|telegram|embed|curl|python|headless/i.test(ua);

export async function recordPromo(src: string, kind: "visit" | "signup", userId?: string) {
  await createServiceClient().from("promo_events").insert({ src, kind, user_id: userId ?? null }).then(() => null, () => null);
}

// Once a day per signed-in person, so the admin page can see who came back.
export async function markActive(userId: string) {
  const day = new Date().toISOString().slice(0, 10);
  await createServiceClient().from("daily_active").upsert({ user_id: userId, day }, { onConflict: "user_id,day", ignoreDuplicates: true }).then(() => null, () => null);
}
