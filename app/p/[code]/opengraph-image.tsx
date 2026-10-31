import { getCard } from "@/lib/cards";
import { cardImage, siteHost } from "@/lib/cardImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Portrait of the mind on Unlabeled";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const card = await getCard((await params).code);
  if (!card) return new Response("not found", { status: 404 });
  return cardImage(card, size, siteHost());
}
