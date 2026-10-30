// One question a day for all of Earth. Written in English; translated per reader.
export const QUESTIONS = [
  "What scared you the most as a child?",
  "What can you see outside your window right now?",
  "When were you last grateful to someone?",
  "What is something your grandparents taught you that you still remember?",
  "What is the best smell in your neighborhood?",
  "What would you tell yourself ten years ago?",
  "If today were a color, which would it be?",
  "If money didn't matter, how would you spend your days?",
  "What made you laugh hard recently?",
  "Tell us one thing only locals know about where you live.",
  "What food tastes like home to you?",
  "What is a small thing that makes a day good?",
  "Which song do you know every word of?",
  "What did you want to be when you were seven?",
];

// Every Sunday (UTC) the whole planet gets the same question about living with AI.
export const AI_QUESTIONS = [
  "What do you hope AI will do for you in the next five years?",
  "What about AI quietly worries you?",
  "What should never be handed over to AI?",
  "When did AI last surprise you, for better or worse?",
  "What would you want your grandchildren to know about how we lived through the start of AI?",
  "If AI took over your least favorite task tomorrow, what would you do with the time?",
  "What is something only a human can give another human?",
  "Who do you worry about most in the AI age, and why?",
];

export function isAiDay(day: string): boolean {
  return new Date(day + "T00:00:00Z").getUTCDay() === 0;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function questionFor(day: string): string {
  const n = Math.floor(Date.parse(day + "T00:00:00Z") / 864e5);
  if (isAiDay(day)) return AI_QUESTIONS[Math.floor(n / 7) % AI_QUESTIONS.length];
  return QUESTIONS[((n % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length];
}
