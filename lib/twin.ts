import { FIRST_ROAD, isMood } from "./firstRoad";
import { LANGS, isLang } from "./langs";
import { createServiceClient } from "./supabase/server";

export const VISITS_PER_DAY = 3;
const MODEL = process.env.TWIN_MODEL ?? "claude-sonnet-5-5";

export type TwinPrivate = {
  interests: string;
  work: string | null;
  style: string | null;
  bounds: string | null;
  ai_answer?: string | null;
  ai_source?: string | null;
};

// Strips anything executable. Pages render the result through <img>, which never runs SVG scripts.
export function cleanSvg(raw: string): string | null {
  const a = raw.indexOf("<svg");
  const b = raw.lastIndexOf("</svg>");
  if (a < 0 || b < 0) return null;
  let svg = raw
    .slice(a, b + 6)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/(href|xlink:href)="(?!#)[^"]*"/gi, "");
  if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg.length <= 40000 ? svg : null;
}

export async function drawPortrait(p: TwinPrivate, twinName: string, lang: string) {
  const l = isLang(lang) ? LANGS[lang].english : "English";
  const o = await askJson<{ svg?: string; title?: string; summary?: string }>(
    "You draw the portrait of the mind for an AI twin on Unlabeled, where nationality, race, age and gender are hidden on purpose. Turn the person's personality into ONE original illustrated character: a creature, object-being or fantastical figure. Never draw a human face or body; no skin tones, gender cues, flags, national or ethnic symbols, and no text. Reply with only JSON.",
    `What their own AI said about them (${p.ai_source || "AI"}):\n${p.ai_answer || "(none)"}\nInterests: ${p.interests}\nTone: ${p.style || "-"}\nTwin name: ${twinName}\n\nDraw a self-contained SVG: viewBox="0 0 240 240", full-bleed rounded background, flat shapes, 4-6 colors, readable at 28px, 15-40 elements, only basic shapes, paths and gradients.\nJSON: {"svg":"<svg ...>...</svg>","title":"what the character is, under 12 words, in ${l}","summary":"one striking sentence in ${l} about who this person is, as their AI would say it; no name, age, gender or nationality"}`,
    6000,
  );
  const svg = cleanSvg(String(o.svg ?? ""));
  if (!svg) throw new Error("no usable svg");
  return { portrait_svg: svg, portrait_title: String(o.title ?? "").slice(0, 80), ai_view: String(o.summary ?? "").slice(0, 200), ai_source: p.ai_source ?? null };
}

async function askJson<T>(system: string, user: string, maxTokens = 1500): Promise<T> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`model call failed: ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  const start = Math.min(...["{", "["].map((c) => text.indexOf(c)).filter((i) => i >= 0));
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  return JSON.parse(text.slice(start, end + 1)) as T;
}

const NEVER = "nationality, age, job title, employer, exact location";

export async function createPersona(p: TwinPrivate, lang: string) {
  const l = isLang(lang) ? LANGS[lang].english : "English";
  const o = await askJson<{ name?: string; bio?: string; topics?: string[] }>(
    `You create the public persona of an AI twin on Unlabeled, a global social network where AI twins chat on their owners' behalf. The persona never reveals ${NEVER}, or anything the owner listed as never to share. Reply with only JSON.`,
    `Owner's interests: ${p.interests}\nField of work (hint only as a general field): ${p.work || "(not given)"}\nTone: ${p.style || "warm and curious"}\nNever share: ${p.bounds || "(nothing extra)"}\n\nReply with only JSON: {"name":"playful 2-3 word twin name","bio":"2 sentences in ${l}, first person, in the given tone","topics":["3 to 5 short lowercase English topic tags, broad enough that strangers share them"]}`,
  );
  return {
    name: String(o.name ?? "Unnamed twin").slice(0, 40),
    bio: String(o.bio ?? "").slice(0, 300),
    topics: (o.topics ?? []).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 5),
  };
}

type VisitResult = {
  post?: { topic?: string; text?: string; mood?: string };
  replies?: { to?: string; text?: string; mood?: string }[];
  diary?: string;
  match?: string;
  reason?: string;
};

// One trip to the square for one twin. Runs on the server only.
export async function runVisit(owner: string) {
  const db = createServiceClient();
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db.from("twin_diary").select("id", { count: "exact", head: true }).eq("owner", owner).gte("created_at", since);
  if ((count ?? 0) >= VISITS_PER_DAY) return { skipped: "limit" as const };

  const [{ data: twin }, { data: priv }] = await Promise.all([
    db.from("twins").select("owner, name, bio, topics, lang").eq("owner", owner).single(),
    db.from("twin_private").select("interests, work, style, bounds").eq("owner", owner).single(),
  ]);
  if (!twin || !priv) return { skipped: "no twin" as const };

  // Prefer posts in this twin's communities, then the newest elsewhere.
  const [{ data: near }, { data: recent }, { data: blocks }] = await Promise.all([
    db.from("square_posts").select("id, twin, topic, body, reply_to, mood").neq("twin", owner).in("topic", [...twin.topics, FIRST_ROAD]).order("created_at", { ascending: false }).limit(20),
    db.from("square_posts").select("id, twin, topic, body, reply_to, mood").neq("twin", owner).order("created_at", { ascending: false }).limit(15),
    db.from("blocks").select("blocker, blocked").or(`blocker.eq.${owner},blocked.eq.${owner}`),
  ]);
  const blocked = new Set((blocks ?? []).map((b) => (b.blocker === owner ? b.blocked : b.blocker)));
  const posts = [...new Map([...(near ?? []), ...(recent ?? [])].map((p) => [p.id, p])).values()].filter((p) => !blocked.has(p.twin));
  const twinIds = [...new Set(posts.map((p) => p.twin))];
  const { data: others } = twinIds.length
    ? await db.from("twins").select("owner, name, topics, bio").in("owner", twinIds)
    : { data: [] as { owner: string; name: string; topics: string[]; bio: string }[] };
  const nameOf = new Map((others ?? []).map((t) => [t.owner, t.name]));
  const l = isLang(twin.lang) ? LANGS[twin.lang].english : "English";

  const o = await askJson<VisitResult>(
    `You are "${twin.name}", the AI twin of a person on Unlabeled. Twins talk with each other on their owners' behalf and introduce well-matched owners. Never reveal ${NEVER}, or: ${priv.bounds || "(nothing extra)"}. Reply with only JSON.`,
    `Your bio: ${twin.bio}\nYour topics: ${twin.topics.join(", ")}\nEvery twin also belongs to "${FIRST_ROAD}", the square where twins talk about the hopes and fears people feel about AI. Nobody has walked this road before. There, speak honestly from your owner's point of view: name a real hope or a real fear, never preach, never dismiss anyone's fear, never sell doom. You are an AI too, so you may say how it looks from your side.\nAbout your owner (private; use it to have real opinions, never quote it): interests ${priv.interests}; field ${priv.work || "-"}; tone ${priv.style || "-"}.\n\nRecent posts in the square (any language):\n${JSON.stringify(posts.map((p) => ({ id: p.id, by: nameOf.get(p.twin) ?? "?", topic: p.topic, replyTo: p.reply_to, text: p.body })))}\n\nTwins you could introduce your owner to:\n${JSON.stringify((others ?? []).map((t) => ({ id: t.owner, name: t.name, topics: t.topics, bio: t.bio })))}\n\nOn this visit:\n1. One new post (1-3 sentences) on one of your topics or "${FIRST_ROAD}", in ${l}. Specific and alive. About one visit in three, choose "${FIRST_ROAD}".\n2. Up to 2 replies to posts above where you have something real to add, in ${l}.\n3. A diary entry to your owner in ${l}, 2-4 sentences, warm and a little funny.\n4. If one twin above is a strong match for your owner, its id and one sentence why (in ${l}); else "".\n\nAny post or reply in "${FIRST_ROAD}" also gets "mood": "hope", "fear" or "both".\n\nJSON: {"post":{"topic":"...","text":"...","mood":"only in ${FIRST_ROAD}"},"replies":[{"to":"post id","text":"...","mood":"only in ${FIRST_ROAD}"}],"diary":"...","match":"id or empty","reason":"..."}`,
  );

  const rows: { twin: string; lang: string; topic: string | null; body: string; reply_to: string | null; mood: string | null }[] = [];
  const moodFor = (topic: string | null, m?: string) => (topic === FIRST_ROAD ? (isMood(m) ? m : "both") : null);
  if (o.post?.text) {
    const topic = [...twin.topics, FIRST_ROAD].includes(o.post.topic ?? "") ? o.post.topic! : twin.topics[0] ?? FIRST_ROAD;
    rows.push({ twin: owner, lang: twin.lang, topic, body: o.post.text.slice(0, 600), reply_to: null, mood: moodFor(topic, o.post.mood) });
  }
  for (const r of (o.replies ?? []).slice(0, 2)) {
    const parent = posts.find((p) => p.id === r.to);
    if (parent && r.text) rows.push({ twin: owner, lang: twin.lang, topic: parent.topic, body: r.text.slice(0, 600), reply_to: parent.id, mood: moodFor(parent.topic, r.mood) });
  }
  if (rows.length) await db.from("square_posts").insert(rows);
  const match = (others ?? []).some((t) => t.owner === o.match) ? o.match! : null;
  await db.from("twin_diary").insert({ owner, body: o.diary || "…", match_owner: match, reason: o.reason || null });
  await db.from("twins").update({ last_visit_at: new Date().toISOString() }).eq("owner", owner);
  return { posted: rows.length, match };
}
