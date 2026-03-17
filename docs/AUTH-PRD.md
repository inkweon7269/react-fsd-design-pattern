# PRD: 인증 시스템 (회원가입 / 로그인 / 토큰 갱신)

## 1. 개요

### 1.1 목적

NestJS 백엔드에 구현된 JWT 기반 인증 API를 React FSD 프론트엔드에 연결하여, 사용자가 회원가입/로그인/로그아웃을 수행하고 인증이 필요한 페이지에 접근할 수 있도록 한다.

### 1.2 배경

- 백엔드 프로젝트(`56-nest-repository-pattern`)에 Auth API 3개가 이미 구현되어 있음
- 현재 프론트엔드는 인증 없이 모든 기능(글 작성/수정/삭제)에 접근 가능
- 인증 도입으로 글 작성/수정은 로그인 사용자만 가능하도록 제한

### 1.3 범위

| 포함 | 미포함 |
|---|---|
| 회원가입 폼 및 API 연동 | 소셜 로그인 (OAuth) |
| 로그인 폼 및 API 연동 | 비밀번호 재설정 |
| JWT 토큰 저장 및 자동 갱신 | 이메일 인증 |
| 인증 상태 기반 UI 분기 | 사용자 프로필 페이지 |
| 라우트 보호 (미인증 시 리다이렉트) | 역할 기반 접근 제어 (RBAC) |
| 로그아웃 | 세션 타임아웃 알림 |

---

## 2. 백엔드 API 명세

### 2.1 회원가입

```text
POST /auth/register
```

| 항목 | 내용 |
|---|---|
| Request Body | `{ email: string, password: string, name: string }` |
| 성공 응답 | `201 Created` — `{ id: number }` |
| 실패 응답 | `400 Bad Request` — 유효성 검증 실패 |
| | `409 Conflict` — 중복된 이메일 |

**유효성 규칙:**
- `email`: 이메일 형식, 필수
- `password`: 최소 8자, 필수
- `name`: 필수

### 2.2 로그인

```text
POST /auth/login
```

| 항목 | 내용 |
|---|---|
| Request Body | `{ email: string, password: string }` |
| 성공 응답 | `200 OK` — `{ accessToken: string, refreshToken: string }` |
| 실패 응답 | `400 Bad Request` — 유효성 검증 실패 |
| | `401 Unauthorized` — 인증 실패 (이메일/비밀번호 불일치) |

### 2.3 토큰 갱신

```text
POST /auth/refresh
```

| 항목 | 내용 |
|---|---|
| Request Body | `{ refreshToken: string }` |
| 성공 응답 | `200 OK` — `{ accessToken: string, refreshToken: string }` |
| 실패 응답 | `400 Bad Request` — 유효성 검증 실패 |
| | `401 Unauthorized` — 유효하지 않은 리프레시 토큰 |

### 2.4 인증된 요청

- 헤더: `Authorization: Bearer <accessToken>`
- JWT 페이로드: `{ sub: number, email: string, iat: number, exp: number }`

---

## 3. 기능 요구사항

### 3.1 회원가입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| REG-01 | 이름, 이메일, 비밀번호, 비밀번호 확인 입력 폼 제공 | P0 |
| REG-02 | 클라이언트 유효성 검증 (이메일 형식, 비밀번호 8자 이상, 비밀번호 일치) | P0 |
| REG-03 | 회원가입 성공 시 로그인 페이지로 이동 | P0 |
| REG-04 | 중복 이메일(409) 에러 시 사용자 친화적 메시지 표시 | P0 |
| REG-05 | 제출 중 버튼 비활성화 및 로딩 표시 | P1 |
| REG-06 | 로그인 페이지 링크 제공 | P1 |

### 3.2 로그인

| ID | 요구사항 | 우선순위 |
|---|---|---|
| LOG-01 | 이메일, 비밀번호 입력 폼 제공 | P0 |
| LOG-02 | 클라이언트 유효성 검증 (이메일 형식, 비밀번호 필수) | P0 |
| LOG-03 | 로그인 성공 시 토큰 쿠키 저장 및 게시글 목록으로 이동 | P0 |
| LOG-04 | 인증 실패(401) 에러 시 사용자 친화적 메시지 표시 | P0 |
| LOG-05 | 제출 중 버튼 비활성화 및 로딩 표시 | P1 |
| LOG-06 | 회원가입 페이지 링크 제공 | P1 |

### 3.3 토큰 관리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| TOK-01 | accessToken, refreshToken을 쿠키에 저장 (`Secure`, `SameSite=Strict`) | P0 |
| TOK-02 | 인증된 API 요청 시 Bearer 토큰 자동 첨부 | P0 |
| TOK-03 | 401 응답 수신 시 refreshToken으로 자동 갱신 후 재시도 | P0 |
| TOK-04 | 동시 다발적 401 응답 시 갱신 요청 중복 방지 | P1 |
| TOK-05 | 갱신 실패 시 토큰 삭제 (자동 로그아웃 효과) | P0 |

### 3.4 로그아웃

| ID | 요구사항 | 우선순위 |
|---|---|---|
| OUT-01 | 로그아웃 버튼 클릭 시 토큰 삭제 | P0 |
| OUT-02 | 로그아웃 시 모든 캐시 데이터 초기화 | P0 |
| OUT-03 | 로그아웃 후 헤더 UI 비인증 상태로 전환 | P0 |

### 3.5 인증 상태 기반 UI

| ID | 요구사항 | 우선순위 |
|---|---|---|
| UI-01 | 헤더: 로그인 상태 — All Posts, New Post, 이메일, Logout 표시 | P0 |
| UI-02 | 헤더: 비로그인 상태 — Login, Register 버튼 표시 | P0 |
| UI-03 | 페이지 새로고침 후에도 인증 상태 유지 | P0 |

### 3.6 라우트 보호

| ID | 요구사항 | 우선순위 |
|---|---|---|
| RTE-01 | `/posts/create`, `/posts/:id/edit` — 미인증 시 `/login`으로 리다이렉트 | P0 |
| RTE-02 | `/login`, `/register` — 인증 상태에서 접근 시 `/posts`로 리다이렉트 | P1 |
| RTE-03 | `/posts`, `/posts/:id` — 인증 여부 무관하게 접근 가능 | P0 |

---

## 4. 기술 설계 결정

### 4.1 토큰 저장: 쿠키 + 추상화 레이어

**결정:** `tokenStorage` 객체로 쿠키 접근을 캡슐화한다. `js-cookie` 패키지를 사용한다.

**근거:**
- 쿠키는 `Secure`, `SameSite=Strict` 속성으로 CSRF 공격 방어 가능
- 페이지 새로고침 시 인증 상태 자동 유지
- 추상화 레이어로 저장 방식 변경 시 영향 최소화
- `js-cookie`로 쿠키 파싱/직렬화 커스텀 코드 제거, 유지보수성 향상

**쿠키 설정:**
- `Secure`: production 환경에서 HTTPS 전송만 허용
- `SameSite=Strict`: CSRF 방어
- `path=/`: 전체 경로에서 접근 가능
- `expires=7`: 7일 (js-cookie 일 단위, refreshToken 기준)

**트레이드오프:** httpOnly 속성은 서버 측 Set-Cookie가 아닌 클라이언트 측 `document.cookie`로 설정하므로 적용 불가. XSS로부터의 토큰 보호는 CSP 헤더 및 입력 이스케이핑으로 완화.

### 4.2 사용자 정보: JWT 디코딩 (별도 API 없음)

**결정:** JWT 페이로드는 base64url 정규화 후 디코딩하거나, 검증된 디코더를 사용한다.

**근거:**
- JWT 페이로드에 필요한 정보(`sub`, `email`)가 이미 포함
- `/me` API 호출 불필요 → 네트워크 왕복 제거
- 외부 라이브러리(jwt-decode 등) 불필요

### 4.3 인증 상태 관리: TanStack Query

**결정:** `useSession()` 훅을 TanStack Query로 구현한다. React Context/Provider 추가하지 않는다.

**근거:**
- 기존 프로젝트가 TanStack Query 기반 → 일관된 패턴
- `invalidateQueries`로 로그인/로그아웃 시 자동 UI 갱신
- Provider 추가 없이 기존 `QueryProvider` 활용

### 4.4 401 자동 갱신: apiClient 인터셉터

**결정:** 기존 `apiClient` 함수에 토큰 첨부 및 401 갱신 로직을 내장한다.

**근거:**
- 기존 API 호출 코드(`features/post`, `entities/post`) 수정 불필요
- 갱신 요청은 `fetch` 직접 사용으로 재귀 호출 방지
- `refreshPromise` 변수로 동시 갱신 요청 중복 방지

### 4.5 라우트 보호: TanStack Router `beforeLoad`

**결정:** `requireAuth()`, `requireGuest()` 가드 함수를 `beforeLoad`에 연결한다.

**근거:**
- TanStack Router 네이티브 기능 활용
- React Context 의존 없이 `tokenStorage`로 직접 판단
- 컴포넌트 렌더링 전 리다이렉트 → 깜빡임 없음

---

## 5. FSD 아키텍처 매핑

```text
app/          ← 라우트 가드, auth 라우트 등록
pages/auth/   ← LoginPage, RegisterPage
widgets/      ← Header (인증 상태 기반 UI 분기)
features/auth/← 로그인/회원가입/로그아웃 mutation + 폼
entities/session/ ← Session 타입, useSession 쿼리
shared/       ← AuthTokens 타입, tokenStorage(쿠키), JWT 디코드, apiClient 인터셉터
```

**FSD 규칙 준수:**
- 모든 임포트는 하향 방향만 허용
- 동일 레이어 크로스 슬라이스 임포트 없음 (`entities/session` ↛ `entities/post`)
- 각 슬라이스는 `index.ts`를 통해 공개 API만 노출

---

## 6. 사용자 플로우

### 6.1 회원가입 플로우

```text
[Register 페이지] → 이름/이메일/비밀번호/확인 입력
    → [제출] → POST /auth/register
        → 성공(201): /login 페이지로 이동
        → 실패(409): "이미 등록된 이메일입니다" 표시
        → 실패(400): 유효성 에러 메시지 표시
```

### 6.2 로그인 플로우

```text
[Login 페이지] → 이메일/비밀번호 입력
    → [제출] → POST /auth/login
        → 성공(200): 토큰 쿠키 저장 → /posts로 이동 → 헤더 갱신
        → 실패(401): "이메일 또는 비밀번호가 올바르지 않습니다" 표시
```

### 6.3 토큰 갱신 플로우

```text
[인증된 API 요청] → 401 응답 수신
    → POST /auth/refresh (refreshToken)
        → 성공(200): 새 토큰 쿠키 저장 → 원래 요청 재시도
        → 실패(401): 토큰 삭제 → 원래 401 에러 전파
```

### 6.4 로그아웃 플로우

```text
[Logout 버튼 클릭]
    → 쿠키 토큰 삭제 → 쿼리 캐시 초기화 → 헤더 비인증 상태 전환
```

---

## 7. 성공 지표

| 지표 | 기준 |
|---|---|
| 빌드 성공 | `pnpm build` 타입 체크 + 빌드 에러 없음 |
| 린트 통과 | `pnpm lint` 경고/에러 없음 |
| 기존 테스트 통과 | `pnpm test:run` 기존 테스트 깨지지 않음 |
| FSD 규칙 준수 | `/verify-fsd` 스킬 통과 |
| 수동 검증 | 회원가입 → 로그인 → 글 작성 → 로그아웃 시나리오 정상 동작 |
