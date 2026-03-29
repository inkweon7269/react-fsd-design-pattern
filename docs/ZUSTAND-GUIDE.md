# Zustand 적용 가이드

> Zustand 입문자가 단계별로 따라하며 프로젝트에 적용할 수 있는 실습 가이드입니다.

---

## 목차

1. [Zustand란?](#1-zustand란)
2. [우리 프로젝트에서 왜 필요한가?](#2-우리-프로젝트에서-왜-필요한가)
3. [Zustand vs React Query — 역할 구분](#3-zustand-vs-react-query--역할-구분)
4. [FSD 아키텍처에서 스토어 배치 원칙](#4-fsd-아키텍처에서-스토어-배치-원칙)
5. [Step 1: Zustand 설치](#step-1-zustand-설치)
6. [Step 2: Auth Store 만들기](#step-2-auth-store-만들기)
7. [Step 3: Auth Store를 기존 코드에 연동하기](#step-3-auth-store를-기존-코드에-연동하기)
8. [검증하기](#검증하기)
9. [핵심 개념 정리](#핵심-개념-정리)
10. [자주 하는 실수](#자주-하는-실수)

---

## 1. Zustand란?

Zustand(독일어로 "상태")는 React 클라이언트 상태 관리 라이브러리입니다.

**특징:**

- Provider 없이 사용 가능 (Context API와 달리 감싸는 컴포넌트 불필요)
- 아주 적은 보일러플레이트
- React 외부(라우트 가드, 이벤트 핸들러 등)에서도 `getState()`로 접근 가능
- 셀렉터 기반 구독으로 불필요한 리렌더링 방지

**가장 단순한 예시:**

```typescript
import { create } from "zustand";

// 1. 스토어 정의
const useCountStore = create<{ count: number; increment: () => void }>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// 2. 컴포넌트에서 사용
function Counter() {
  const count = useCountStore((s) => s.count);           // 셀렉터로 구독
  const increment = useCountStore((s) => s.increment);   // 액션 가져오기
  return <button onClick={increment}>{count}</button>;
}
```

> `create`로 만든 스토어는 **모듈 레벨 싱글톤**입니다. import만 하면 어디서든 같은 상태를 공유합니다.

---

## 2. 우리 프로젝트에서 왜 필요한가?

현재 프로젝트의 세 가지 불편함을 Zustand로 해결합니다.

### 문제 1: 인증 상태가 여러 파일에 흩어져 있다

현재 `tokenStorage`를 직접 호출하는 파일이 5곳입니다:


| 파일                                    | 호출 메서드                  | 용도             |
| ------------------------------------- | ----------------------- | -------------- |
| `features/auth/api/use-login.ts`      | `setTokens()`           | 로그인 시 토큰 저장    |
| `features/auth/api/use-logout.ts`     | `clearTokens()`         | 로그아웃 시 토큰 제거   |
| `entities/session/api/use-profile.ts` | `isAuthenticated()`     | 프로필 쿼리 활성화 조건  |
| `app/router/guards.ts`               | `isAuthenticated()`     | 라우트 보호         |
| `shared/api/api-client.ts`           | `getAccessToken()` 등    | API 요청 헤더에 토큰 주입 |

> `widgets/header/ui/header.tsx`는 `tokenStorage`를 직접 사용하지 않지만, `useSession()` 쿼리로 인증 여부를 판단하고 있어 네트워크 응답 후에야 상태가 결정됩니다.

**문제:** 쿠키를 직접 읽는 `tokenStorage.isAuthenticated()`는 React의 리렌더링 시스템과 연결되지 않습니다. 로그인 직후 Header가 즉시 업데이트되지 않을 수 있습니다.

**해결:** Auth Store가 `isAuthenticated` 상태를 단일 소스로 관리하면, 상태 변경 시 구독 중인 모든 컴포넌트가 자동으로 리렌더링됩니다.

---

## 3. Zustand vs React Query — 역할 구분

이 프로젝트에서 두 라이브러리는 **다른 종류의 상태**를 담당합니다. 절대로 섞지 마세요.


| 구분         | React Query (TanStack Query) | Zustand                 |
| ---------- | ---------------------------- | ----------------------- |
| **담당**     | 서버 상태 (API 응답 데이터)           | 클라이언트 전용 상태             |
| **예시**     | 게시글 목록, 프로필 정보, 세션 데이터       | 인증 여부, UI 상태 등             |
| **캐싱**     | 자동 (staleTime, refetch)      | 없음 (직접 관리)              |
| **데이터 출처** | HTTP API 응답                  | 사용자 인터랙션, 앱 내부 로직       |
| **유지**     | React Query가 알아서 함           | `set()` 호출로 직접 변경       |


> **원칙:** API에서 가져오는 데이터 = React Query. 브라우저에서만 존재하는 상태 = Zustand.

---

## 4. FSD 아키텍처에서 스토어 배치 원칙

FSD에서 Zustand 스토어는 각 슬라이스의 `model/` 세그먼트에 위치합니다.

```text
src/
├── entities/
│   └── session/
│       └── model/
│           ├── types.ts         # (기존) 타입 정의
│           └── auth-store.ts    # (신규) 인증 상태 스토어
```

**배치 규칙:**

- 특정 도메인에 속하는 상태 → 해당 entity의 `model/` (예: auth → `entities/session/model/`)
- **`features/`에는 스토어를 두지 않습니다** — features는 사용자 액션(mutation)을 담당하고, 상태 자체는 entities가 소유합니다

**FSD import 규칙 복습:**

```text
shared ← entities ← features ← widgets ← pages ← app
(왼쪽을 오른쪽에서 import 가능. 반대는 불가.)
```

따라서:

- `features/auth/`에서 `entities/session/`의 Auth Store를 import ✅
- `shared/api/`에서 `entities/session/`의 Auth Store를 import ❌ (상위 레이어 참조 불가)

---

## Step 1: Zustand 설치

터미널에서 프로젝트 루트 디렉토리로 이동 후 실행합니다:

```bash
pnpm add zustand
```

설치 확인:

```bash
pnpm ls zustand
```

`package.json`의 `dependencies`에 `zustand`가 추가된 것을 확인하세요.

---

## Step 2: Auth Store 만들기

### 2-1. 스토어 파일 생성

**파일:** `src/entities/session/model/auth-store.ts`

```typescript
import { create } from "zustand";
import { tokenStorage } from "@/shared/lib";

// 1. 상태와 액션의 타입을 정의합니다
interface AuthState {
  /** 현재 인증 여부 */
  isAuthenticated: boolean;
  /** 로그인: 토큰을 쿠키에 저장하고 인증 상태를 true로 변경 */
  login: (tokens: { accessToken: string; refreshToken: string }) => void;
  /** 로그아웃: 쿠키의 토큰을 제거하고 인증 상태를 false로 변경 */
  logout: () => void;
  /** 앱 시작 시 쿠키 상태와 스토어를 동기화 */
  hydrate: () => void;
}

// 2. create()로 스토어를 생성합니다
export const useAuthStore = create<AuthState>((set) => ({
  // 초기값: 쿠키에 토큰이 있으면 true, 없으면 false
  isAuthenticated: tokenStorage.isAuthenticated(),

  login: (tokens) => {
    tokenStorage.setTokens(tokens);     // 쿠키에 토큰 저장
    set({ isAuthenticated: true });      // 스토어 상태 업데이트
  },

  logout: () => {
    tokenStorage.clearTokens();          // 쿠키에서 토큰 제거
    set({ isAuthenticated: false });     // 스토어 상태 업데이트
  },

  hydrate: () => {
    // 다른 탭에서 로그아웃한 경우 등, 쿠키와 스토어를 다시 맞춤
    set({ isAuthenticated: tokenStorage.isAuthenticated() });
  },
}));
```

**코드 해설:**


| 부분                                                | 설명                                           |
| ------------------------------------------------- | -------------------------------------------- |
| `create<AuthState>((set) => ({ ... }))`           | 제네릭으로 타입 지정, `set` 함수로 상태 업데이트               |
| `isAuthenticated: tokenStorage.isAuthenticated()` | 스토어 생성 시 쿠키를 읽어 초기값 결정                       |
| `set({ isAuthenticated: true })`                  | 부분 업데이트 — 변경할 필드만 전달하면 됨                     |
| `tokenStorage.setTokens(tokens)`                  | 실제 토큰은 여전히 쿠키에 저장 (Zustand에 토큰 문자열 저장하지 않음!) |


> **왜 토큰을 Zustand에 저장하지 않나요?**
> 쿠키는 HTTP 요청에 자동으로 포함되고, `sameSite`/`secure` 옵션으로 보안을 제어할 수 있습니다.
> Zustand 스토어는 메모리에만 존재하므로 새로고침하면 사라집니다.
> 따라서 토큰은 쿠키, 인증 여부 플래그만 Zustand가 관리합니다.

### 2-2. Public API에 등록

**파일:** `src/entities/session/index.ts`

```typescript
// 기존 export들
export type { Session, UserProfile } from "./model/types";
export { useSession } from "./api/use-session";
export { useProfile } from "./api/use-profile";
export { sessionQueryKeys } from "./api/session-query-keys";
export { ProfileCard } from "./ui/profile-card";

// 추가
export { useAuthStore } from "./model/auth-store";
```

> FSD에서는 슬라이스 외부에서 내부 파일을 직접 import하면 안 됩니다.
> 반드시 `index.ts`를 통해 공개 API로 노출하세요.

---

## Step 3: Auth Store를 기존 코드에 연동하기

이제 `tokenStorage`를 직접 호출하던 곳들을 Auth Store로 교체합니다.

### 3-1. 로그인 훅 수정

**파일:** `src/features/auth/api/use-login.ts`

**변경 전:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";
import { sessionQueryKeys } from "@/entities/session";
import type { AuthTokens } from "@/shared/types";
import type { LoginDto } from "../model/types";

function login(dto: LoginDto): Promise<AuthTokens> {
  return apiClient<AuthTokens>("/auth/login", {
    method: "POST",
    body: dto,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      tokenStorage.setTokens(tokens);                                    // 직접 호출
      queryClient.invalidateQueries({ queryKey: sessionQueryKeys.current() });
      queryClient.resetQueries({
        queryKey: sessionQueryKeys.profile(),
        exact: true,
      });
    },
  });
}
```

**변경 후:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { sessionQueryKeys, useAuthStore } from "@/entities/session";     // 변경
import type { AuthTokens } from "@/shared/types";
import type { LoginDto } from "../model/types";

function login(dto: LoginDto): Promise<AuthTokens> {
  return apiClient<AuthTokens>("/auth/login", {
    method: "POST",
    body: dto,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      useAuthStore.getState().login(tokens);                             // 변경
      queryClient.invalidateQueries({ queryKey: sessionQueryKeys.current() });
      queryClient.resetQueries({
        queryKey: sessionQueryKeys.profile(),
        exact: true,
      });
    },
  });
}
```

**핵심 포인트:**

- `tokenStorage` import 제거, `useAuthStore` import 추가
- `tokenStorage.setTokens(tokens)` → `useAuthStore.getState().login(tokens)`
- `getState()`를 사용하는 이유: `onSuccess` 콜백은 React 컴포넌트 밖이므로 훅 형태로 호출할 수 없음

> **`getState()` vs 훅 호출 — 언제 무엇을 쓰나요?**
>
>
> | 상황                   | 사용법                                      | 예시                  |
> | -------------------- | ---------------------------------------- | ------------------- |
> | React 컴포넌트 안에서 상태 구독 | `useAuthStore((s) => s.isAuthenticated)` | Header, 조건부 렌더링     |
> | React 밖에서 상태 읽기/쓰기   | `useAuthStore.getState()`                | mutation 콜백, 라우트 가드 |
>

### 3-2. 로그아웃 훅 수정

**파일:** `src/features/auth/api/use-logout.ts`

**변경 전:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";

function logout(): Promise<void> {
  return apiClient<void>("/auth/logout", { method: "POST" });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      tokenStorage.clearTokens();         // 직접 호출
      queryClient.clear();
      navigate({ to: "/" });
    },
  });
}
```

**변경 후:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/shared/api";
import { useAuthStore } from "@/entities/session";                       // 변경

function logout(): Promise<void> {
  return apiClient<void>("/auth/logout", { method: "POST" });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAuthStore.getState().logout();   // 변경: 쿠키 제거 + 스토어 업데이트
      queryClient.clear();
      navigate({ to: "/" });
    },
  });
}
```

### 3-3. 프로필 훅 수정

**파일:** `src/entities/session/api/use-profile.ts`

**변경 전:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { tokenStorage } from "@/shared/lib";
import { sessionQueryKeys } from "./session-query-keys";
import { getProfile } from "./profile-api";

export function useProfile() {
  return useQuery({
    queryKey: sessionQueryKeys.profile(),
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
    enabled: tokenStorage.isAuthenticated(),   // 쿠키 직접 확인
  });
}
```

**변경 후:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../model/auth-store";                      // 같은 슬라이스 내부 → 상대 경로
import { sessionQueryKeys } from "./session-query-keys";
import { getProfile } from "./profile-api";

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);        // 훅으로 구독

  return useQuery({
    queryKey: sessionQueryKeys.profile(),
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,                                            // 스토어 상태 사용
  });
}
```

**핵심 포인트:**

- 같은 슬라이스(`entities/session`) 내부이므로 **상대 경로**(`../model/auth-store`) 사용
- React 컴포넌트(훅) 안이므로 `useAuthStore((s) => s.isAuthenticated)` 형태로 **셀렉터 구독**
- `isAuthenticated`가 변경되면 자동으로 `useProfile`이 재평가됨

### 3-4. 라우트 가드 수정

**파일:** `src/app/router/guards.ts`

**변경 전:**

```typescript
import { redirect } from "@tanstack/react-router";
import { tokenStorage } from "@/shared/lib";

export function requireAuth() {
  if (!tokenStorage.isAuthenticated()) {
    throw redirect({ to: "/" });
  }
}

export function requireGuest() {
  if (tokenStorage.isAuthenticated()) {
    throw redirect({ to: "/posts" });
  }
}
```

**변경 후:**

```typescript
import { redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/entities/session";

export function requireAuth() {
  if (!useAuthStore.getState().isAuthenticated) {                        // getState() 사용
    throw redirect({ to: "/" });
  }
}

export function requireGuest() {
  if (useAuthStore.getState().isAuthenticated) {                         // getState() 사용
    throw redirect({ to: "/posts" });
  }
}
```

**핵심 포인트:**

- 라우트 가드는 React 컴포넌트가 아닙니다 → `getState()` 사용
- `app/` 레이어에서 `entities/` import ✅ (하위 레이어 참조)

### 3-5. Header 컴포넌트 수정

**파일:** `src/widgets/header/ui/header.tsx`

**변경 전:**

```typescript
import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui";
import { useSession } from "@/entities/session";
import { LogoutButton } from "@/features/auth";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/posts" className="text-xl font-bold">
          Posts App
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
            // ... 인증된 사용자 메뉴
          ) : (
            // ... 비인증 사용자 메뉴
          )}
        </nav>
      </div>
    </header>
  );
}
```

**변경 후:**

```typescript
import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui";
import { useAuthStore } from "@/entities/session";                       // 변경
import { LogoutButton } from "@/features/auth";

export function Header() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);        // 변경

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/posts" className="text-xl font-bold">
          Posts App
        </Link>
        <nav className="flex items-center gap-4">
          {isAuthenticated ? (                                           // 변경
            <>
              <Button asChild variant="ghost">
                <Link to="/posts">All Posts</Link>
              </Button>
              <Button asChild>
                <Link to="/posts/create">New Post</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/profile">Profile</Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
```

**핵심 포인트:**

- `useSession()` 쿼리 대신 `useAuthStore` 셀렉터 사용
- `useSession()`은 API 호출 후 응답이 와야 상태가 결정되지만, `useAuthStore`는 동기적으로 즉시 값을 반환
- 로그인 직후 Header가 **즉시** 업데이트됨 (네트워크 지연 없음)

---

## 검증하기

모든 변경을 완료한 후 다음 순서로 검증합니다:

```bash
# 1. 타입 에러 없이 빌드되는지 확인
pnpm build

# 2. ESLint 규칙 통과 확인
pnpm lint

# 3. 기존 테스트 통과 확인
pnpm test:run
```

**수동 테스트 체크리스트:**

- 로그인 → Header가 인증된 메뉴로 즉시 전환되는지
- 로그아웃 → Header가 비인증 메뉴로 즉시 전환되는지
- 비인증 상태에서 `/posts/create` 접근 → 로그인 페이지로 리다이렉트
- 인증 상태에서 `/` (로그인 페이지) 접근 → `/posts`로 리다이렉트

---

## 핵심 개념 정리

### Zustand의 두 가지 접근 방식

```typescript
// 방법 1: React 컴포넌트 안에서 — 셀렉터로 구독 (리렌더링 자동 발생)
function MyComponent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  //                                   ↑ 셀렉터 함수
  // isAuthenticated가 바뀔 때만 이 컴포넌트가 리렌더링됨
}

// 방법 2: React 바깥에서 — getState()로 현재 스냅샷 읽기
function routeGuard() {
  const { isAuthenticated } = useAuthStore.getState();
  // 구독 없이 현재 값만 읽음 — 값이 바뀌어도 이 함수가 다시 실행되지 않음
}
```

### 셀렉터의 중요성

```typescript
// 나쁜 예: 스토어 전체를 구독 — 어떤 상태가 바뀌어도 리렌더링
const store = useAuthStore();

// 좋은 예: 필요한 값만 구독 — isAuthenticated가 바뀔 때만 리렌더링
const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
```

### set() 함수의 동작

```typescript
// 부분 업데이트: 전달한 필드만 변경, 나머지는 유지
set({ isAuthenticated: true });

// 이전 상태 기반 업데이트: 콜백으로 현재 상태를 받아 새 상태 반환
set((state) => ({ items: [...state.items, newItem] }));
```

---

## 자주 하는 실수

### 1. 서버 데이터를 Zustand에 넣기

```typescript
// ❌ 잘못된 예: API 응답 데이터를 Zustand에 저장
const usePostStore = create((set) => ({
  posts: [],
  fetchPosts: async () => {
    const res = await apiClient("/posts");
    set({ posts: res.items });
  },
}));

// ✅ 올바른 예: 서버 데이터는 React Query가 관리
const { data } = usePosts({ page: 1, limit: 10 });
```

### 2. 토큰 문자열을 Zustand에 저장

```typescript
// ❌ 잘못된 예: 새로고침하면 토큰이 사라짐
const useAuthStore = create((set) => ({
  accessToken: null,
  setToken: (token) => set({ accessToken: token }),
}));

// ✅ 올바른 예: 토큰은 쿠키, 인증 여부만 Zustand
const useAuthStore = create((set) => ({
  isAuthenticated: tokenStorage.isAuthenticated(),
  login: (tokens) => {
    tokenStorage.setTokens(tokens);     // 쿠키에 저장
    set({ isAuthenticated: true });      // 플래그만 관리
  },
}));
```

### 3. FSD 레이어 규칙 위반

```typescript
// ❌ shared/api/api-client.ts에서 entities 스토어 import
import { useAuthStore } from "@/entities/session";  // shared → entities 불가!

// ✅ shared는 하위 레이어이므로 entities를 참조할 수 없음
// api-client.ts는 기존처럼 tokenStorage를 직접 사용
import { tokenStorage } from "@/shared/lib";
```

### 4. 셀렉터 없이 전체 스토어 구독

```typescript
// ❌ store의 어떤 값이 바뀌어도 리렌더링됨
const { isAuthenticated, login, logout, hydrate } = useAuthStore();

// ✅ 필요한 값만 셀렉터로 가져오기
const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
```

### 5. 컴포넌트 안에서 getState() 사용

```typescript
// ❌ getState()는 구독하지 않으므로 값이 바뀌어도 리렌더링 안 됨
function Header() {
  const { isAuthenticated } = useAuthStore.getState();  // 리렌더링 안 됨!
  return isAuthenticated ? <AuthNav /> : <GuestNav />;
}

// ✅ 컴포넌트에서는 셀렉터 사용
function Header() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);  // 리렌더링 됨
  return isAuthenticated ? <AuthNav /> : <GuestNav />;
}
```

---

## 변경 파일 전체 목록


| 상태  | 파일 경로                                              | 설명                                |
| --- | -------------------------------------------------- | --------------------------------- |
| 신규  | `src/entities/session/model/auth-store.ts`         | Auth Store                        |
| 수정  | `src/entities/session/index.ts`                    | useAuthStore export 추가            |
| 수정  | `src/features/auth/api/use-login.ts`               | tokenStorage → useAuthStore       |
| 수정  | `src/features/auth/api/use-logout.ts`              | tokenStorage → useAuthStore       |
| 수정  | `src/entities/session/api/use-profile.ts`          | tokenStorage → useAuthStore       |
| 수정  | `src/app/router/guards.ts`                         | tokenStorage → useAuthStore       |
| 수정  | `src/widgets/header/ui/header.tsx`                 | useSession → useAuthStore         |
| 유지  | `src/shared/api/api-client.ts`                     | 변경하지 않음 (FSD 규칙)                  |
| 유지  | `src/shared/lib/token-storage.ts`                  | 변경하지 않음 (Auth Store가 내부적으로 사용)    |


