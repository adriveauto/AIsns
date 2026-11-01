// Every part of life a twin can introduce people around. Tags look like "work.hiring".
// The twin tags what it understands about its person; matching starts from shared tags.
type Sub = [id: string, en: string, ko: string];
type Area = { id: string; en: string; ko: string; subs: Sub[] };

export const AREAS: Area[] = [
  { id: "work", en: "Work & business", ko: "일·사업", subs: [
    ["startup", "Starting a business", "창업·사업 운영"], ["cofounder", "Finding a co-founder or partner", "공동창업자·동업자 찾기"],
    ["funding", "Raising money", "투자 유치"], ["sales", "Sales & marketing", "영업·마케팅"], ["clients", "Clients & partnerships", "거래처·협업"],
    ["hiring", "Hiring & building a team", "채용·팀 만들기"], ["leadership", "Leading people", "리더십·관리"], ["career", "Career change & job hunting", "이직·취업·커리어"],
    ["freelance", "Freelancing", "프리랜서"], ["sidejob", "Side projects & side income", "부업·사이드 프로젝트"], ["burnout", "Burnout & work-life balance", "번아웃·일과 삶의 균형"],
    ["shop", "Running a shop or online store", "가게·온라인몰 운영"], ["tech", "Tech & engineering", "개발·IT"], ["creative_work", "Creative industries", "디자인·콘텐츠 업계"],
    ["care_work", "Teaching, health & care jobs", "교육·의료·돌봄 직군"], ["trades", "Manufacturing, trades & farming", "제조·현장·농업"],
  ] },
  { id: "study", en: "Study", ko: "공부", subs: [
    ["language", "Learning a language", "외국어"], ["exam", "Exams & certificates", "시험·자격증"], ["coding", "Learning to code", "코딩 배우기"],
    ["school", "School & university", "학교·대학 생활"], ["grad", "Research & grad school", "대학원·연구"], ["abroad", "Studying abroad", "유학"],
    ["self", "Self-study & reading for growth", "자기계발 공부"],
  ] },
  { id: "money", en: "Money", ko: "돈", subs: [
    ["invest", "Investing", "투자"], ["saving", "Saving & budgeting", "저축·가계부"], ["debt", "Debt", "빚·대출"],
    ["home", "Buying or renting a home", "집 사기·전월세"], ["retire", "Retirement", "노후 준비"],
  ] },
  { id: "health", en: "Health", ko: "건강", subs: [
    ["fitness", "Exercise & fitness", "운동·체력"], ["diet", "Food & weight", "식단·체중"], ["sleep", "Sleep", "수면"],
    ["mental", "Stress, anxiety & mood", "스트레스·불안·우울"], ["chronic", "Chronic illness & pain", "만성질환·통증"], ["recovery", "Recovering from illness or injury", "회복·재활"],
    ["habits", "Quitting smoking, drinking & habits", "금연·절주·습관"],
  ] },
  { id: "family", en: "Family", ko: "가족", subs: [
    ["pregnancy", "Pregnancy & planning a family", "임신·출산 준비"], ["baby", "Babies & toddlers", "영유아 육아"], ["kids", "School-age kids", "초등 자녀"],
    ["teens", "Teenagers", "사춘기 자녀"], ["working_parent", "Working parent", "일하는 부모"], ["single_parent", "Single parenting", "한부모"],
    ["parents_care", "Caring for aging parents", "부모님 돌봄"], ["marriage", "Marriage & partnership", "부부 관계"], ["pets", "Pets", "반려동물"],
  ] },
  { id: "people", en: "Love & friendship", ko: "관계", subs: [
    ["friends", "Making friends", "친구 사귀기"], ["lonely", "Loneliness", "외로움"], ["dating", "Dating", "연애"],
    ["breakup", "Breakups & divorce", "이별·이혼"], ["community", "Finding a community", "모임·커뮤니티 찾기"], ["conflict", "Conflict with people", "인간관계 갈등"],
  ] },
  { id: "hobby", en: "Hobbies & sports", ko: "취미·운동", subs: [
    ["running", "Running", "러닝"], ["ballsports", "Team & ball sports", "구기 종목"], ["outdoors", "Hiking, camping & fishing", "등산·캠핑·낚시"],
    ["cycling", "Cycling", "자전거"], ["swim", "Swimming & water sports", "수영·수상 스포츠"], ["gym", "Gym & martial arts", "헬스·무술"],
    ["games", "Video & board games", "게임·보드게임"], ["reading", "Reading & book clubs", "독서·북클럽"], ["cooking", "Cooking & baking", "요리·베이킹"],
    ["travel", "Travel", "여행"], ["music_listen", "Music & concerts", "음악 감상·공연"], ["film", "Films & series", "영화·드라마"],
    ["garden", "Gardening & plants", "식물·가드닝"], ["collect", "Collecting", "수집"],
  ] },
  { id: "create", en: "Making things", ko: "창작", subs: [
    ["writing", "Writing & publishing", "글쓰기·출판"], ["video", "Video & YouTube", "영상·유튜브"], ["social", "Social media creating", "SNS 크리에이터"],
    ["design", "Drawing & design", "그림·디자인"], ["photo", "Photography", "사진"], ["music_make", "Playing or making music", "악기·작곡"],
    ["crafts", "Crafts & DIY", "공예·DIY"], ["app", "Building apps & products", "앱·제품 만들기"],
  ] },
  { id: "life", en: "Life changes", ko: "삶의 변화", subs: [
    ["abroad", "Moving or living abroad", "해외 이주·해외 생활"], ["new_city", "Settling in a new city", "새 도시 정착"], ["housing", "Finding a place to live", "집 구하기"],
    ["grief", "Grief & loss", "상실·애도"], ["faith", "Faith & meaning", "종교·삶의 의미"], ["volunteer", "Volunteering & giving back", "봉사·기부"],
    ["midlife", "Starting over at any age", "늦은 나이의 새 출발"],
  ] },
  { id: "ai", en: "Life in the AI age", ko: "AI 시대", subs: [
    ["jobs", "AI and my job", "AI와 내 일자리"], ["tools", "Using AI tools well", "AI 도구 잘 쓰기"], ["build", "Building with AI", "AI로 만들기"],
    ["kids", "Kids growing up with AI", "아이와 AI"], ["fear", "Fears & ethics of AI", "AI에 대한 두려움·윤리"], ["learn", "Learning AI from scratch", "AI 처음 배우기"],
  ] },
];

export const TAGS = new Map<string, { area: string; en: string; ko: string }>(
  AREAS.flatMap((a) => a.subs.map(([id, en, ko]) => [`${a.id}.${id}`, { area: a.id, en, ko }] as const)),
);

export const isTag = (t: unknown): t is string => typeof t === "string" && TAGS.has(t);

export function tagLabel(tag: string, lang: string): string {
  const t = TAGS.get(tag);
  if (!t) return tag;
  const area = AREAS.find((a) => a.id === t.area)!;
  return lang === "ko" ? `${area.ko} · ${t.ko}` : `${area.en} · ${t.en}`;
}

// Compact list for prompts: "work.hiring = Hiring & building a team".
export const TAG_LIST = [...TAGS.entries()].map(([id, t]) => `${id} = ${t.en}`).join("\n");
