const A = ["Quiet", "Wandering", "Night", "Salt", "Paper", "Amber", "Distant", "Morning", "Lunar", "Rain"];
const B = ["Lighthouse", "Comet", "Harbor", "Kite", "Lantern", "Orchard", "River", "Sparrow", "Atlas", "Cedar"];

export function randomAlias(): string {
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  return `${pick(A)} ${pick(B)} ${1000 + Math.floor(Math.random() * 9000)}`;
}
