# FSD(Feature-Sliced Design)로 인증 시스템 만들기

> 이 가이드는 [GUIDE.md](./GUIDE.md)의 후속 문서입니다. 기존 게시물 CRUD 위에 **인증 시스템(회원가입, 로그인, 토큰 갱신, 로그아웃, 라우트 보호)** 을 얹는 과정을 따라 하며, FSD 아키텍처가 새로운 기능 도메인에도 동일하게 적용되는 사고방식을 체득하는 것이 목표입니다.

---

## 목차

- [0. 들어가기 전에](#0-들어가기-전에)
- [1. 인증 시스템의 전체 그림](#1-인증-시스템의-전체-그림)
- [2. Shared Layer — 인증 인프라 구축](#2-shared-layer--인증-인프라-구축)
- [3. Entities Layer — 세션 도메인](#3-entities-layer--세션-도메인)
- [4. Features Layer — 인증 액션](#4-features-layer--인증-액션)
- [5. Pages Layer — 인증 페이지](#5-pages-layer--인증-페이지)
- [6. Widgets & App Layer — 통합](#6-widgets--app-layer--통합)
- [7. 인증 시스템의 FSD 규칙 점검](#7-인증-시스템의-fsd-규칙-점검)
- [8. 정리 — CRUD에서 인증으로 확장하는 사고 과정](#8-정리--crud에서-인증으로-확장하는-사고-과정)

---

## 0. 들어가기 전에

### 0.1 이 가이드의 목적

[GUIDE.md](./GUIDE.md)에서는 게시물 CRUD를 만들며 FSD의 기본 패턴을 배웠습니다. 이번에는 **완전히 다른 도메인인 인증 시스템**을 같은 FSD 아키텍처에 맞추어 구현합니다.

핵심 질문은 이것입니다:

> **"기존 CRUD 구조 위에 인증을 얹을 때, 각 코드는 어디에 놓아야 하는가?"**

CRUD에서 배운 패턴(query key factory, mutation 훅, 폼 컴포넌트, 페이지 조립)이 인증에서도 그대로 재사용되는 것을 확인하고, 인증만의 새로운 패턴(토큰 저장, API 인터셉터, 라우트 가드)이 FSD 어디에 위치하는지를 파악하는 것이 이 가이드의 목적입니다.

### 0.2 사전 요구사항

- [GUIDE.md](./GUIDE.md)를 완료하고 게시물 CRUD가 동작하는 상태
- FSD 핵심 규칙 3가지를 이해하고 있는 상태:
  1. Import 방향은 상위 → 하위만 허용
  2. 모든 슬라이스는 `index.ts`를 통해서만 접근
  3. 슬라이스 내부는 `model/` `api/` `ui/` 세그먼트로 구성

### 0.3 추가 의존성

인증 시스템에는 쿠키 관리를 위한 패키지가 하나 필요합니다.

```bash
pnpm add js-cookie
pnpm add -D @types/js-cookie
```

- **`js-cookie`**: 브라우저 쿠키를 읽고 쓰는 라이브러리입니다. 직접 `document.cookie`를 파싱하는 것보다 안전하고 편리합니다. `Secure`, `SameSite`, `expires` 같은 쿠키 속성을 객체로 설정할 수 있습니다.

### 0.4 인증 API 스펙

백엔드에 구현된 3개의 인증 엔드포인트를 사용합니다.

| 메서드 | 경로 | 설명 | 요청 본문 | 성공 응답 |
|--------|------|------|-----------|-----------|
| `POST` | `/auth/register` | 회원가입 | `{ email, password, name }` | `201` — `{ id }` |
| `POST` | `/auth/login` | 로그인 | `{ email, password }` | `200` — `{ accessToken, refreshToken }` |
| `POST` | `/auth/refresh` | 토큰 갱신 | `{ refreshToken }` | `200` — `{ accessToken, refreshToken }` |

인증된 요청은 `Authorization: Bearer <accessToken>` 헤더를 포함합니다.

---

## 1. 인증 시스템의 전체 그림

### 1.1 인증이 기존 구조에 미치는 영향

인증을 도입하면 **새로운 파일을 만드는 것**과 **기존 파일을 수정하는 것** 두 가지가 동시에 발생합니다.

| 구분 | 파일 | 설명 |
|------|------|------|
| **새로 만드는 파일** | `shared/types/auth.ts` | AuthTokens 타입 |
| | `shared/lib/token-storage.ts` | 쿠키 기반 토큰 저장소 |
| | `entities/session/**` (4개 파일) | 세션 도메인 |
| | `features/auth/**` (9개 파일) | 인증 액션 (로그인/회원가입/로그아웃) |
| | `pages/auth/**` (3개 파일) | 로그인/회원가입 페이지 |
| | `app/router/guards.ts` | 라우트 가드 |
| | `app/router/routes/auth.ts` | 인증 라우트 팩토리 |
| **수정하는 파일** | `shared/api/api-client.ts` | 토큰 첨부 + 401 자동 갱신 |
| | `shared/types/index.ts` | AuthTokens re-export 추가 |
| | `shared/lib/index.ts` | tokenStorage re-export 추가 |
| | `widgets/header/ui/header.tsx` | 인증 상태 기반 UI 분기 |
| | `app/router/routes/posts.ts` | 보호 라우트에 requireAuth 추가 |
| | `app/router/router.tsx` | auth 라우트 통합 |

### 1.2 인증 폴더 트리

인증 관련 파일만 모은 트리입니다. 기존 CRUD 파일은 생략했습니다.

```
src/
├── app/
│   └── router/
│       ├── guards.ts                    # requireAuth, requireGuest 가드
│       ├── routes/
│       │   ├── auth.ts                  # 인증 라우트 팩토리
│       │   └── posts.ts                 # (수정) beforeLoad 추가
│       └── router.tsx                   # (수정) auth 라우트 통합
│
├── pages/
│   └── auth/
│       ├── ui/
│       │   ├── login-page.tsx           # 로그인 페이지
│       │   └── register-page.tsx        # 회원가입 페이지
│       └── index.ts                     # Public API
│
├── widgets/
│   └── header/
│       └── ui/
│           └── header.tsx               # (수정) 인증 상태 기반 분기
│
├── features/
│   └── auth/
│       ├── model/
│       │   ├── types.ts                 # LoginDto, RegisterDto
│       │   ├── login-schema.ts          # 로그인 유효성 스키마
│       │   └── register-schema.ts       # 회원가입 유효성 스키마
│       ├── api/
│       │   ├── use-login.ts             # 로그인 mutation
│       │   ├── use-register.ts          # 회원가입 mutation
│       │   └── use-logout.ts            # 로그아웃 훅
│       ├── ui/
│       │   ├── login-form.tsx           # 로그인 폼
│       │   ├── register-form.tsx        # 회원가입 폼
│       │   └── logout-button.tsx        # 로그아웃 버튼
│       └── index.ts                     # Public API
│
├── entities/
│   └── session/
│       ├── model/
│       │   └── types.ts                 # Session 타입
│       ├── api/
│       │   ├── session-query-keys.ts    # Query Key Factory
│       │   ├── session-api.ts           # 세션 확인 함수
│       │   └── use-session.ts           # 세션 쿼리 훅
│       └── index.ts                     # Public API
│
└── shared/
    ├── api/
    │   └── api-client.ts                # (수정) 토큰 첨부 + 401 갱신
    ├── types/
    │   ├── auth.ts                      # AuthTokens 인터페이스
    │   └── index.ts                     # (수정) AuthTokens re-export
    └── lib/
        ├── token-storage.ts             # 쿠키 기반 토큰 저장소
        └── index.ts                     # (수정) tokenStorage re-export
```

### 1.3 6가지 핵심 인증 흐름

#### 흐름 1: 회원가입

```
[사용자]  →  RegisterForm  →  POST /auth/register  →  201 Created
                                                          │
                                                     /login 페이지로 이동
```

#### 흐름 2: 로그인

```
[사용자]  →  LoginForm  →  POST /auth/login  →  { accessToken, refreshToken }
                                                      │
                                                tokenStorage.setTokens()
                                                      │
                                              invalidateQueries(session)
                                                      │
                                                 /posts로 이동
```

#### 흐름 3: 인증된 API 요청 (토큰 자동 첨부)

```
[컴포넌트]  →  apiClient("/posts")
                    │
              buildHeaders()
                    │
              tokenStorage.getAccessToken()
                    │
              Authorization: Bearer <token>
                    │
                  fetch()
                    │
                  Server
```

#### 흐름 4: 401 자동 갱신

```
[apiClient]  →  fetch("/posts")  →  401 Unauthorized
                                          │
                                    attemptTokenRefresh()
                                          │
                                    POST /auth/refresh
                                          │
                            ┌─────────────┴─────────────┐
                            │                           │
                      성공 (200)                   실패 (401)
                            │                           │
                    setTokens(새 토큰)           clearTokens()
                            │                           │
                    원래 요청 재시도              원래 401 에러 전파
```

#### 흐름 5: 로그아웃

```
[Logout 버튼 클릭]  →  clearTokens()  →  invalidateQueries(session)  →  clear()
                                                                          │
                                                              모든 캐시 초기화
                                                              헤더 UI 자동 갱신
```

#### 흐름 6: 라우트 보호

```
[사용자가 /posts/create 접속]
         │
    beforeLoad: requireAuth()
         │
    tokenStorage.isAuthenticated()?
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
  통과    throw redirect("/login")
    │
  페이지 렌더링
```

### 1.4 설계 결정 5가지

| # | 결정 | 선택 | 대안 | 이유 |
|---|------|------|------|------|
| 1 | 토큰 저장 위치 | **쿠키** (`js-cookie`) | localStorage, 메모리 | `Secure`/`SameSite` 속성으로 CSRF 방어, 새로고침 후 유지 |
| 2 | 인증 상태 관리 | **TanStack Query** (`useSession`) | React Context/Provider | 기존 프로젝트와 일관된 패턴, `invalidateQueries`로 자동 갱신 |
| 3 | 토큰 갱신 방식 | **apiClient 인터셉터** | axios interceptor, 별도 미들웨어 | 기존 API 호출 코드 수정 불필요, `fetch` 직접 사용으로 재귀 방지 |
| 4 | 라우트 보호 | **TanStack Router `beforeLoad`** | HOC 래퍼, Route Guard 컴포넌트 | 컴포넌트 렌더링 전 리다이렉트로 깜빡임 없음 |
| 5 | 사용자 정보 | **JWT 디코딩 불필요** (쿠키 존재 여부만 확인) | `/me` API 호출, jwt-decode | 이 프로젝트에서 사용자 프로필이 불필요, 네트워크 왕복 제거 |

---

## 2. Shared Layer — 인증 인프라 구축

인증 시스템의 **기초 인프라**를 Shared 레이어에 구축합니다. 여기서 만드는 것은 인증에 관련된 타입, 토큰 저장소, API 클라이언트의 인증 확장입니다.

왜 Shared 레이어일까요? **토큰 저장소와 인증 헤더는 entities, features, app 등 여러 레이어에서 필요**합니다. 특정 도메인에 속하지 않는 인프라이므로 Shared가 맞습니다.

### 2.1 인증 타입 (`shared/types/auth.ts`)

```typescript
// src/shared/types/auth.ts

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
```

- `AuthTokens`는 로그인과 토큰 갱신 응답의 형태를 정의합니다.
- 서버가 `{ accessToken: string, refreshToken: string }`을 반환하므로 이에 1:1 매핑됩니다.

> **FSD 포인트**: 왜 `AuthTokens`를 `shared/types`에 두는가? 이 타입은 `shared/lib/token-storage.ts`, `shared/api/api-client.ts`, `features/auth/api/use-login.ts` 등 여러 레이어에서 사용됩니다. 특정 도메인이 아닌 **범용 인프라 타입**이므로 Shared에 두는 것이 맞습니다. CRUD에서 `PaginatedResponse<T>`를 Shared에 둔 것과 같은 원리입니다.

Public API에 추가합니다:

```typescript
// src/shared/types/index.ts

export type { PaginatedResponse } from "./pagination";
export type { AuthTokens } from "./auth";
```

### 2.2 토큰 스토리지 (`shared/lib/token-storage.ts`)

쿠키에 토큰을 읽고 쓰는 **추상화 레이어**입니다.

```typescript
// src/shared/lib/token-storage.ts

import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

const COOKIE_OPTIONS: Cookies.CookieAttributes = {
  expires: 7,
  path: "/",
  sameSite: "strict",
  secure: window.location.protocol === "https:",
};

export const tokenStorage = {
  getAccessToken(): string | null {
    return Cookies.get(ACCESS_TOKEN_KEY) ?? null;
  },

  getRefreshToken(): string | null {
    return Cookies.get(REFRESH_TOKEN_KEY) ?? null;
  },

  setTokens(tokens: { accessToken: string; refreshToken: string }): void {
    Cookies.set(ACCESS_TOKEN_KEY, tokens.accessToken, COOKIE_OPTIONS);
    Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, COOKIE_OPTIONS);
  },

  clearTokens(): void {
    Cookies.remove(ACCESS_TOKEN_KEY, { path: "/" });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: "/" });
  },

  isAuthenticated(): boolean {
    return !!Cookies.get(ACCESS_TOKEN_KEY);
  },
};
```

각 부분을 해설합니다:

- **`COOKIE_OPTIONS` 각 속성**:
  - `expires: 7` — 쿠키 만료일을 7일로 설정합니다. `js-cookie`는 일(day) 단위를 사용합니다.
  - `path: "/"` — 모든 경로에서 쿠키에 접근 가능합니다. 이 설정이 없으면 쿠키가 설정된 경로에서만 접근할 수 있어 라우트 가드에서 읽지 못할 수 있습니다.
  - `sameSite: "strict"` — 같은 사이트의 요청에서만 쿠키가 전송됩니다. CSRF 공격을 방어합니다.
  - `secure: window.location.protocol === "https:"` — production(HTTPS)에서만 `Secure` 플래그를 켭니다. 개발 환경(HTTP)에서는 쿠키가 정상 동작하도록 조건부입니다.

- **plain object 패턴**: `tokenStorage`를 class가 아닌 plain object로 만들었습니다. 인스턴스가 하나뿐이고 상속이 필요 없으므로, 불필요한 `new` 키워드와 `this` 바인딩을 피합니다.

- **`?? null`**: `Cookies.get()`은 쿠키가 없으면 `undefined`를 반환합니다. `?? null`로 명시적으로 `null`을 반환하여, "값이 없음"을 `null`로 통일합니다.

- **`isAuthenticated()`**: accessToken 쿠키의 존재 여부만으로 인증 상태를 판단합니다. 토큰의 유효성(만료 여부)은 서버가 검증합니다.

Public API에 추가합니다:

```typescript
// src/shared/lib/index.ts

export { cn } from "./utils";
export { tokenStorage } from "./token-storage";
```

> **FSD 위반 사례**: `tokenStorage`를 `features/auth/` 안에 만들면 안 됩니다.
>
> ```typescript
> // ❌ shared/api/api-client.ts
> import { tokenStorage } from "@/features/auth"; // shared → features import 불가!
> ```
>
> `apiClient`(shared)가 `tokenStorage`를 사용하려면, `tokenStorage`도 shared에 있어야 합니다. **FSD에서 import는 상위 → 하위 방향만 가능**하므로, shared가 features를 import하는 것은 불가능합니다.

### 2.3 API 클라이언트 인증 확장 (`shared/api/api-client.ts`)

이 섹션이 **챕터 2의 핵심**입니다. 기존 `apiClient`에 토큰 첨부와 401 자동 갱신을 추가합니다.

#### 2.3.1 변경 개요: 원본 vs 인증 버전

[GUIDE.md](./GUIDE.md)에서 만든 원본 `apiClient`와 인증 버전을 비교합니다:

| 항목 | 원본 (GUIDE.md) | 인증 버전 |
|------|-----------------|-----------|
| import | `env`, `ApiError` | + `tokenStorage`, `AuthTokens` |
| `headers` 타입 | `HeadersInit` | `Record<string, string>` |
| 새 함수 | — | `buildHeaders()`, `attemptTokenRefresh()`, `handleResponse()` |
| 모듈 변수 | — | `refreshPromise` (싱글톤) |
| 토큰 첨부 | 없음 | `Authorization: Bearer <token>` 자동 추가 |
| 401 처리 | `ApiError` 던짐 | refresh 시도 → 재시도 또는 에러 |
| Content-Type | 항상 추가 | body가 있을 때만 추가 |

인증 버전의 전체 코드입니다:

```typescript
// src/shared/api/api-client.ts

import { env } from "@/shared/config";
import { tokenStorage } from "@/shared/lib";
import type { AuthTokens } from "@/shared/types";
import { ApiError } from "./api-error";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
};

export function buildUrl(
  path: string,
  params?: RequestOptions["params"],
): string {
  const url = new URL(`${env.API_BASE_URL}${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      tokenStorage.clearTokens();
      return false;
    }

    try {
      const url = buildUrl("/auth/refresh");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        tokenStorage.clearTokens();
        return false;
      }

      const tokens: AuthTokens = await response.json();
      tokenStorage.setTokens(tokens);
      return true;
    } catch {
      tokenStorage.clearTokens();
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function buildHeaders(
  body: unknown,
  headers: Record<string, string> | undefined,
  token: string | null,
): Record<string, string> {
  const h: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorMessage = await response.text().catch(() => undefined);
    throw new ApiError(response.status, response.statusText, errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params, headers } = options;

  const url = buildUrl(path, params);
  const accessToken = tokenStorage.getAccessToken();
  const requestHeaders = buildHeaders(body, headers, accessToken);
  const fetchOptions = {
    method,
    headers: requestHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(url, fetchOptions);

  if (response.status === 401 && accessToken) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const newToken = tokenStorage.getAccessToken();
      const retryHeaders = buildHeaders(body, headers, newToken);
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers: retryHeaders,
      });
      return handleResponse<T>(retryResponse);
    }
  }

  return handleResponse<T>(response);
}
```

이제 각 부분을 상세히 해설합니다.

#### 2.3.2 `buildHeaders()` — 토큰 자동 첨부

```typescript
function buildHeaders(
  body: unknown,
  headers: Record<string, string> | undefined,
  token: string | null,
): Record<string, string> {
  const h: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}
```

- **원본과의 차이**: 원본은 항상 `"Content-Type": "application/json"`을 넣었지만, 인증 버전은 **body가 있을 때만** 추가합니다. GET 요청에는 body가 없으므로 Content-Type이 불필요합니다.
- **`token` 매개변수**: `tokenStorage.getAccessToken()`의 결과를 받습니다. 토큰이 있으면 `Authorization` 헤더를 추가하고, 없으면(로그인 전) 추가하지 않습니다.
- **이 함수를 분리한 이유**: 401 갱신 후 재시도할 때 **새로운 토큰으로 헤더를 다시 빌드**해야 합니다. 헤더 빌드 로직을 함수로 분리하면 `apiClient` 안에서 두 번 호출할 수 있습니다.

#### 2.3.3 `attemptTokenRefresh()` — 401 자동 갱신

```typescript
async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      tokenStorage.clearTokens();
      return false;
    }

    try {
      const url = buildUrl("/auth/refresh");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        tokenStorage.clearTokens();
        return false;
      }

      const tokens: AuthTokens = await response.json();
      tokenStorage.setTokens(tokens);
      return true;
    } catch {
      tokenStorage.clearTokens();
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
```

이 함수의 흐름을 따라가 봅니다:

```
attemptTokenRefresh() 호출
        │
        ├─ refreshPromise가 이미 있는가?
        │   └─ YES → 기존 Promise 반환 (중복 요청 방지)
        │
        ├─ refreshToken이 있는가?
        │   └─ NO → false 반환 (갱신 불가)
        │
        ├─ POST /auth/refresh 요청
        │
        ├─ 응답 성공?
        │   ├─ YES → 새 토큰 저장, true 반환
        │   └─ NO → 토큰 삭제, false 반환
        │
        └─ 네트워크 오류?
            └─ YES → 토큰 삭제, false 반환
```

- **`true` 반환**: 갱신 성공. 호출자(apiClient)가 원래 요청을 재시도합니다.
- **`false` 반환**: 갱신 실패. `clearTokens()`로 로그아웃 효과를 냅니다.
- **`.finally(() => { refreshPromise = null })`**: 성공이든 실패든 완료 후 Promise를 초기화합니다.

#### 2.3.4 `refreshPromise` 싱글톤 패턴 — 동시 갱신 중복 방지

```typescript
let refreshPromise: Promise<boolean> | null = null;
```

왜 이 변수가 필요할까요? 페이지에 여러 API 호출이 동시에 실행될 수 있습니다:

```
[usePost()]     →  GET /posts/1   →  401
[usePosts()]    →  GET /posts     →  401
                                        │
                           두 요청 모두 attemptTokenRefresh() 호출
```

`refreshPromise`가 없으면 **두 번의 갱신 요청**이 서버에 전송됩니다. 첫 번째 갱신이 성공하면 기존 refreshToken은 무효화되므로, 두 번째 갱신은 실패합니다. 이 문제를 방지합니다:

1. 첫 번째 호출: `refreshPromise`가 `null` → 새 Promise 생성하여 저장 → 갱신 요청 실행
2. 두 번째 호출: `refreshPromise`가 이미 있음 → **같은 Promise를 반환** → 추가 요청 없이 첫 번째 결과를 공유
3. 완료 후: `.finally()`에서 `refreshPromise = null`로 초기화

#### 2.3.5 `apiClient()` — 전체 흐름 조합

```typescript
export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params, headers } = options;

  const url = buildUrl(path, params);
  const accessToken = tokenStorage.getAccessToken();
  const requestHeaders = buildHeaders(body, headers, accessToken);
  const fetchOptions = {
    method,
    headers: requestHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(url, fetchOptions);

  if (response.status === 401 && accessToken) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const newToken = tokenStorage.getAccessToken();
      const retryHeaders = buildHeaders(body, headers, newToken);
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers: retryHeaders,
      });
      return handleResponse<T>(retryResponse);
    }
  }

  return handleResponse<T>(response);
}
```

전체 흐름을 정리합니다:

1. **토큰 읽기**: `tokenStorage.getAccessToken()`으로 현재 토큰을 가져옵니다.
2. **헤더 빌드**: `buildHeaders()`로 토큰을 포함한 헤더를 구성합니다.
3. **첫 번째 요청**: `fetch(url, fetchOptions)`.
4. **401 판단**: `response.status === 401 && accessToken` — 토큰이 있었는데(로그인 상태에서) 401이 온 경우에만 갱신을 시도합니다. 토큰 없이 401이 온 경우는 갱신할 필요가 없습니다.
5. **갱신 시도**: `attemptTokenRefresh()`.
6. **재시도**: 갱신 성공 시 **새 토큰으로 헤더를 다시 빌드**하여 같은 요청을 재시도합니다.
7. **응답 처리**: `handleResponse()`에서 에러 검사, 204 처리, JSON 파싱을 수행합니다.

핵심: **기존 코드(entities/post, features/post)는 전혀 수정하지 않습니다.** `getPosts()`, `useCreatePost()` 등은 여전히 `apiClient`를 동일한 방식으로 호출하지만, 내부적으로 토큰 첨부와 401 갱신이 자동으로 처리됩니다.

#### 2.3.6 왜 갱신에 `fetch`를 직접 사용하는가

`attemptTokenRefresh()` 안에서 `apiClient`가 아닌 `fetch`를 직접 사용합니다. 이유:

```typescript
// ❌ 이렇게 하면 안 됩니다
async function attemptTokenRefresh() {
  const tokens = await apiClient<AuthTokens>("/auth/refresh", { ... });
  //                    ↑ apiClient가 또 401이면?
  //                      → attemptTokenRefresh() 다시 호출
  //                      → 무한 재귀!
}
```

`apiClient` → 401 → `attemptTokenRefresh` → `apiClient` → 401 → `attemptTokenRefresh` → ...

**재귀 호출을 방지**하기 위해 갱신 요청은 `fetch`를 직접 사용합니다.

---

## 3. Entities Layer — 세션 도메인

### 3.1 Post vs Session 비교

CRUD에서 만든 `entities/post`와 인증의 `entities/session`을 비교합니다:

| | `entities/post` | `entities/session` |
|---|---|---|
| **데이터 원천** | 서버 (GET /posts) | 클라이언트 (쿠키 확인) |
| **타입 복잡도** | 6개 필드 (id, title, content, ...) | 1개 필드 (`authenticated: true`) |
| **API 함수** | `getPosts()`, `getPostById()` — 서버 호출 | `getCurrentSession()` — 쿠키만 확인 |
| **Query Key** | 계층적 (all, lists, list, details, detail) | 단순 (all, current) |
| **staleTime** | 기본값 (60초) | 5분 |
| **UI 컴포넌트** | `PostCard`, `PostDetailCard` | 없음 |

세션은 "서버에서 데이터를 읽는" 전통적인 entities와 다르지만, **"현재 인증 상태가 무엇인가"** 라는 도메인 정보를 캡슐화하는 역할은 동일합니다.

### 3.2 세션 타입 (`entities/session/model/types.ts`)

```typescript
// src/entities/session/model/types.ts

export interface Session {
  authenticated: true;
}
```

- 왜 이렇게 단순한가? 이 프로젝트에서 세션에 필요한 정보는 "인증되었는가, 아닌가"뿐입니다. 사용자 프로필, 역할(role), 권한(permission) 등은 범위 밖입니다.
- `authenticated: true`는 **리터럴 타입**입니다. Session 객체가 존재하면 항상 `authenticated`는 `true`입니다. 인증되지 않은 상태는 `null`로 표현합니다.

### 3.3 Query Key Factory (`entities/session/api/session-query-keys.ts`)

```typescript
// src/entities/session/api/session-query-keys.ts

export const sessionQueryKeys = {
  all: ["session"] as const,
  current: () => [...sessionQueryKeys.all, "current"] as const,
};
```

CRUD의 `postQueryKeys`와 동일한 팩토리 패턴이지만 훨씬 단순합니다:

| `postQueryKeys` | `sessionQueryKeys` | 이유 |
|---|---|---|
| `all`, `lists()`, `list(params)`, `details()`, `detail(id)` | `all`, `current()` | 세션은 목록/상세 구분이 없음 |

- `all: ["session"]` — 세션 관련 모든 캐시를 무효화할 때 (로그인/로그아웃)
- `current()` — 현재 세션 상태의 캐시 키

### 3.4 세션 API 함수 (`entities/session/api/session-api.ts`)

```typescript
// src/entities/session/api/session-api.ts

import { tokenStorage } from "@/shared/lib";
import type { Session } from "../model/types";

export function getCurrentSession(): Session | null {
  if (!tokenStorage.isAuthenticated()) return null;
  return { authenticated: true };
}
```

- **서버 호출이 없습니다.** `getPosts()`와 달리 `apiClient`를 사용하지 않습니다.
- 왜? 인증 상태는 **쿠키에 accessToken이 있는지 확인**하는 것으로 충분합니다. 별도의 `/me` API를 호출하는 것은 불필요한 네트워크 비용입니다.
- 반환값: 토큰이 있으면 `{ authenticated: true }`, 없으면 `null`.

### 3.5 세션 쿼리 훅 (`entities/session/api/use-session.ts`)

```typescript
// src/entities/session/api/use-session.ts

import { useQuery } from "@tanstack/react-query";
import { sessionQueryKeys } from "./session-query-keys";
import { getCurrentSession } from "./session-api";

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKeys.current(),
    queryFn: getCurrentSession,
    staleTime: 5 * 60 * 1000,
  });
}
```

CRUD의 `usePosts`와 동일한 패턴입니다:

- `queryKey`: Query Key Factory 사용
- `queryFn`: 순수 API 함수 호출
- `staleTime: 5 * 60 * 1000` (5분): 세션 상태는 자주 변하지 않으므로 5분간 캐시합니다. 로그인/로그아웃 시에는 `invalidateQueries`로 즉시 갱신합니다.

**`invalidateQueries` 연동**: features 레이어의 `useLogin`이 `invalidateQueries({ queryKey: sessionQueryKeys.current() })`를 호출하면, 이 훅의 캐시가 무효화되어 `getCurrentSession()`이 다시 실행됩니다. 쿠키에 새 토큰이 저장된 후이므로 `{ authenticated: true }`를 반환하고, 이를 사용하는 Header 컴포넌트가 자동으로 리렌더링됩니다.

### 3.6 Public API (`entities/session/index.ts`)

```typescript
// src/entities/session/index.ts

export type { Session } from "./model/types";
export { useSession } from "./api/use-session";
export { sessionQueryKeys } from "./api/session-query-keys";
```

노출 항목 선택 기준:

- `Session` 타입: 상위 레이어에서 타입 검사에 사용
- `useSession`: 컴포넌트에서 인증 상태를 읽을 때 사용 (widgets/header에서 사용)
- `sessionQueryKeys`: features에서 `invalidateQueries`에 사용 (로그인/로그아웃 시 캐시 무효화)
- `getCurrentSession()`: **노출하지 않음** — 외부에서는 `useSession` 훅을 통해 간접적으로 접근합니다.

> **FSD 위반 사례**: entities에서 토큰을 **변경**하면 안 됩니다.
>
> ```typescript
> // ❌ entities/session/api/session-api.ts
> export function login(dto: LoginDto): Promise<AuthTokens> {
>   const tokens = await apiClient("/auth/login", { body: dto });
>   tokenStorage.setTokens(tokens); // entities에서 데이터 변경!
>   return tokens;
> }
> ```
>
> entities는 **읽기 전용 레이어**입니다. `getCurrentSession()`은 쿠키를 읽기만 합니다. 토큰을 저장하거나 삭제하는 것은 "사용자 액션"이므로 **features 레이어**(로그인, 로그아웃)에서 해야 합니다.

---

## 4. Features Layer — 인증 액션

이 챕터가 가장 깁니다. 로그인, 회원가입, 로그아웃 세 가지 액션의 전체 코드와 해설을 다룹니다.

### 4.1 3개 액션 분리 이유

CRUD에서 Create/Update/Delete를 각각 별도의 파일로 분리한 것처럼, 인증도 각 액션을 분리합니다:

| CRUD 액션 | 인증 액션 | 공통 원리 |
|---|---|---|
| `useCreatePost` | `useLogin` | 서버에 데이터를 보내고 결과를 처리 |
| `useUpdatePost` | `useRegister` | 서버에 데이터를 보내고 결과를 처리 |
| `useDeletePost` | `useLogout` | 상태를 변경 (캐시 무효화) |

> **FSD 포인트**: features 레이어는 **"사용자 액션"** 단위로 구성합니다. "로그인", "회원가입", "로그아웃"은 각각 독립적인 사용자 액션이므로 별도 파일로 분리합니다. 하나의 `useAuth()` 훅에 모두 넣지 않습니다.

### 4.2 요청 DTO 타입 (`features/auth/model/types.ts`)

```typescript
// src/features/auth/model/types.ts

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  id: number;
}
```

CRUD의 `CreatePostDto`와 동일한 패턴입니다. **서버에 보내는 데이터의 모양**을 정의합니다.

| | `LoginDto` | `RegisterDto` | 차이 |
|---|---|---|---|
| `email` | 있음 | 있음 | - |
| `password` | 있음 | 있음 | - |
| `name` | 없음 | **있음** | 회원가입에만 필요 |

- `RegisterResponse`: 회원가입 성공 시 서버가 `{ id: number }`를 반환합니다.
- 로그인 응답(`AuthTokens`)은 `shared/types`에 이미 정의되어 있으므로 여기서 별도로 정의하지 않습니다.

### 4.3 로그인 스키마 (`features/auth/model/login-schema.ts`)

```typescript
// src/features/auth/model/login-schema.ts

import * as yup from "yup";

export const loginSchema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email format"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;
```

CRUD의 `createPostSchema`와 동일한 패턴입니다:

- Yup 스키마로 폼 유효성 검증 규칙을 정의합니다.
- `InferType`으로 스키마에서 **타입을 자동 추론**합니다. `LoginFormValues`는 `{ email: string; password: string }`이 됩니다.
- 이 타입은 `LoginDto`와 동일한 형태이지만, **스키마에서 추론하는 것이 핵심**입니다. 스키마를 수정하면 타입도 자동으로 바뀌어 불일치를 방지합니다.

### 4.4 회원가입 스키마 (`features/auth/model/register-schema.ts`)

```typescript
// src/features/auth/model/register-schema.ts

import * as yup from "yup";

export const registerSchema = yup.object({
  name: yup
    .string()
    .required("Name is required")
    .max(50, "Name must be 50 characters or less"),
  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email format"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters"),
  passwordConfirm: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password")], "Passwords must match"),
});

export type RegisterFormValues = yup.InferType<typeof registerSchema>;
```

로그인 스키마와 비교하여 달라진 점:

- **`name` 필드 추가**: 회원가입에만 필요합니다.
- **`passwordConfirm` 필드**: `oneOf([yup.ref("password")])`는 **크로스 필드 검증**입니다. `password` 필드의 값과 일치하는지 확인합니다. 이것은 Yup의 강력한 기능 중 하나입니다.
- **`passwordConfirm`이 `RegisterDto`에 없는 이유**: 이 필드는 **폼 검증 전용**입니다. 서버에는 `email`, `password`, `name`만 전송합니다. 나중에 `onSubmit`에서 `passwordConfirm`을 제외하고 보냅니다.

### 4.5 로그인 Mutation (`features/auth/api/use-login.ts`)

```typescript
// src/features/auth/api/use-login.ts

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
      tokenStorage.setTokens(tokens);
      queryClient.invalidateQueries({ queryKey: sessionQueryKeys.current() });
    },
  });
}
```

이 파일이 **인증 features의 핵심**입니다. CRUD의 `useCreatePost`와 구조를 비교합니다:

| | `useCreatePost` | `useLogin` |
|---|---|---|
| `mutationFn` | `createPost(dto)` | `login(dto)` |
| `onSuccess` | `invalidateQueries(postQueryKeys.lists())` | `setTokens()` + `invalidateQueries(sessionQueryKeys.current())` |

- **`login` 함수**: `apiClient`를 통해 `POST /auth/login`을 호출합니다. 응답으로 `{ accessToken, refreshToken }`을 받습니다.
- **`onSuccess`에서 두 가지 일이 순서대로 발생합니다**:
  1. `tokenStorage.setTokens(tokens)` — 받은 토큰을 쿠키에 저장합니다.
  2. `invalidateQueries(sessionQueryKeys.current())` — 세션 캐시를 무효화합니다. 이로 인해 `useSession()`이 다시 실행되고, 쿠키에서 토큰을 발견하여 `{ authenticated: true }`를 반환합니다. Header가 자동으로 리렌더링됩니다.

### 4.6 회원가입 Mutation (`features/auth/api/use-register.ts`)

```typescript
// src/features/auth/api/use-register.ts

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import type { RegisterDto, RegisterResponse } from "../model/types";

function register(dto: RegisterDto): Promise<RegisterResponse> {
  return apiClient<RegisterResponse>("/auth/register", {
    method: "POST",
    body: dto,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
  });
}
```

`useLogin`과 비교하면 훨씬 간단합니다:

- **`tokenStorage` 사용 없음**: 회원가입 성공 시 토큰을 받지 않습니다. 자동 로그인이 아니라 로그인 페이지로 이동합니다.
- **`invalidateQueries` 없음**: 세션 상태가 변하지 않습니다.
- **`useQueryClient` 없음**: 캐시 조작이 필요 없으므로 import하지 않습니다.

### 4.7 로그아웃 훅 (`features/auth/api/use-logout.ts`)

```typescript
// src/features/auth/api/use-logout.ts

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/shared/lib";

export function useLogout() {
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    queryClient.clear();
  }, [queryClient]);

  return { logout };
}
```

**설계 결정: 왜 `useMutation`이 아닌 `useCallback`인가?**

| | `useMutation` | `useCallback` |
|---|---|---|
| 서버 요청 | 있음 (POST, DELETE 등) | **없음** |
| 비동기 | 예 | 아니오 |
| isPending/isError | 제공 | 없음 |
| 적합한 경우 | 서버와 통신할 때 | 클라이언트 상태만 변경할 때 |

로그아웃은 **서버 API를 호출하지 않습니다**. 쿠키 삭제와 캐시 초기화만으로 충분합니다. 서버 호출이 없으므로 `useMutation`의 비동기 상태 관리(`isPending`, `isError`)가 불필요합니다.

`logout` 함수가 순서대로 수행하는 2가지:

1. `clearTokens()` — 쿠키에서 accessToken과 refreshToken을 삭제합니다.
2. `queryClient.clear()` — **모든 캐시 데이터를 초기화**합니다. 로그아웃 후 다른 사용자가 로그인할 때 이전 사용자의 데이터가 보이는 것을 방지합니다. `clear()`는 모든 쿼리를 캐시에서 완전히 제거하므로, `invalidateQueries`를 별도로 호출할 필요가 없습니다.

### 4.8 로그인 폼 (`features/auth/ui/login-form.tsx`)

```typescript
// src/features/auth/ui/login-form.tsx

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Button,
  Input,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui";
import { ApiError } from "@/shared/api";
import { loginSchema, type LoginFormValues } from "../model/login-schema";
import { useLogin } from "../api/use-login";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginFormValues) {
    login.mutate(values, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  }

  function getErrorMessage(): string {
    if (!login.error) return "";
    if (login.error instanceof ApiError) {
      if (login.error.status === 401) return "Invalid email or password.";
      if (login.error.status === 400) return "Please check your input.";
    }
    return "Login failed. Please try again.";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={login.isPending} className="w-full">
          {login.isPending ? "Logging in..." : "Login"}
        </Button>

        {login.isError && (
          <p className="text-center text-sm text-destructive">
            {getErrorMessage()}
          </p>
        )}
      </form>
    </Form>
  );
}
```

CRUD의 `CreatePostForm`과 구조가 거의 동일합니다. 차이점을 중심으로 해설합니다:

- **`getErrorMessage()` — 에러 분기 함수**:
  - `ApiError` 인스턴스인지 확인하여 HTTP 상태 코드별로 **사용자 친화적 메시지**를 반환합니다.
  - `401`: "이메일 또는 비밀번호가 올바르지 않습니다"
  - `400`: "입력을 확인해 주세요"
  - 기타: 일반 에러 메시지
  - CRUD의 폼에서는 `"Failed to create post. Please try again."` 하나의 메시지만 사용했지만, 인증에서는 401/400을 구분해야 합니다.

- **`onSuccess` 콜백 패턴**: `login.mutate(values, { onSuccess: () => { ... } })`로 성공 시 동작을 정의합니다. 이 패턴은 `useMutation`의 `onSuccess`와 다릅니다:
  - `useLogin`의 `onSuccess`: 토큰 저장 + 캐시 무효화 (항상 실행)
  - `LoginForm`의 `onSuccess`: 폼 초기화 + 페이지 이동 (폼을 사용하는 쪽에서 정의)

- **`mutate` vs `mutateAsync`**: `CreatePostForm`은 `mutateAsync`를 사용했지만, `LoginForm`은 `mutate`를 사용합니다. 에러를 catch할 필요 없이 `login.isError`/`getErrorMessage()`로 처리하기 때문입니다.

### 4.9 회원가입 폼 (`features/auth/ui/register-form.tsx`)

```typescript
// src/features/auth/ui/register-form.tsx

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Button,
  Input,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui";
import { ApiError } from "@/shared/api";
import {
  registerSchema,
  type RegisterFormValues,
} from "../model/register-schema";
import { useRegister } from "../api/use-register";

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const register = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirm: "",
    },
  });

  function onSubmit(values: RegisterFormValues) {
    register.mutate(
      { name: values.name, email: values.email, password: values.password },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      },
    );
  }

  function getErrorMessage(): string {
    if (!register.error) return "";
    if (register.error instanceof ApiError) {
      if (register.error.status === 409)
        return "This email is already registered.";
      if (register.error.status === 400) return "Please check your input.";
    }
    return "Registration failed. Please try again.";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="passwordConfirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={register.isPending} className="w-full">
          {register.isPending ? "Creating account..." : "Create Account"}
        </Button>

        {register.isError && (
          <p className="text-center text-sm text-destructive">
            {getErrorMessage()}
          </p>
        )}
      </form>
    </Form>
  );
}
```

`LoginForm`과 비교하여 달라진 점:

- **`passwordConfirm` 제외 전송**: `onSubmit`에서 `values`를 그대로 보내지 않고, `{ name, email, password }`만 추출하여 서버에 전송합니다. `passwordConfirm`은 클라이언트 검증 전용이며 서버에 보낼 필요가 없습니다.

  ```typescript
  // ✅ 필요한 필드만 추출하여 전송
  register.mutate(
    { name: values.name, email: values.email, password: values.password },
    { onSuccess: ... }
  );

  // ❌ passwordConfirm이 포함되어 서버에 불필요한 데이터 전송
  register.mutate(values, { onSuccess: ... });
  ```

- **409 에러 처리**: `getErrorMessage()`에서 `409 Conflict`를 처리합니다. 서버가 이미 등록된 이메일로 가입을 시도하면 409를 반환하므로, "This email is already registered." 메시지를 보여줍니다.

### 4.10 로그아웃 버튼 (`features/auth/ui/logout-button.tsx`)

```typescript
// src/features/auth/ui/logout-button.tsx

import { Button } from "@/shared/ui";
import { useLogout } from "../api/use-logout";

export function LogoutButton() {
  const { logout } = useLogout();

  return (
    <Button variant="ghost" size="sm" onClick={logout}>
      Logout
    </Button>
  );
}
```

이 프로젝트에서 **가장 단순한 features UI 컴포넌트**입니다.

- 폼이 없고, 스키마도 없고, 에러 처리도 없습니다.
- 버튼 클릭 → `logout()` 호출 → 끝.
- 그럼에도 이것이 features에 있는 이유는, 로그아웃이 **사용자 액션**(데이터 변경)이기 때문입니다.

### 4.11 Public API (`features/auth/index.ts`)

```typescript
// src/features/auth/index.ts

export { LoginForm } from "./ui/login-form";
export { RegisterForm } from "./ui/register-form";
export { LogoutButton } from "./ui/logout-button";
export { useLogout } from "./api/use-logout";
export type { LoginDto, RegisterDto, RegisterResponse } from "./model/types";
```

노출 항목과 그 이유:

| 노출 항목 | 사용처 | 노출 이유 |
|---|---|---|
| `LoginForm` | `pages/auth/login-page` | 페이지에서 폼을 렌더링 |
| `RegisterForm` | `pages/auth/register-page` | 페이지에서 폼을 렌더링 |
| `LogoutButton` | `widgets/header` | 헤더에서 로그아웃 버튼 표시 |
| `useLogout` | 필요 시 커스텀 UI에서 사용 | 버튼 없이 로그아웃 로직만 필요할 때 |
| `LoginDto`, `RegisterDto`, `RegisterResponse` | 타입 참조용 | |

**`useLogin`과 `useRegister`를 노출하지 않는 이유**: 이 mutation 훅들은 `LoginForm`과 `RegisterForm` 내부에서만 사용됩니다. 외부에서 직접 호출할 필요가 없으므로 Public API에 포함하지 않습니다. CRUD에서도 `useCreatePost`, `useUpdatePost`를 노출하지 않은 것과 같은 원리입니다.

### 로그인 흐름 다이어그램

전체 로그인 흐름을 레이어별로 따라가 봅니다:

```
[사용자가 이메일/비밀번호 입력 후 Login 클릭]
        │
        ▼
┌─ Pages ────────────────────────────────────┐
│  LoginPage                                 │
│  - onSuccess: navigate("/posts")           │
└───────────────┬────────────────────────────┘
                │ onSuccess
                ▼
┌─ Features ─────────────────────────────────┐
│  LoginForm                                 │
│  - yup 스키마로 유효성 검증                   │
│  - useLogin().mutate(values)               │
│  - 성공 시: form.reset() → onSuccess()     │
└───────────────┬────────────────────────────┘
                │ useMutation 내부
                ▼
┌─ Shared ───────────────────────────────────┐
│  apiClient("/auth/login", { POST })        │
└───────────────┬────────────────────────────┘
                │ HTTP POST /auth/login
                ▼
          ┌──────────┐
          │  Server  │
          └────┬─────┘
               │ { accessToken, refreshToken }
               ▼
     tokenStorage.setTokens(tokens)     ← 쿠키에 토큰 저장
               │
     invalidateQueries(session)         ← 세션 캐시 무효화
               │
     useSession() 재실행               ← Header 자동 리렌더링
               │
     navigate("/posts")                ← 게시글 목록으로 이동
```

> **FSD 위반 사례**: `features/auth`에서 `features/post`를 import하면 안 됩니다.
>
> ```typescript
> // ❌ features/auth/api/use-login.ts
> import { postQueryKeys } from "@/features/post"; // 같은 레이어 크로스 import!
>
> onSuccess: () => {
>   queryClient.invalidateQueries({ queryKey: postQueryKeys.all });
> }
> ```
>
> 같은 레이어의 다른 슬라이스를 import하는 것은 FSD 규칙 위반입니다. 로그아웃 시 게시물 캐시를 비우고 싶다면 `queryClient.clear()`로 **모든 캐시를 한번에 초기화**하는 방법을 사용합니다.

---

## 5. Pages Layer — 인증 페이지

### 5.1 로그인 페이지 (`pages/auth/ui/login-page.tsx`)

```typescript
// src/pages/auth/ui/login-page.tsx

import { Link, useNavigate } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

export function LoginPage() {
  const navigate = useNavigate();

  function handleSuccess() {
    navigate({ to: "/posts" });
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm onSuccess={handleSuccess} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-medium underline underline-offset-4"
            >
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- **Card 래핑**: 로그인 폼을 `Card` 컴포넌트로 감싸 시각적 경계를 만듭니다. CRUD의 `PostCreatePage`와 동일한 패턴입니다.
- **`onSuccess` 패턴**: 로그인 성공 시 `/posts`로 이동합니다. 폼은 "어디로 이동하는가"를 모르고, 페이지가 결정합니다.
- **Register 링크**: 계정이 없는 사용자를 위한 네비게이션 링크입니다.

### 5.2 회원가입 페이지 (`pages/auth/ui/register-page.tsx`)

```typescript
// src/pages/auth/ui/register-page.tsx

import { Link, useNavigate } from "@tanstack/react-router";
import { RegisterForm } from "@/features/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

export function RegisterPage() {
  const navigate = useNavigate();

  function handleSuccess() {
    navigate({ to: "/login" });
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm onSuccess={handleSuccess} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium underline underline-offset-4"
            >
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

`LoginPage`와 구조가 거의 동일합니다. 차이점:

- **성공 후 이동**: `/posts`가 아닌 `/login`으로 이동합니다. 회원가입 성공이 자동 로그인은 아닙니다. 사용자가 방금 설정한 자격 증명으로 직접 로그인하도록 유도합니다.
- **Login 링크**: 이미 계정이 있는 사용자를 위한 네비게이션 링크입니다.

### 5.3 Public API (`pages/auth/index.ts`)

```typescript
// src/pages/auth/index.ts

export { LoginPage } from "./ui/login-page";
export { RegisterPage } from "./ui/register-page";
```

### 5.4 패턴 비교: LoginPage vs PostCreatePage

| | `PostCreatePage` | `LoginPage` |
|---|---|---|
| **래핑** | `Card` | `Card` |
| **폼** | `CreatePostForm` | `LoginForm` |
| **onSuccess 인자** | `postId: number` | 없음 |
| **성공 후 이동** | `/posts/$postId` (생성된 게시물 상세) | `/posts` (게시물 목록) |
| **추가 네비게이션** | 없음 | Register 링크 |

> **FSD 포인트**: 두 페이지 모두 동일한 **"접착제" 패턴**을 따릅니다. 페이지는 폼 내부 로직(유효성 검증, API 호출, 에러 처리)을 전혀 모릅니다. 아는 것은 딱 두 가지뿐입니다: (1) 어떤 폼 컴포넌트를 렌더링하는가, (2) 성공하면 어디로 이동하는가.

---

## 6. Widgets & App Layer — 통합

지금까지 만든 인증 기능을 기존 앱에 통합합니다. 기존 파일의 수정(Before/After)이 주요 내용입니다.

### 6.1 헤더 수정 (`widgets/header/ui/header.tsx`)

**Before** (GUIDE.md에서 만든 원본):

```typescript
// src/widgets/header/ui/header.tsx (Before)

import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/posts" className="text-xl font-bold">
          Posts App
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/posts">
            <Button variant="ghost">All Posts</Button>
          </Link>
          <Link to="/posts/create">
            <Button>New Post</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

**After** (인증 적용):

```typescript
// src/widgets/header/ui/header.tsx (After)

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
            <>
              <Link to="/posts">
                <Button variant="ghost">All Posts</Button>
              </Link>
              <Link to="/posts/create">
                <Button>New Post</Button>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
```

변경 사항:

- **import 추가**: `useSession` (entities/session), `LogoutButton` (features/auth)
- **`useSession()` 호출**: 현재 인증 상태를 가져옵니다. `session`이 존재하면 인증됨, `null`이면 비인증.
- **삼항 분기**: `session ? (인증 UI) : (비인증 UI)`
  - **인증 상태**: All Posts, New Post, LogoutButton
  - **비인증 상태**: Login, Register

> **FSD 포인트**: Header(widgets)는 `useSession`(entities)과 `LogoutButton`(features)을 **조합**합니다. widgets는 features와 entities를 import할 수 있으므로 FSD 규칙에 부합합니다.

### 6.2 라우트 가드 (`app/router/guards.ts`)

```typescript
// src/app/router/guards.ts

import { redirect } from "@tanstack/react-router";
import { tokenStorage } from "@/shared/lib";

export function requireAuth() {
  if (!tokenStorage.isAuthenticated()) {
    throw redirect({ to: "/login" });
  }
}

export function requireGuest() {
  if (tokenStorage.isAuthenticated()) {
    throw redirect({ to: "/posts" });
  }
}
```

- **`requireAuth()`**: 인증되지 않은 사용자를 `/login`으로 리다이렉트합니다. 게시물 생성/수정 페이지에 사용됩니다.
- **`requireGuest()`**: 이미 인증된 사용자를 `/posts`로 리다이렉트합니다. 로그인/회원가입 페이지에 사용됩니다. 이미 로그인한 상태에서 다시 로그인 페이지에 접근하는 것을 방지합니다.
- **`throw redirect()`**: TanStack Router의 패턴입니다. `redirect()`를 **throw**하면 라우터가 이를 포착하여 리다이렉트를 수행합니다. 반환(return)이 아니라 던짐(throw)인 이유는, 함수 실행을 즉시 중단하고 라우트 로딩을 취소하기 위함입니다.
- **`tokenStorage`를 직접 사용하는 이유**: `beforeLoad`는 **컴포넌트 밖**에서 실행됩니다. React 훅(`useSession()`)을 사용할 수 없으므로, `tokenStorage.isAuthenticated()`로 직접 쿠키를 확인합니다.

라우트 가드 흐름을 다이어그램으로 보면:

```
[사용자가 URL 접근]
        │
        ▼
  TanStack Router
        │
  beforeLoad 실행
        │
  ┌─────┴─────┐
  │           │
requireAuth  requireGuest
  │           │
  ├─ 토큰 있음? ──→ 통과 (페이지 렌더링)
  │
  └─ 토큰 없음? ──→ throw redirect("/login")
                          │
                    라우터가 포착
                          │
                    /login 으로 이동
                    (페이지 컴포넌트는 렌더링되지 않음)
```

> **FSD 위반 사례**: `guards.ts`에서 `useSession()` React 훅을 쓰면 안 됩니다.
>
> ```typescript
> // ❌ app/router/guards.ts
> import { useSession } from "@/entities/session";
>
> export function requireAuth() {
>   const { data: session } = useSession(); // 컴포넌트 밖에서 훅 호출 불가!
>   if (!session) throw redirect({ to: "/login" });
> }
> ```
>
> `beforeLoad`는 **React 컴포넌트가 아닙니다**. React 훅은 컴포넌트나 다른 훅 안에서만 호출할 수 있습니다. 대신 `tokenStorage.isAuthenticated()`로 직접 쿠키를 확인합니다.

### 6.3 인증 라우트 등록 (`app/router/routes/auth.ts`)

```typescript
// src/app/router/routes/auth.ts

import { createRoute } from "@tanstack/react-router";
import { LoginPage, RegisterPage } from "@/pages/auth";
import { requireGuest } from "../guards";
import type { rootRoute } from "../router";

export const createAuthRoutes = (root: typeof rootRoute) => {
  const loginRoute = createRoute({
    getParentRoute: () => root,
    path: "/login",
    component: LoginPage,
    beforeLoad: requireGuest,
  });

  const registerRoute = createRoute({
    getParentRoute: () => root,
    path: "/register",
    component: RegisterPage,
    beforeLoad: requireGuest,
  });

  return [loginRoute, registerRoute] as const;
};
```

- **`createAuthRoutes` 팩토리 함수**: `createPostRoutes`와 동일한 팩토리 패턴입니다. `rootRoute`를 매개변수로 받아 라우트를 생성하고 반환합니다.
- **`beforeLoad: requireGuest`**: 로그인/회원가입 페이지 모두 `requireGuest`를 적용합니다. 이미 로그인한 사용자가 접근하면 `/posts`로 리다이렉트됩니다.
- **`as const`**: 반환 배열을 튜플 타입으로 만들어, 구조 분해 할당 시 각 요소의 타입이 정확하게 추론됩니다.

### 6.4 기존 라우트 수정 (`app/router/routes/posts.ts`)

**Before** (GUIDE.md 시점 — 라우트가 router.tsx에 직접 정의):

```typescript
// 인증 전: 모든 라우트에 접근 제한 없음
const createPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/create",
  component: PostCreatePage,
  // beforeLoad 없음
});
```

**After** (인증 적용 — 라우트 팩토리 패턴으로 분리):

```typescript
// src/app/router/routes/posts.ts

import { createRoute } from "@tanstack/react-router";
import {
  PostListPage,
  PostDetailPage,
  PostCreatePage,
  PostEditPage,
} from "@/pages/post";
import { requireAuth } from "../guards";
import type { rootRoute } from "../router";

export const createPostRoutes = (root: typeof rootRoute) => {
  const postsRoute = createRoute({
    getParentRoute: () => root,
    path: "/posts",
  });

  const postsListRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "/",
    component: PostListPage,
  });

  const createPostRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "/create",
    component: PostCreatePage,
    beforeLoad: requireAuth,         // ← 추가: 인증 필요
  });

  const postDetailRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "/$postId",
    component: PostDetailPage,
  });

  const postEditRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "/$postId/edit",
    component: PostEditPage,
    beforeLoad: requireAuth,         // ← 추가: 인증 필요
  });

  return postsRoute.addChildren([
    postsListRoute,
    createPostRoute,
    postEditRoute,
    postDetailRoute,
  ]);
};
```

변경 사항:

- **팩토리 패턴으로 분리**: 기존에 `router.tsx`에 직접 정의된 개별 라우트들을 `createPostRoutes` 팩토리 함수로 이동했습니다.
- **중첩 라우트**: `postsRoute`(`/posts`)를 부모로 하여 하위 라우트를 구성합니다. `postsListRoute`의 path가 `"/"`인 것은 `/posts` 자체에 매핑됩니다.
- **`beforeLoad: requireAuth` 추가**: `createPostRoute`(`/posts/create`)와 `postEditRoute`(`/posts/$postId/edit`)에만 인증을 요구합니다. 목록(`/posts`)과 상세(`/posts/$postId`)는 인증 없이 접근 가능합니다.

### 6.5 라우터 통합 (`app/router/router.tsx`)

**Before** (GUIDE.md 시점):

```typescript
// 인증 전: 개별 라우트를 직접 정의하고 routeTree에 추가
import { PostListPage, PostDetailPage, ... } from "@/pages/post";

const postsListRoute = createRoute({ ... });
const createPostRoute = createRoute({ ... });
// ...

const routeTree = rootRoute.addChildren([
  indexRoute,
  postsListRoute,
  createPostRoute,
  postEditRoute,
  postDetailRoute,
]);
```

**After** (인증 적용):

```typescript
// src/app/router/router.tsx

import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { RootLayout } from "../layouts/root-layout";
import { createPostRoutes } from "./routes/posts";
import { createAuthRoutes } from "./routes/auth";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});

const [loginRoute, registerRoute] = createAuthRoutes(rootRoute);

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  createPostRoutes(rootRoute),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

변경 사항 정리:

| 항목 | Before | After |
|------|--------|-------|
| 라우트 정의 | `router.tsx`에 직접 | `routes/posts.ts`, `routes/auth.ts` 팩토리로 분리 |
| `/` 리다이렉트 | `/posts` | **`/login`** |
| auth 라우트 | 없음 | `loginRoute`, `registerRoute` 추가 |
| routeTree | 개별 라우트 나열 | `createPostRoutes()`, `createAuthRoutes()` 조합 |

- **`/` → `/login` 리다이렉트**: 인증 전에는 `/posts`로 갔지만, 인증 후에는 먼저 로그인 페이지로 보냅니다.
- **`createAuthRoutes(rootRoute)`**: 구조 분해 할당으로 `loginRoute`와 `registerRoute`를 꺼냅니다.
- **`createPostRoutes(rootRoute)`**: 팩토리가 중첩 라우트 트리를 반환하므로 routeTree에 직접 넣습니다.

---

## 7. 인증 시스템의 FSD 규칙 점검

### 7.1 Import 방향 검증

인증 관련 파일들의 import가 **하위 레이어만 참조**하는지 확인합니다.

| 파일 위치 (레이어) | import 대상 | 방향 | 결과 |
|---|---|---|---|
| `shared/lib/token-storage.ts` | `js-cookie` (외부 라이브러리) | — | ✅ |
| `shared/api/api-client.ts` | `shared/config`, `shared/lib`, `shared/types` | shared → shared | ✅ |
| `entities/session/api/session-api.ts` | `shared/lib` | entities → shared | ✅ |
| `entities/session/api/use-session.ts` | `@tanstack/react-query` (외부) | — | ✅ |
| `features/auth/api/use-login.ts` | `shared/api`, `shared/lib`, `shared/types`, `entities/session` | features → shared, entities | ✅ |
| `features/auth/api/use-register.ts` | `shared/api` | features → shared | ✅ |
| `features/auth/api/use-logout.ts` | `shared/lib`, `entities/session` | features → shared, entities | ✅ |
| `features/auth/ui/login-form.tsx` | `shared/ui`, `shared/api` | features → shared | ✅ |
| `pages/auth/ui/login-page.tsx` | `features/auth`, `shared/ui` | pages → features, shared | ✅ |
| `widgets/header/ui/header.tsx` | `shared/ui`, `entities/session`, `features/auth` | widgets → shared, entities, features | ✅ |
| `app/router/guards.ts` | `shared/lib` | app → shared | ✅ |
| `app/router/routes/auth.ts` | `pages/auth`, `app/router/guards` | app → pages, app | ✅ |

모든 import가 하향 방향을 준수합니다.

### 7.2 Public API 검증

외부에서 슬라이스 내부 파일에 직접 접근하지 않는지 확인합니다.

✅ 올바른 import:
```typescript
import { useSession, sessionQueryKeys } from "@/entities/session";
import { LoginForm, LogoutButton } from "@/features/auth";
import { LoginPage, RegisterPage } from "@/pages/auth";
import { tokenStorage } from "@/shared/lib";
import type { AuthTokens } from "@/shared/types";
```

❌ 잘못된 import:
```typescript
import { useSession } from "@/entities/session/api/use-session";
import { useLogin } from "@/features/auth/api/use-login";
import { loginSchema } from "@/features/auth/model/login-schema";
```

### 7.3 인증 특화 위반 사례 3가지

**위반 사례 1: `tokenStorage`를 `features/auth`에 두기**

```typescript
// ❌ tokenStorage가 features/auth에 있다면...
// shared/api/api-client.ts
import { tokenStorage } from "@/features/auth"; // shared → features import 불가!
```

`tokenStorage`는 `shared/api/api-client.ts`, `entities/session/api/session-api.ts`, `features/auth/api/use-login.ts`, `app/router/guards.ts` 등 **여러 레이어에서 사용**됩니다. 가장 하위 레이어인 shared에 둬야 모든 레이어에서 접근 가능합니다.

**위반 사례 2: entities에서 토큰 변경**

```typescript
// ❌ entities/session/api/session-api.ts
export function setSession(tokens: AuthTokens) {
  tokenStorage.setTokens(tokens); // entities에서 데이터 변경!
}
```

entities는 **읽기 전용**입니다. 토큰 설정/삭제는 features 레이어의 `useLogin`, `useLogout`에서 수행합니다.

**위반 사례 3: 같은 레이어의 다른 슬라이스 import**

```typescript
// ❌ entities/session/api/use-session.ts
import { postQueryKeys } from "@/entities/post"; // 같은 레이어 크로스 import!
```

같은 레이어끼리 의존하면 슬라이스의 독립성이 깨집니다. 세션과 게시물을 연결해야 한다면 **상위 레이어(widgets, pages)**에서 조합합니다.

### 7.4 크로스 슬라이스 의존성 해결

"로그아웃할 때 게시물 캐시도 비우고 싶다"는 요구사항이 있다면 어떻게 해결할까요?

```typescript
// ❌ features/auth에서 features/post를 import
import { postQueryKeys } from "@/features/post";
```

✅ 해결 방법: **상위 레이어에서 조합**

```typescript
// ✅ features/auth/api/use-logout.ts
export function useLogout() {
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    queryClient.clear();  // ← 모든 캐시를 비움 (postQueryKeys 포함)
  }, [queryClient]);

  return { logout };
}
```

`queryClient.clear()`는 **모든 슬라이스의 캐시를 한번에 초기화**합니다. 특정 슬라이스를 import하지 않고도 목적을 달성할 수 있습니다.

---

## 8. 정리 — CRUD에서 인증으로 확장하는 사고 과정

### 8.1 CRUD와 인증의 FSD 매핑 비교

| 레이어 | 게시물 CRUD | 인증 시스템 |
|--------|------------|------------|
| **shared** | apiClient, PaginatedResponse, shadcn/ui | + AuthTokens, tokenStorage, apiClient 인터셉터 |
| **entities** | Post 타입, query key factory, usePosts/usePost, PostCard | Session 타입, query key factory, useSession |
| **features** | useCreatePost + 폼, useUpdatePost + 폼, useDeletePost + 버튼 | useLogin + 폼, useRegister + 폼, useLogout + 버튼 |
| **widgets** | PostList (목록 + 페이지네이션) | Header 수정 (인증 상태 분기) |
| **pages** | ListPage, DetailPage, CreatePage, EditPage | LoginPage, RegisterPage |
| **app** | router (라우트 등록) | + guards.ts, auth routes, posts에 requireAuth |

### 8.2 기존 패턴 재사용

CRUD에서 학습한 패턴이 인증에서 그대로 반복됩니다:

| CRUD 패턴 | 인증 대응 | 동일한 점 |
|---|---|---|
| `useCreatePost` | `useLogin` | `useMutation` + `onSuccess`에서 캐시 무효화 |
| `CreatePostForm` | `LoginForm` | `useForm` + `yupResolver` + `onSuccess` 콜백 패턴 |
| `createPostSchema` | `loginSchema` | Yup 스키마 + `InferType` 타입 추론 |
| `PostCreatePage` | `LoginPage` | Card 래핑 + Form + onSuccess에서 navigate |
| `postQueryKeys` | `sessionQueryKeys` | Query Key Factory 패턴 |
| `DeletePostButton` | `LogoutButton` | 가장 단순한 features UI (버튼 + 액션) |
| `features/post/index.ts` | `features/auth/index.ts` | UI 컴포넌트만 노출, mutation 훅은 숨김 |

### 8.3 인증만의 새로운 패턴

CRUD에는 없고 인증에서 새롭게 등장한 패턴들:

| 패턴 | 위치 | 설명 |
|------|------|------|
| `tokenStorage` | `shared/lib` | 쿠키 추상화 — 여러 레이어에서 공유 |
| apiClient 인터셉터 | `shared/api` | 토큰 자동 첨부 + 401 갱신 — 기존 코드 수정 불필요 |
| `refreshPromise` 싱글톤 | `shared/api` | 동시 갱신 요청 중복 방지 |
| 라우트 가드 | `app/router` | `beforeLoad` + `throw redirect` — 컴포넌트 렌더링 전 리다이렉트 |
| `useLogout` (useCallback) | `features/auth` | 서버 호출 없는 클라이언트 전용 액션 |
| `queryClient.clear()` | `features/auth` | 크로스 슬라이스 캐시 초기화 |

### 8.4 마무리

FSD로 새 기능을 추가할 때의 사고 과정을 정리합니다:

```
1. "이 코드는 어느 레이어에 속하는가?"

   토큰 저장/읽기       → shared (인프라, 여러 레이어에서 사용)
   세션 상태 읽기       → entities (읽기 전용 도메인)
   로그인/회원가입/로그아웃 → features (사용자 액션)
   로그인/회원가입 화면   → pages (URL 매핑)
   헤더 인증 분기       → widgets (조합)
   라우트 보호         → app (전체 설정)

2. "기존 패턴을 재사용할 수 있는가?"

   useLogin         → useCreatePost와 같은 useMutation 패턴
   LoginForm        → CreatePostForm과 같은 Form 패턴
   sessionQueryKeys → postQueryKeys와 같은 Query Key Factory 패턴

3. "새로운 패턴이 필요한가?"

   tokenStorage     → 새로운 shared/lib 유틸리티
   apiClient 인터셉터 → 기존 코드 확장 (투명하게)
   라우트 가드        → TanStack Router의 beforeLoad 활용

4. "FSD 규칙을 위반하지 않는가?"

   import 방향      → 항상 상위 → 하위
   Public API       → index.ts를 통해서만 접근
   크로스 슬라이스    → 상위 레이어에서 조합
```

이 사고 과정은 인증뿐 아니라, 앞으로 추가할 **어떤 기능(댓글, 알림, 검색 등)** 에도 동일하게 적용됩니다. 핵심은 단 하나입니다:

> **"각 코드가 어디에 있어야 하는가?"** — 이 질문에 대한 답을 레이어와 슬라이스로 제공하는 것이 FSD입니다.
