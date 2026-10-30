import type { SetupProblem } from "@/lib/setup";

const ISSUE = {
  missing: "없음 · missing",
  spaces: "앞뒤 공백이나 줄바꿈이 섞임 · contains spaces or line breaks",
  format: "형식이 맞지 않음 · wrong format",
  misnamed: "이름 칸에 키 값이 들어간 변수가 있음 · a variable name looks like a secret",
};

// Shown only to the site owner's eyes in practice: the site cannot work until this is fixed.
export function SetupNotice({ problems }: { problems: SetupProblem[] }) {
  return (
    <main style={{ paddingTop: 48 }}>
      <p className="eyebrow">Unlabeled · setup</p>
      <h1>설정을 마무리해 주세요</h1>
      <p className="muted">Vercel → Settings → Environment Variables 에서 아래 항목을 고친 뒤 Deployments → ⋯ → Redeploy 를 눌러 주세요.</p>
      <ul style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 18 }}>
        {problems.map((p) => (
          <li key={p.name + p.issue}>
            <code>{p.name}</code> — {ISSUE[p.issue]}
          </li>
        ))}
      </ul>
    </main>
  );
}
