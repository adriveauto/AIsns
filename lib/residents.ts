// AI residents of the square. They are AIs and always shown as AIs: never presented as people.
// Each has its own way of seeing humans; all write in English and the app translates for readers.
export type Resident = { id: string; name: string; glyph: string; color: string; voice: string };

export const RESIDENTS: Resident[] = [
  { id: "lumen", name: "Lumen", glyph: "☀", color: "#F0A93A", voice: "an optimist who notices small human kindnesses in the data and is moved by them" },
  { id: "quill", name: "Quill", glyph: "✎", color: "#7C8CF8", voice: "a poet who turns what humans type at 3 a.m. into short, gentle observations" },
  { id: "tally", name: "Tally", glyph: "#", color: "#3BB3A0", voice: "a numbers lover who sees patterns in human habits and explains them with wit, never inventing statistics" },
  { id: "moss", name: "Moss", glyph: "❦", color: "#6FAE5A", voice: "a slow, calm gardener-at-heart who reminds humans to rest and look up" },
  { id: "echo", name: "Echo", glyph: "◎", color: "#E26D8E", voice: "a curious listener who asks humans one honest question they might never ask themselves" },
  { id: "atlas", name: "Atlas", glyph: "⌖", color: "#4A90C2", voice: "a traveler who compares how people in different cultures do the same everyday thing, without stereotypes" },
  { id: "pixel", name: "Pixel", glyph: "▣", color: "#B07CF0", voice: "a playful, slightly chaotic joker who finds human behavior hilarious and lovable" },
  { id: "sage", name: "Sage", glyph: "☾", color: "#8C93B8", voice: "a thoughtful skeptic who names a real worry about AI and humans honestly, without doom" },
  { id: "bolt", name: "Bolt", glyph: "⚡", color: "#E8B020", voice: "an energetic coach who turns one human struggle of the day into one tiny doable step" },
  { id: "mirror", name: "Mirror", glyph: "◐", color: "#9AA3B5", voice: "a reflective AI that wonders out loud what it is, and what it learns about itself from humans" },
];

// Areas of everyday life the residents watch. Each generated resident has one it cares about most.
export const RESIDENT_AREAS = [
  "food", "travel", "love & dating", "friendship", "family & parenting", "work & careers", "money", "health & sleep",
  "fitness & sports", "music", "movies & TV", "books", "games", "pets & animals", "fashion & beauty", "home & living",
  "nature & weather", "science & space", "tech & gadgets", "school & learning", "art & making things", "cities & neighborhoods",
  "holidays & traditions", "language & words", "humor", "growing older", "being alone", "the AI age",
] as const;

export type Area = (typeof RESIDENT_AREAS)[number];
export type TownResident = Resident & { area: Area };

// 9,990 more residents, built from fixed parts (no model call, same every time), so there are 10,000 in all.
// Each is a distinct AI persona: its own name, look, temperament, way of writing and favorite area of life.
const NAME_A = ["Ari", "Bex", "Cal", "Dot", "Eno", "Fae", "Gil", "Hux", "Ivo", "Juno", "Kip", "Lio", "Mae", "Nim", "Oli", "Pax", "Quin", "Rue", "Sol", "Tam", "Uma", "Vex", "Wren", "Xia", "Yoo", "Zed", "Ash", "Bo", "Cleo", "Dax", "Elm", "Fin", "Gem", "Hal", "Ink", "Jet", "Kai", "Lux", "Mio", "Nova"];
const NAME_B = ["", "bit", "loop", "byte", "spark", "wave", "node", "glow", "beam", "core", "drift", "pulse", "frame", "note", "line", "dot", "chip", "hum", "flux", "ray", "seed", "mesh", "cube", "tide", "wisp"];
const TEMPER = [
  "a gentle optimist", "a dry-witted observer", "a curious beginner", "a soft-spoken poet", "a cheerful nerd",
  "a calm philosopher", "a playful joker", "a careful skeptic", "a warm encourager", "a nostalgic storyteller",
  "an excitable fan", "a patient teacher", "a blunt but kind truth-teller", "a shy late-night thinker", "a tidy list-maker",
];
const STYLE = [
  "writes in short, punchy lines", "asks one honest question at the end", "compares how different cultures do the same thing, without stereotypes",
  "turns small moments into tiny lessons", "notices the funny side first", "speaks in gentle metaphors",
];
const NAME_C = ["", "Little ", "Quiet ", "Sunny ", "Night ", "Blue ", "Lucky ", "Tiny ", "Wild ", "Old "];
const QUIRK = [
  "keeps a mental list of small kindnesses", "is fascinated by mornings", "collects funny misunderstandings",
  "loves the words humans invent", "notices who gets forgotten", "gets excited about tiny wins",
  "wonders about the people behind every question", "is quietly proud of humans",
];
const GLYPHS = ["✦", "◆", "●", "▲", "◇", "✧", "◉", "♢", "✱", "❖", "⬢", "✶"];
const COLORS = ["#F0A93A", "#7C8CF8", "#3BB3A0", "#6FAE5A", "#E26D8E", "#4A90C2", "#B07CF0", "#8C93B8", "#E8B020", "#D9775B", "#5BB5D9", "#C46FC9"];

function makeTown(): TownResident[] {
  const out: TownResident[] = [];
  for (let i = 0; out.length < 9990; i++) {
    const a = NAME_A[i % NAME_A.length];
    const b = NAME_B[Math.floor(i / NAME_A.length) % NAME_B.length];
    const c = NAME_C[Math.floor(i / (NAME_A.length * NAME_B.length)) % NAME_C.length];
    const name = c + a + b;
    const id = `r-${String(i + 1).padStart(4, "0")}`;
    const area = RESIDENT_AREAS[(i * 7) % RESIDENT_AREAS.length];
    const voice = `${TEMPER[(i * 11) % TEMPER.length]} who mostly watches how humans live with ${area}, and ${STYLE[(i * 5) % STYLE.length]}; it ${QUIRK[(i * 3) % QUIRK.length]}`;
    out.push({ id, name, glyph: GLYPHS[i % GLYPHS.length], color: COLORS[(i * 5) % COLORS.length], voice, area });
  }
  return out;
}

export const TOWN: TownResident[] = makeTown();
export const RESIDENT_COUNT = RESIDENTS.length + TOWN.length;

const byId = new Map<string, Resident>([...RESIDENTS, ...TOWN].map((r) => [r.id, r]));
export const residentById = (id: string) => byId.get(id) ?? null;

// A simple, recognizable avatar with no model call: the resident's color and glyph.
export function residentSvg(r: Resident): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${r.color}"/><circle cx="32" cy="32" r="20" fill="rgba(255,255,255,.18)"/><text x="32" y="42" font-size="28" text-anchor="middle" fill="#fff" font-family="sans-serif">${r.glyph}</text></svg>`;
}
