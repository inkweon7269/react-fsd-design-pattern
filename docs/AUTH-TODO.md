# TODO: 인증 시스템 구현 체크리스트

## Phase 1: shared 레이어 — 인프라 기반

### 1.1 타입 정의

- [ ] `src/shared/types/auth.ts` 생성
  - [ ] `AuthTokens` 인터페이스 (`accessToken`, `refreshToken`)

- [ ] `src/shared/types/index.ts` 수정 — auth 타입 re-export 추가

### 1.2 토큰 스토리지 유틸리티

- [ ] `src/shared/lib/token-storage.ts` 생성
  - [ ] `js-cookie` 패키지 사용 (`Cookies.get`, `Cookies.set`, `Cookies.remove`)
  - [ ] `getAccessToken()` — `Cookies.get()`으로 accessToken 조회
  - [ ] `getRefreshToken()` — `Cookies.get()`으로 refreshToken 조회
  - [ ] `setTokens({ accessToken, refreshToken })` — `Cookies.set()`으로 토큰 쌍 저장 (`secure`, `sameSite: 'strict'`, `path: '/'`, `expires: 7`)
  - [ ] `clearTokens()` — `Cookies.remove()`로 토큰 쌍 삭제
  - [ ] `isAuthenticated()` — accessToken 쿠키 존재 여부 반환

### 1.3 API 클라이언트 인증 인터셉터

- [ ] `src/shared/api/api-client.ts` 수정
  - [ ] Bearer 토큰 자동 첨부 로직 추가
  - [ ] 401 응답 시 토큰 갱신 후 재시도 로직 추가
  - [ ] `refreshPromise` 변수로 동시 갱신 중복 방지
  - [ ] 갱신 API는 `fetch` 직접 사용 (apiClient 재귀 방지)
  - [ ] 토큰 없이 보낸 요청은 갱신 시도하지 않음

### Phase 1 검증

- [ ] `pnpm build` 타입 체크 통과
- [ ] `pnpm test:run` 기존 테스트 통과

---

## Phase 2: entities 레이어 — 세션 도메인

### 2.1 세션 타입

- [ ] `src/entities/session/model/types.ts` 생성
  - [ ] `Session` 인터페이스 (`id: number`, `email: string`)

### 2.2 세션 API

- [ ] `src/entities/session/api/session-query-keys.ts` 생성
  - [ ] `sessionQueryKeys.all` — `["session"]`
  - [ ] `sessionQueryKeys.current()` — `["session", "current"]`
- [ ] `src/entities/session/api/session-api.ts` 생성
  - [ ] `getCurrentSession()` — tokenStorage에서 쿠키의 JWT 읽어 디코딩
  - [ ] 토큰 없음 → `null` 반환
  - [ ] 토큰 만료 → `null` 반환
  - [ ] 정상 → `Session` 객체 반환

### 2.3 세션 쿼리 훅

- [ ] `src/entities/session/api/use-session.ts` 생성
  - [ ] `useSession()` — TanStack Query 기반, `staleTime: 5분`

### 2.4 공개 API

- [ ] `src/entities/session/index.ts` 생성
  - [ ] `Session` 타입, `useSession`, `sessionQueryKeys` export

### Phase 2 검증

- [ ] `pnpm build` 타입 체크 통과

---

## Phase 3: features 레이어 — 인증 액션

### 3.1 타입 및 스키마

- [ ] `src/features/auth/model/types.ts` 생성
  - [ ] `LoginDto` (`email`, `password`)
  - [ ] `RegisterDto` (`email`, `password`, `name`)
  - [ ] `RegisterResponse` (`id`)
- [ ] `src/features/auth/model/login-schema.ts` 생성
  - [ ] yup 스키마: email(필수, 이메일형식), password(필수, 6자 이상)
  - [ ] `LoginFormValues` 타입 추론
- [ ] `src/features/auth/model/register-schema.ts` 생성
  - [ ] yup 스키마: name(필수, 50자 이하), email(필수), password(필수, 8자 이상), passwordConfirm(필수, password 일치)
  - [ ] `RegisterFormValues` 타입 추론

### 3.2 Mutation 훅

- [ ] `src/features/auth/api/use-login.ts` 생성
  - [ ] `login()` API 함수 — `POST /auth/login`
  - [ ] `useLogin()` — `useMutation` + `onSuccess`에서 토큰 저장 및 세션 쿼리 무효화
- [ ] `src/features/auth/api/use-register.ts` 생성
  - [ ] `register()` API 함수 — `POST /auth/register`
  - [ ] `useRegister()` — `useMutation` (토큰 처리 없음)
- [ ] `src/features/auth/api/use-logout.ts` 생성
  - [ ] `useLogout()` — 토큰 삭제 + 세션 쿼리 무효화 + `queryClient.clear()`

### 3.3 UI 컴포넌트

- [ ] `src/features/auth/ui/login-form.tsx` 생성
  - [ ] react-hook-form + yupResolver 연동
  - [ ] email, password 필드
  - [ ] 제출 중 버튼 비활성화
  - [ ] API 에러 상태별 메시지 (401: 인증 실패, 400: 입력 오류)
  - [ ] `onSuccess` 콜백 prop
- [ ] `src/features/auth/ui/register-form.tsx` 생성
  - [ ] react-hook-form + yupResolver 연동
  - [ ] name, email, password, passwordConfirm 필드
  - [ ] submit 시 `passwordConfirm` 제외하고 DTO 전송
  - [ ] API 에러 상태별 메시지 (409: 중복 이메일)
  - [ ] `onSuccess` 콜백 prop
- [ ] `src/features/auth/ui/logout-button.tsx` 생성
  - [ ] `useLogout()` 연동, Button variant="ghost"

### 3.4 공개 API

- [ ] `src/features/auth/index.ts` 생성
  - [ ] `LoginForm`, `RegisterForm`, `LogoutButton`, `useLogout` export
  - [ ] 타입 export

### Phase 3 검증

- [ ] `pnpm build` 타입 체크 통과

---

## Phase 4: pages 레이어 — 인증 페이지

- [ ] `src/pages/auth/ui/login-page.tsx` 생성
  - [ ] Card 컴포넌트로 래핑
  - [ ] `LoginForm` 사용, `onSuccess` → `/posts` 이동
  - [ ] 회원가입 페이지 링크
- [ ] `src/pages/auth/ui/register-page.tsx` 생성
  - [ ] Card 컴포넌트로 래핑
  - [ ] `RegisterForm` 사용, `onSuccess` → `/login` 이동
  - [ ] 로그인 페이지 링크
- [ ] `src/pages/auth/index.ts` 생성

### Phase 4 검증

- [ ] `pnpm build` 타입 체크 통과

---

## Phase 5: widgets/app 레이어 — 통합

### 5.1 헤더 수정

- [ ] `src/widgets/header/ui/header.tsx` 수정
  - [ ] `useSession()` 임포트 및 사용
  - [ ] 로그인 상태: All Posts / New Post / 이메일 / LogoutButton
  - [ ] 비로그인 상태: Login / Register 버튼

### 5.2 라우트 가드

- [ ] `src/app/router/guards.ts` 생성
  - [ ] `requireAuth()` — 미인증 시 `/login`으로 redirect throw
  - [ ] `requireGuest()` — 인증 시 `/posts`로 redirect throw

### 5.3 라우트 등록

- [ ] `src/app/router/routes/auth.ts` 생성
  - [ ] `/login` 라우트 — `LoginPage`, `beforeLoad: requireGuest`
  - [ ] `/register` 라우트 — `RegisterPage`, `beforeLoad: requireGuest`
- [ ] `src/app/router/router.tsx` 수정
  - [ ] auth 라우트 import 및 routeTree에 추가
- [ ] `src/app/router/routes/posts.ts` 수정
  - [ ] `/posts/create` — `beforeLoad: requireAuth` 추가
  - [ ] `/posts/$postId/edit` — `beforeLoad: requireAuth` 추가

### Phase 5 검증

- [ ] `pnpm build` 타입 체크 통과
- [ ] `pnpm lint` 통과

---

## Phase 6: 테스트 업데이트

- [ ] `src/test/mocks/handlers.ts` 수정
  - [ ] `POST /auth/register` MSW 핸들러 (성공/409 분기)
  - [ ] `POST /auth/login` MSW 핸들러 (성공/401 분기)
  - [ ] `POST /auth/refresh` MSW 핸들러 (성공/401 분기)
- [ ] `src/test/utils.tsx` 수정
  - [ ] `setupAuthenticatedUser()` 헬퍼 (mock JWT 쿠키 토큰 세팅)
  - [ ] `clearAuthenticatedUser()` 헬퍼

### Phase 6 검증

- [ ] `pnpm test:run` 모든 테스트 통과

---

## 최종 검증

- [ ] `pnpm build` — 타입 체크 + 빌드 성공
- [ ] `pnpm lint` — 경고/에러 없음
- [ ] `pnpm test:run` — 모든 테스트 통과
- [ ] `/verify-fsd` — FSD 아키텍처 규칙 준수
- [ ] 수동 테스트: 회원가입 → 로그인 페이지 이동
- [ ] 수동 테스트: 로그인 → 쿠키 토큰 저장, 헤더 변경
- [ ] 수동 테스트: 비인증 `/posts/create` → `/login` 리다이렉트
- [ ] 수동 테스트: 로그아웃 → 쿠키 토큰 삭제, 헤더 원복
- [ ] 수동 테스트: 새로고침 후 인증 상태 유지

---

## 파일 변경 요약

### 새 파일 (23개)

| 레이어 | 파일 |
|---|---|
| shared | `types/auth.ts`, `lib/token-storage.ts` |
| entities | `session/model/types.ts`, `session/api/session-query-keys.ts`, `session/api/session-api.ts`, `session/api/use-session.ts`, `session/index.ts` |
| features | `auth/model/types.ts`, `auth/model/login-schema.ts`, `auth/model/register-schema.ts`, `auth/api/use-login.ts`, `auth/api/use-register.ts`, `auth/api/use-logout.ts`, `auth/ui/login-form.tsx`, `auth/ui/register-form.tsx`, `auth/ui/logout-button.tsx`, `auth/index.ts` |
| pages | `auth/ui/login-page.tsx`, `auth/ui/register-page.tsx`, `auth/index.ts` |
| app | `router/guards.ts`, `router/routes/auth.ts` |

### 수정 파일 (7개)

| 레이어 | 파일 | 변경 내용 |
|---|---|---|
| shared | `types/index.ts` | auth 타입 re-export |
| shared | `lib/index.ts` | tokenStorage re-export |
| shared | `api/api-client.ts` | 인증 인터셉터 추가 |
| widgets | `header/ui/header.tsx` | 인증 상태 기반 UI 분기 |
| app | `router/router.tsx` | auth 라우트 등록 |
| app | `router/routes/posts.ts` | 라우트 가드 추가 |
| test | `mocks/handlers.ts`, `utils.tsx` | auth 테스트 지원 |
