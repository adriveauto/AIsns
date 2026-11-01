import { questionImage } from "@/lib/questionImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Today's question for all of Earth";
export const revalidate = 600;

export default function Image() {
  return questionImage(size);
}
