import { questionImage } from "@/lib/questionImage";

const SIZES = { wide: { width: 1200, height: 630 }, square: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } };

// /api/content/q-image?day=2026-11-01&size=square — a day's question as a post-ready picture.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const day = u.searchParams.get("day") ?? "";
  const size = SIZES[(u.searchParams.get("size") ?? "wide") as keyof typeof SIZES] ?? SIZES.wide;
  const today = new Date().toISOString().slice(0, 10);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today;
  return questionImage(size, ok ? day : today);
}
