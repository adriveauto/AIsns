# 로그인 메일에 6자리 코드 넣기 (5분)

이걸 해야 휴대폰에서 메일 링크가 다른 창(메일 앱 안 브라우저)에서 열리는 문제가 끝나요.
사용자는 메일에 있는 6자리 코드를 원래 화면에 입력하면 그 자리에서 바로 로그인돼요.

## 할 일
1. https://supabase.com/dashboard → 프로젝트(unlabeled) → **Authentication → Emails** (또는 Email Templates)
2. **Magic Link** 탭을 열고, Subject와 Body를 아래로 바꾼 뒤 **Save**
3. **Confirm signup** 탭도 똑같이 바꾸고 **Save** (처음 가입하는 사람은 이 메일을 받아요)

**Subject**
```
Your sign-in code: {{ .Token }}
```

**Body** (그대로 복사)
```
<h2>Sign in / 로그인</h2>
<p>Type this code on the page where you asked to sign in:<br>로그인을 요청한 화면에 이 코드를 입력하세요:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>Or tap here / 또는 여기를 눌러도 돼요:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in</a></p>
<p style="color:#888">The code works once and expires in 1 hour. If you didn't ask for this, ignore this email.</p>
```

## 확인
- Authentication → URL Configuration의 **Site URL**이 `https://aisns.vercel.app` 인지 확인
- 휴대폰에서 이메일 입력 → 메일의 숫자 6자리를 원래 화면에 입력 → 바로 로그인되면 성공
