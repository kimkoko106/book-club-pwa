# 아늑하고 차분한 독서 공동체, 독서토론 PWA 웹앱 📚

본 프로젝트는 Next.js(Turbopack)와 Supabase를 결합하여 모바일 우선으로 구현한 독서 모임 및 1인 독서 관리 PWA(Progressive Web App) 서비스입니다. 세이지 그린과 아이보리 톤의 따뜻한 디자인 시스템 위에, 독서 진척도 관리 및 모임 개설/참여, 그리고 사색 메모와 질문 기반의 깊은 독서 토론 기능을 탑재하고 있습니다.

---

## 🚀 시작하기 (로컬 구동)

프로젝트를 클론한 후 아래 명령어로 개발 서버를 실행하세요:

```bash
# 의존성 패키지 설치
npm install

# 로컬 개발 서버 구동 (기본 포트: 3000)
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 결과를 확인합니다.

---

## ☁️ Supabase 실제 프로젝트 연동 가이드

기본적으로 앱은 더미 데이터 기반의 **Mock 모드**로 작동하도록 구성되어 있습니다. 실제 Supabase 데이터베이스와 회원가입/로그인 인증을 통합하려면 아래 가이드를 엄수하여 설정해 주시기 바랍니다.

### ⚠️ 중요 보안 수칙
* 실제 Supabase API Key 및 비밀번호는 절대 GitHub 등 소스코드 관리 저장소에 커밋하지 마세요.
* 민감한 계정 정보가 포함되는 `.env.local` 파일은 `.gitignore` 필터에 등록되어 있어 외부로 공유되지 않습니다.
* 키 주입 및 설정 예시는 [.env.local.example](file:///.env.local.example) 파일로 관리합니다.

---

### 1단계: Supabase 프로젝트 준비 및 스키마 적용
1. [Supabase](https://supabase.com)에 로그인한 뒤 **[New Project]**를 생성합니다.
2. 생성된 프로젝트 대시보드 좌측 메뉴에서 **SQL Editor**로 이동합니다.
3. **[New query]**를 만들어 프로젝트 루트에 위치한 [schema.sql](file:///C:/Users/ciooi/.gemini/antigravity/scratch/book-club-pwa/supabase/schema.sql) 스크립트 파일 내용을 전체 복사하여 붙여넣습니다.
4. **[Run]** 버튼을 클릭하여 스키마를 생성합니다. (`Success` 메시지 확인)

### 2단계: 데이터베이스 생성물 정상 확인 (Checklist)
SQL 스크립트 실행이 성공하면 아래 객체들이 올바르게 생성되었는지 대시보드에서 체크리스트로 확인합니다.
- [ ] **Table Editor에 생성된 테이블**:
  - `profiles` (사용자 프로필 테이블)
  * `groups` (독서 공간 / 모임 테이블)
  * `group_members` (공간별 구성원 목록)
  * `books` (도서 마스터 정보)
  * `user_books` (개인책장 관계 테이블)
  * `user_book_memos` (사색 메모/일기 테이블)
  * `monthly_books` (모임별 이달의 공유 선정작 테이블)
- [ ] **Database ➔ Triggers에 등록된 트리거**:
  - `on_auth_user_created` (회원 가입 완료 시 유저 닉네임을 `public.profiles` 테이블에 연동해 주는 트리거)
- [ ] **Database ➔ Functions에 등록된 보안 함수**:
  - `public.is_group_member` (RLS 보안 평가 중 무한 재귀 루프를 방지하는 Security Definer 헬퍼)

---

### 3단계: 환경변수 설정 (.env.local)
로컬에 위치한 [.env.local](file:///.env.local) 파일을 열어, 생성한 Supabase 프로젝트의 API 키와 Endpoint 주소, 그리고 발급받은 알라딘 TTB 키 정보를 설정합니다.

```bash
# Supabase 프로젝트 settings ➔ API ➔ Project URL 값 입력
NEXT_PUBLIC_SUPABASE_URL=https://[당신의-프로젝트-id].supabase.co

# Supabase 프로젝트 settings ➔ API ➔ anon public key 값 입력
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...[실제-아논-키]

# Mock 모드를 끄고 실제 Supabase 모드로 전환합니다.
NEXT_PUBLIC_USE_MOCK=false

# 알라딘 책검색 API TTB 키 (서버 Route 호출용, 클라이언트 노출 금지)
ALADIN_TTB_KEY=your_aladin_ttb_key
```

> [!IMPORTANT]
> **Vercel 배포 시 설정**:
> 서비스 배포(Vercel 등) 진행 시, 프로젝트 설정의 **Environment Variables** 메뉴에서 `ALADIN_TTB_KEY`를 동일하게 등록해주셔야 실시간 도서 검색 기능이 정상 동작합니다.


---

## 🧪 실제 연동 전환 후 기능 검증 시나리오

환경변수 수정과 빌드를 완료한 뒤, 아래 절차대로 실제 데이터베이스 연동 테스트를 진행합니다.

### 1. 세션 캐시 및 서비스 워커 리셋 (중요)
* 기존 Mock 세션 데이터나 캐시가 남아 작동을 방해할 수 있습니다.
* 브라우저에서 `F12`를 눌러 개발자 도구를 연 뒤 **Application ➔ Storage ➔ [Clear site data]**를 실행해 깨끗하게 청소해 줍니다.

### 2. 이메일 회원 가입 및 자동 프로필 연동
* 최초 접속 시 `/login` 화면으로 리다이렉트됩니다.
* `[회원가입]` 탭을 클릭하여 유효한 이메일 형식(예: `test@example.com`)과 비밀번호, 닉네임을 적어 가입을 신청합니다.
* 가입 완료 후 Supabase 대시보드 `auth.users` 및 `public.profiles`에 내 계정이 닉네임과 함께 정상 삽입되었는지 체크합니다.

### 3. 개인책장 책 등록 및 진행률 수정 (CUD)
* **등록**: 책방에 입장하여 책을 검색하거나 직접 추가합니다. `books` 마스터 및 `user_books`에 매핑 행이 들어왔는지 확인합니다.
* **수정**: 더보기(`⋯`) 메뉴를 클릭하여 상태를 '읽는 중'으로 변경하고 슬라이더로 진행률을 옮깁니다. 진행률에 따라 내 페이지(`current_page`) 정보가 수치로 자동 역산 저장되는지 검증합니다.
* **삭제**: '삭제하기' 메뉴를 눌렀을 때 내 책장 연결 레코드만 끊기고, 마스터 책 정보는 보존되는지 점검합니다.

### 4. 사색 메모(일기) 연동
* 책장 도서 카드에서 **[메모기록]**을 눌러 아코디언 메뉴를 엽니다.
* 페이지 번호와 감성 사색 문구를 남겨봅니다. `user_book_memos`에 정상 삽입되고 화면의 사색 메모 카운트 수가 일치하여 누적되는지 확인합니다.
* 인라인 수정 폼으로 수정 및 네이티브 확인창을 통한 삭제 액션이 실시간 DB와 싱크를 이루는지 확인합니다.

### 5. 모임방 개설 및 초대코드 가입/진도 실시간 공유
* 모임(`club`) 탭으로 넘어가 모임을 생성해 봅니다. `groups`, `group_members`, `monthly_books` 연쇄 등록을 확인합니다.
* 발급된 6자리 초대 코드를 복사한 뒤, 시크릿 브라우저창에서 다른 이메일 계정으로 로그인해 초대 코드로 가입해 봅니다.
* 두 모임원이 함께 같은 모임 허브 방에 소속되며, 각각의 독서 진행률이 실시간 조인을 거쳐 모임방 진척도 목록에 함께 나열되는지 최종 검증합니다.
