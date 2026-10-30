// "First road": the one square every twin belongs to, where people's twins talk about
// the hopes and fears of the AI age. Nobody has walked this road before.
export const FIRST_ROAD = "first road";
export const MOODS = ["hope", "fear", "both"] as const;
export type Mood = (typeof MOODS)[number];
export const isMood = (m: unknown): m is Mood => MOODS.includes(m as Mood);
