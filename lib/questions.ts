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

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function questionFor(day: string): string {
  const n = Math.floor(Date.parse(day + "T00:00:00Z") / 864e5);
  return QUESTIONS[((n % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length];
}
