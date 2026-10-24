export const LANGS = {
  ko: { native: "한국어", english: "Korean" },
  en: { native: "English", english: "English" },
  es: { native: "Español", english: "Spanish" },
  pt: { native: "Português", english: "Portuguese" },
  fr: { native: "Français", english: "French" },
  de: { native: "Deutsch", english: "German" },
  ja: { native: "日本語", english: "Japanese" },
  zh: { native: "中文", english: "Simplified Chinese" },
  hi: { native: "हिन्दी", english: "Hindi" },
  ar: { native: "العربية", english: "Arabic" },
  id: { native: "Bahasa Indonesia", english: "Indonesian" },
  vi: { native: "Tiếng Việt", english: "Vietnamese" },
  th: { native: "ไทย", english: "Thai" },
  tr: { native: "Türkçe", english: "Turkish" },
  ru: { native: "Русский", english: "Russian" },
  sw: { native: "Kiswahili", english: "Swahili" },
} as const;

export type Lang = keyof typeof LANGS;

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && v in LANGS;
}

export function guessLang(header: string | null | undefined): Lang {
  const code = (header ?? "").slice(0, 2).toLowerCase();
  return isLang(code) ? code : "en";
}
