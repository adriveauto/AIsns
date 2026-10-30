"use client";

import { Translated } from "@/components/Translated";
import { dict } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/langs";

// Translated for signed-in readers; signed-out readers see the original (translation needs an account).
// Takes the reader's language instead of the UI dictionary: the dictionary holds functions,
// which cannot cross from a server page into a client component.
export function Text({ text, from, to, signedIn }: { text: string; from: string; to: string; signedIn: boolean }) {
  if (!signedIn || from === to) return <p className="txt" dir="auto">{text}</p>;
  return <Translated text={text} from={from} to={to} t={dict(to)} langName={LANGS[from as Lang]?.native ?? from} />;
}
