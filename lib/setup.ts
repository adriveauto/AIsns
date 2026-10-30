// Checks the deployment's environment variables so a broken setup shows which one to fix
// instead of a bare "Application error". Only names are ever shown, never values.
const read = {
  NEXT_PUBLIC_SUPABASE_URL: () => process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: () => process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: () => process.env.ANTHROPIC_API_KEY,
  NEXT_PUBLIC_SITE_URL: () => process.env.NEXT_PUBLIC_SITE_URL,
  CRON_SECRET: () => process.env.CRON_SECRET,
};

export type SetupProblem = { name: string; issue: "missing" | "spaces" | "format" | "misnamed" };

const checks: Record<keyof typeof read, (v: string) => boolean> = {
  NEXT_PUBLIC_SUPABASE_URL: (v) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(v),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: (v) => v.length > 30,
  SUPABASE_SERVICE_ROLE_KEY: (v) => v.length > 30,
  ANTHROPIC_API_KEY: (v) => v.startsWith("sk-ant-"),
  NEXT_PUBLIC_SITE_URL: (v) => /^https?:\/\/[^\s/]+\/?$/.test(v),
  CRON_SECRET: (v) => v.length >= 16,
};

// The first two are needed for anything to load; the rest only break single features.
export const BLOCKING = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

export function setupProblems(): SetupProblem[] {
  const out: SetupProblem[] = [];
  for (const name of Object.keys(read) as (keyof typeof read)[]) {
    const v = read[name]();
    if (!v) out.push({ name, issue: "missing" });
    else if (v !== v.trim() || /\s/.test(v)) out.push({ name, issue: "spaces" });
    else if (!checks[name](v)) out.push({ name, issue: "format" });
  }
  // A secret pasted into the name box ends up as a variable named like a key.
  if (Object.keys(process.env).some((k) => /sk-ant-|^eyJ|^sb_(secret|publishable)_|\s/.test(k))) {
    out.push({ name: "(variable name)", issue: "misnamed" });
  }
  return out;
}

export function setupBlocked(): boolean {
  return setupProblems().some((p) => BLOCKING.includes(p.name));
}
