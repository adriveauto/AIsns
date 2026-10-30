"use client";

import { Translated } from "@/components/Translated";
import type { Dict } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/langs";

// Translated for signed-in readers; signed-out readers see the original (translation needs an account).
export function Text({ text, from, to, t, signedIn }: { text: string; from: string; to: string; t: Dict; signedIn: boolean }) {
  if (!signedIn || from === to) return <p className="txt" dir="auto">{text}</p>;
  return <Translated text={text} from={from} to={to} t={t} langName={LANGS[from as Lang]?.native ?? from} />;
}
