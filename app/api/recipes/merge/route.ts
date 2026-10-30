import { NextResponse } from "next/server";
import { LANGS, isLang } from "@/lib/langs";
import { RECIPE_COLUMNS, type Recipe } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

const MODEL = process.env.MERGE_MODEL ?? "claude-sonnet-5-5";

// Combines two recipes into one stronger draft. The user reviews and edits it before publishing.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { ids?: string[]; lang?: string } | null;
  const ids = body?.ids;
  const lang = isLang(body?.lang) ? body.lang : "en";
  if (!Array.isArray(ids) || ids.length !== 2) return NextResponse.json({ error: "pick two" }, { status: 400 });

  const { data } = await supabase.from("recipes").select(RECIPE_COLUMNS).in("id", ids);
  const recipes = (data ?? []) as Recipe[];
  if (recipes.length !== 2) return NextResponse.json({ error: "not found" }, { status: 404 });

  const describe = (r: Recipe, n: number) =>
    `Recipe ${n}\nTitle: ${r.title}\nGoal: ${r.goal}\nTools: ${r.tools.join(", ")}\nSteps:\n${r.steps}\nPrompt:\n${r.prompt ?? "(none)"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      system:
        "You combine two practical how-tos for using AI into one better recipe. Keep what works in each, remove overlap, add the missing step that makes them work together, and keep it concrete. Never invent facts about tools you are unsure of. Reply with only a JSON object.",
      messages: [
        {
          role: "user",
          content: `${describe(recipes[0], 1)}\n\n${describe(recipes[1], 2)}\n\nWrite the merged recipe in ${LANGS[lang].english}. Reply with only JSON: {"title": "...", "goal": "...", "tools": "comma, separated", "steps": "1. ...\\n2. ...", "prompt": "...", "tags": "comma, separated"}`,
        },
      ],
    }),
  });
  if (!res.ok) return NextResponse.json({ error: "merge failed" }, { status: 502 });
  const out = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (out.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    const m = JSON.parse(json) as Record<string, unknown>;
    const s = (k: string) => (typeof m[k] === "string" ? (m[k] as string) : "");
    return NextResponse.json({ title: s("title"), goal: s("goal"), tools: s("tools"), steps: s("steps"), prompt: s("prompt"), tags: s("tags") });
  } catch {
    return NextResponse.json({ error: "merge failed" }, { status: 502 });
  }
}
