// Terms of Service and Privacy Policy, shown both on their own pages and in the footer pop-ups.
// This is a starting template, written plainly. Have a lawyer review it before a large launch.

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
export const LEGAL_DATE = "2026년 11월 1일 · November 1, 2026";

const contact = (ko: boolean) =>
  CONTACT ? <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a> : ko ? "서비스 안의 신고 버튼" : "the in-app report button";

export function TermsText() {
  return (
    <div className="legal">
      <p className="small muted">시행일 {LEGAL_DATE}</p>
      <h3>1. 서비스</h3>
      <p>Unlabeled(이하 &quot;서비스&quot;)는 AI 분신, 마음의 초상, 오늘의 질문, 익명 1:1 대화, 자동 번역, AI 레시피를 제공하는 SNS입니다. 서비스는 계속 바뀔 수 있고, 일부 기능은 미리 알리고 바꾸거나 멈출 수 있습니다.</p>
      <h3>2. 이용 자격</h3>
      <p>만 18세 이상만 이용할 수 있습니다. 가입하거나 초상을 만들 때 만 18세 이상임을 확인합니다. 18세 미만으로 확인되면 계정을 정지하고 정보를 지웁니다.</p>
      <h3>3. 하면 안 되는 것</h3>
      <ul>
        <li>성적인 내용, 혐오 발언, 폭력·위협, 괴롭힘, 스팸·광고</li>
        <li>돈·선물·개인정보를 요구하는 사기, 다른 사람을 사칭하는 일</li>
        <li>18세 미만과 관련된 성적 내용 (즉시 영구 정지, 필요하면 수사기관에 신고)</li>
        <li>자동 프로그램(봇)으로 초상·번역·대화를 대량으로 만드는 일, 서비스를 공격하거나 우회하는 일</li>
      </ul>
      <p>부적절한 글과 메시지는 자동으로 걸러질 수 있고, 신고된 계정은 확인 후 경고·정지·삭제될 수 있습니다.</p>
      <h3>4. AI가 만든 내용</h3>
      <p>분신의 글, 초상, 번역, 소개는 AI가 만든 것이라 틀리거나 어색할 수 있습니다. 의료·법률·금융 같은 중요한 결정의 근거로 쓰지 마세요. 분신이 소개한 사람을 실제로 만날지는 스스로 판단해 주세요.</p>
      <h3>5. 내 글의 권리</h3>
      <p>내가 쓴 글의 권리는 나에게 있습니다. 다만 서비스가 그 글을 보여 주고, 번역하고, 분신 대화에 쓰는 것을 허락합니다. 공유 카드로 만든 초상은 링크를 가진 누구나 볼 수 있습니다.</p>
      <h3>6. 무료 이용 한도</h3>
      <p>비용과 남용을 막기 위해 초상 생성 등은 하루 이용 횟수가 정해져 있습니다 (현재 하루 2회).</p>
      <h3>7. 탈퇴와 정지</h3>
      <p>언제든 탈퇴하고 정보 삭제를 요청할 수 있습니다: {contact(true)}. 약관을 어기면 미리 알리지 않고 이용을 제한할 수 있습니다.</p>
      <h3>8. 책임의 한계</h3>
      <p>서비스는 있는 그대로 제공됩니다. 다른 이용자의 행동이나 AI가 만든 내용 때문에 생긴 손해는, 법이 허용하는 범위에서 책임지지 않습니다.</p>
      <h3>9. 약관 변경</h3>
      <p>약관을 바꾸면 시행 7일 전에 서비스 안에서 알립니다.</p>

      <h3>Terms of Service (English)</h3>
      <p className="small">You must be 18 or older. Do not post sexual content, hate speech, violence or threats, harassment, scams, spam, or impersonation; anything sexual involving minors means a permanent ban and may be reported to the authorities. No bots or bulk generation. Content may be filtered automatically and reported accounts may be warned, suspended or removed. Twin posts, portraits, translations and introductions are made by AI and can be wrong; do not rely on them for medical, legal or financial decisions. You keep the rights to what you write and let us display, translate and use it in twin conversations. Free features have daily limits (portraits: 2 a day). You can leave and ask us to delete your data at any time: {contact(false)}. The service is provided as is, and to the extent the law allows we are not liable for other users&apos; actions or AI-made content. We announce changes 7 days ahead.</p>
    </div>
  );
}

const rows: [string, string, string][] = [
  ["이메일 주소 (Google 로그인 시 이름·이메일)", "로그인", "탈퇴할 때까지"],
  ["AI에게 받은 답 (붙여 넣은 글)", "마음의 초상과 분신 만들기. 다른 사람에게 보이지 않음", "분신을 지우거나 탈퇴할 때까지. 가입 전 체험의 답은 7일 안에 가입하지 않으면 지움"],
  ["초상 그림과 한 문장", "공유 카드로 보여 주기", "탈퇴할 때까지"],
  ["국적·나이·직업 라벨 (선택)", "두 사람이 모두 원할 때만 서로에게 공개", "탈퇴할 때까지"],
  ["대화 메시지·글", "대화, 번역, 부적절한 내용 자동 확인, 신고 처리", "탈퇴할 때까지"],
  ["신고·차단 기록", "안전한 이용", "탈퇴 후 1년"],
  ["IP 주소의 해시값, 하루 이용 횟수", "무료 이용 한도와 봇 차단", "하루 단위 집계, 원래 주소는 저장하지 않음"],
  ["만 18세 이상·약관 동의 시각", "동의 기록", "탈퇴할 때까지"],
];

export function PrivacyText() {
  return (
    <div className="legal">
      <p className="small muted">시행일 {LEGAL_DATE}</p>
      <table className="small" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th align="left">무엇을</th><th align="left">왜</th><th align="left">언제까지</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]} style={{ borderTop: "1px solid var(--line)" }}>{r.map((c) => <td key={c} style={{ padding: "8px 6px", verticalAlign: "top" }}>{c}</td>)}</tr>)}</tbody>
      </table>
      <p>글과 대화는 번역, 분신 대화, 부적절한 내용 확인을 위해 AI 서비스(Anthropic, 설정한 경우 OpenAI 모더레이션)로 보내지며, 이 회사들의 API 약관상 모델 학습에 쓰이지 않습니다. 데이터는 Supabase(데이터베이스)와 Vercel(서버)에 저장되며, 미국 등 해외 서버에 보관될 수 있습니다. 광고 회사에 개인정보를 팔거나 넘기지 않습니다. 만 18세 미만의 정보는 받지 않으며, 확인되면 지웁니다.</p>
      <p>내 정보를 보거나, 내려받거나, 지우고 싶으면 {contact(true)}으로 알려 주세요. 7일 안에 처리합니다.</p>
      <h3>Privacy Policy (English)</h3>
      <p className="small">We store your email (and name, if you sign in with Google) to sign you in; the AI answer you paste, to draw your portrait and build your twin (never shown to anyone); the portrait and one sentence, shown on your share card; optional labels, revealed only when both people agree; your messages and posts, for chats, translation, automatic safety checks and handling reports; report and block records; a hashed IP and daily usage counts for free limits and bot protection; and when you confirmed you are 18+ and accepted the terms. Text is sent to Anthropic (and OpenAI moderation, if enabled) and is not used to train their models. Data lives on Supabase and Vercel and may be stored outside your country, including the US. We never sell it. We do not knowingly collect data from anyone under 18. To see, export or delete your data, contact {contact(false)}; we act within 7 days. EU/UK residents may also complain to their data protection authority.</p>
    </div>
  );
}
