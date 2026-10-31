import { getCard } from "@/lib/cards";
import { cardImage, siteHost } from "@/lib/cardImage";

// Story-size picture (1080x1920) to save and post on Instagram or KakaoTalk without a link.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const card = await getCard((await params).code);
  if (!card) return new Response("not found", { status: 404 });
  const res = await cardImage(card, { width: 1080, height: 1920 }, siteHost());
  if (new URL(req.url).searchParams.has("download")) res.headers.set("content-disposition", `attachment; filename="unlabeled-${card.code}.png"`);
  return res;
}
