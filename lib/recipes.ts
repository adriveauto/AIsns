export type Recipe = {
  id: string;
  author: string;
  lang: string;
  title: string;
  goal: string;
  tools: string[];
  steps: string;
  prompt: string | null;
  source_url: string | null;
  source_credit: string | null;
  parents: string[];
  tags: string[];
  created_at: string;
};

export const RECIPE_COLUMNS =
  "id, author, lang, title, goal, tools, steps, prompt, source_url, source_credit, parents, tags, created_at";

export const splitList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);
