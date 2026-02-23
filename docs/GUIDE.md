# FSD(Feature-Sliced Design)로 게시물 CRUD 만들기

> 이 가이드는 신입 개발자가 처음부터 따라 하며 Feature-Sliced Design 아키텍처를 이해할 수 있도록 작성된 튜토리얼입니다.

---

## 목차

- [0. 들어가기 전에](#0-들어가기-전에)
- [1. FSD 아키텍처 핵심 개념](#1-fsd-아키텍처-핵심-개념)
- [2. Shared Layer — 공통 인프라 구축](#2-shared-layer--공통-인프라-구축)
- [3. 게시물 조회 기능 구현 (Read)](#3-게시물-조회-기능-구현-read)
- [4. 게시물 생성 기능 구현 (Create)](#4-게시물-생성-기능-구현-create)
- [5. 게시물 수정 기능 구현 (Update)](#5-게시물-수정-기능-구현-update)
- [6. 게시물 삭제 기능 구현 (Delete)](#6-게시물-삭제-기능-구현-delete)
- [7. App Layer — 전체 조립](#7-app-layer--전체-조립)
- [8. FSD 규칙 자가 점검 체크리스트](#8-fsd-규칙-자가-점검-체크리스트)
- [9. 정리 — FSD로 새 기능을 추가하는 절차](#9-정리--fsd로-새-기능을-추가하는-절차)

---

## 0. 들어가기 전에

### 이 가이드의 목적

이 가이드는 **"왜 이렇게 하는가"** 와 **"어떻게 만드는가"** 에 집중합니다. 기존의 PRD(요구사항)나 TODO(체크리스트)가 "무엇을 만들 것인가"를 다룬다면, 이 문서는 실제 코드를 한 줄 한 줄 따라 치며 FSD 아키텍처의 사고방식을 체득하는 것이 목표입니다.

### 대상 독자

- React와 TypeScript 기초 문법을 알고 있는 개발자
- TanStack Query(React Query)와 TanStack Router의 기본 개념을 아는 개발자
- 프로젝트 구조를 어떻게 잡아야 할지 고민 중인 주니어 개발자

### 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React | 19 |
| 언어 | TypeScript | 5.9 |
| 빌드 | Vite | 7 |
| 상태 관리 (서버) | TanStack Query | 5 |
| 라우팅 | TanStack Router | 1 |
| UI 컴포넌트 | shadcn/ui (New York) | - |
| 스타일링 | Tailwind CSS | 4 |
| 폼 관리 | react-hook-form + yup | 7 / 1 |

### 서버 API 스펙

이 프로젝트는 간단한 REST API 서버를 사용합니다. 총 5개의 엔드포인트가 있습니다.

| 메서드 | 경로 | 설명 | 요청 본문 | 응답 |
|--------|------|------|-----------|------|
| `GET` | `/posts` | 게시물 목록 조회 (페이지네이션) | - | `{ items, totalElements, page, limit }` |
| `GET` | `/posts/:id` | 게시물 상세 조회 | - | `Post` 객체 |
| `POST` | `/posts` | 게시물 생성 | `{ title, content, isPublished? }` | `{ id }` |
| `PATCH` | `/posts/:id` | 게시물 수정 | `{ title, content, isPublished }` | - (204) |
| `DELETE` | `/posts/:id` | 게시물 삭제 | - | - (204) |

---

## 1. FSD 아키텍처 핵심 개념

### FSD란?

**Feature-Sliced Design(FSD)** 은 프론트엔드 애플리케이션을 레이어와 슬라이스로 구조화하는 아키텍처 방법론입니다. 한 줄로 요약하면:

> **"관심사를 레이어별로 분리하고, 각 레이어 안에서 도메인별로 슬라이스를 나누며, import 방향을 단방향으로 강제하는 아키텍처"**

### 6개 레이어

FSD는 6개의 레이어를 정의합니다. 아래에서 위로 갈수록 더 구체적이고 비즈니스에 가까워집니다.

| 레이어 | 역할 | 이 프로젝트의 예시 |
|--------|------|-------------------|
| **shared** | 프로젝트 전체에서 재사용하는 유틸리티, UI 컴포넌트, 설정 | API 클라이언트, 환경변수, shadcn/ui 컴포넌트 |
| **entities** | 비즈니스 도메인 모델을 표현 (데이터 읽기 전용) | Post 타입, usePost 훅, PostCard UI |
| **features** | 사용자 액션을 처리 (데이터 변경) | 게시물 생성/수정/삭제 폼과 mutation |
| **widgets** | 여러 entities/features를 조합한 독립적인 UI 블록 | PostList (카드 목록 + 페이지네이션) |
| **pages** | URL에 매핑되는 화면 단위 — 위젯과 기능을 조립 | PostListPage, PostDetailPage |
| **app** | 앱 전체 설정 — 라우터, 프로바이더, 레이아웃 | QueryProvider, Router, RootLayout |

### 이 프로젝트의 폴더 트리

```
src/
├── app/                          # 🔴 App Layer
│   ├── layouts/
│   │   └── root-layout.tsx
│   ├── providers/
│   │   ├── query-provider.tsx
│   │   └── index.ts
│   ├── router/
│   │   ├── router.tsx
│   │   └── index.ts
│   ├── app.tsx
│   └── index.ts
│
├── pages/                        # 🟠 Pages Layer
│   └── post/
│       ├── ui/
│       │   ├── post-list-page.tsx
│       │   ├── post-detail-page.tsx
│       │   ├── post-create-page.tsx
│       │   └── post-edit-page.tsx
│       └── index.ts
│
├── widgets/                      # 🟡 Widgets Layer
│   ├── post/
│   │   ├── ui/
│   │   │   └── post-list.tsx
│   │   └── index.ts
│   └── header/
│       ├── ui/
│       │   └── header.tsx
│       └── index.ts
│
├── features/                     # 🟢 Features Layer
│   └── post/
│       ├── model/
│       │   ├── types.ts
│       │   ├── create-post-schema.ts
│       │   └── update-post-schema.ts
│       ├── api/
│       │   ├── use-create-post.ts
│       │   ├── use-update-post.ts
│       │   └── use-delete-post.ts
│       ├── ui/
│       │   ├── create-post-form.tsx
│       │   ├── update-post-form.tsx
│       │   └── delete-post-button.tsx
│       └── index.ts
│
├── entities/                     # 🔵 Entities Layer
│   └── post/
│       ├── model/
│       │   └── types.ts
│       ├── api/
│       │   ├── post-query-keys.ts
│       │   ├── post-api.ts
│       │   ├── use-posts.ts
│       │   └── use-post.ts
│       ├── ui/
│       │   ├── post-card.tsx
│       │   └── post-detail-card.tsx
│       └── index.ts
│
├── shared/                       # 🟣 Shared Layer
│   ├── api/
│   │   ├── api-client.ts
│   │   ├── api-error.ts
│   │   └── index.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── pagination.ts
│   │   └── index.ts
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── ... (shadcn 컴포넌트들)
│   │   └── index.ts
│   └── lib/
│       └── utils.ts
│
└── main.tsx                      # 엔트리포인트
```

### 핵심 규칙 3가지

#### 규칙 1: Import 방향은 상위 → 하위만 허용

```
app  →  pages  →  widgets  →  features  →  entities  →  shared
────────────────────────────────────────────────────────────────→
             import 방향 (오른쪽에 있는 것만 import 가능)
```

- `pages`는 `widgets`, `features`, `entities`, `shared`를 import 할 수 있습니다.
- `entities`는 `shared`만 import 할 수 있습니다.
- `features`는 `entities`와 `shared`를 import 할 수 있습니다.
- **같은 레이어끼리는 import 할 수 없습니다.** (예: `entities/post`가 `entities/user`를 import ❌)

#### 규칙 2: Public API — 모든 슬라이스는 `index.ts`를 통해서만 접근

모든 슬라이스 폴더의 `index.ts`가 외부에 공개할 항목을 명시적으로 re-export 합니다.

```typescript
// ✅ 올바른 import — index.ts(Public API)를 통해 접근
import { PostCard, usePosts } from "@/entities/post";

// ❌ 잘못된 import — 슬라이스 내부 파일에 직접 접근
import { PostCard } from "@/entities/post/ui/post-card";
```

#### 규칙 3: 슬라이스 내부 구조 — `model/` `api/` `ui/` 세그먼트

각 슬라이스는 역할별로 세그먼트(폴더)를 나눕니다.

| 세그먼트 | 역할 | 예시 |
|----------|------|------|
| `model/` | 타입 정의, 유효성 검증 스키마, 상태 관련 로직 | `types.ts`, `create-post-schema.ts` |
| `api/` | 서버 통신 함수, Query/Mutation 훅 | `post-api.ts`, `use-posts.ts` |
| `ui/` | 리액트 컴포넌트 | `post-card.tsx`, `create-post-form.tsx` |

### 왜 이런 규칙이 필요한가?

규칙 없이 자유롭게 import 하면 어떤 문제가 생길까요?

**위반 사례 1: 순환 의존성**
```typescript
// entities/post/ui/post-card.tsx
import { DeletePostButton } from "@/features/post"; // ❌ 하위가 상위를 import

// features/post/ui/delete-post-button.tsx
import { PostCard } from "@/entities/post"; // entities를 import — 순환 발생!
```
→ 두 모듈이 서로를 import하면 번들러 에러나 예측 불가능한 동작이 발생합니다.

**위반 사례 2: 내부 구조 노출**
```typescript
// pages에서 entities 내부 파일을 직접 import
import { getPosts } from "@/entities/post/api/post-api"; // ❌
```
→ 이렇게 하면 entities의 내부 파일 구조를 변경할 때마다 pages도 함께 수정해야 합니다. `index.ts`를 통하면 내부 리팩토링이 외부에 영향을 주지 않습니다.

**위반 사례 3: 같은 레이어끼리 import**
```typescript
// entities/user/api/use-user.ts
import { postQueryKeys } from "@/entities/post"; // ❌ 같은 레이어
```
→ 같은 레이어끼리 의존하면 하나를 수정할 때 다른 것도 연쇄적으로 수정해야 합니다. 슬라이스의 독립성이 깨집니다.

---

## 2. Shared Layer — 공통 인프라 구축

이 단계에서 만드는 것:
- API 클라이언트 (서버와 통신하는 기반 코드)
- 환경 변수 설정
- 공통 타입
- UI 컴포넌트 (shadcn/ui)

Shared 레이어는 프로젝트의 모든 레이어가 의존하는 **최하위 인프라**입니다. 어떤 도메인에도 속하지 않는 순수한 유틸리티와 설정만 담습니다.

### 2.1 API 클라이언트 (`shared/api/`)

서버와 통신하는 모든 코드는 이 shared/api를 통합니다. 상위 레이어들이 fetch를 직접 호출하지 않고, 이 래퍼를 사용하면 에러 처리, 헤더 설정, URL 구성 등을 한 곳에서 관리할 수 있습니다.

#### `api-error.ts` — 커스텀 에러 클래스

서버에서 에러 응답이 올 때 HTTP 상태 코드와 메시지를 함께 담는 에러 클래스입니다. 기본 `Error` 클래스는 상태 코드를 담을 수 없으므로 커스텀 클래스가 필요합니다.

```typescript
// src/shared/api/api-error.ts

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string, message?: string) {
    super(message ?? `API Error: ${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
  }
}
```

- `readonly`로 선언하여 생성 후 변경을 방지합니다.
- `message`가 없으면 기본 메시지를 자동 생성합니다.
- 나중에 UI에서 `error instanceof ApiError`로 타입 검사하여 404, 500 등을 구분할 수 있습니다.

#### `api-client.ts` — 제네릭 fetch 래퍼

이 파일이 shared/api의 핵심입니다. 모든 서버 통신이 이 함수를 통합니다.

```typescript
// src/shared/api/api-client.ts

import { env } from "@/shared/config";
import { ApiError } from "./api-error";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: HeadersInit;
};

function buildUrl(path: string, params?: RequestOptions["params"]): string {
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

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params, headers } = options;

  const url = buildUrl(path, params);

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const errorMessage = await response.text().catch(() => undefined);
    throw new ApiError(response.status, response.statusText, errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

각 부분을 해설합니다:

- **`RequestOptions` 타입**: HTTP 메서드, 요청 본문, 쿼리 파라미터, 헤더를 하나의 객체로 받습니다. `method`의 기본값은 `"GET"`입니다.
- **`buildUrl` 함수**: 환경변수에서 가져온 베이스 URL과 path를 조합하고, `params`의 `undefined` 값은 자동으로 제외합니다. 이렇게 하면 호출하는 쪽에서 조건 분기 없이 깔끔하게 파라미터를 전달할 수 있습니다.
- **제네릭 `<T>`**: 반환 타입을 호출 시점에 지정합니다. 예: `apiClient<Post>("/posts/1")`이면 반환값이 `Promise<Post>`입니다.
- **에러 처리**: `response.ok`가 `false`면 에러 본문을 읽어서 `ApiError`에 전달합니다. `.text().catch(() => undefined)`로 에러 본문 읽기 자체가 실패해도 안전합니다.
- **204 처리**: DELETE나 PATCH의 성공 응답은 본문이 없습니다(`204 No Content`). 이 경우 `response.json()`을 호출하면 에러가 나므로 `undefined`를 반환합니다.

#### `index.ts` — Public API

```typescript
// src/shared/api/index.ts

export { apiClient } from "./api-client";
export { ApiError } from "./api-error";
```

> **FSD 포인트**: 이것이 FSD의 Public API 패턴의 첫 등장입니다. 외부에서는 `@/shared/api`로만 접근하고, 내부 파일 경로(`./api-client`)는 알 필요가 없습니다. 나중에 `api-client.ts`를 axios로 교체하더라도 이 `index.ts`만 수정하면 외부 코드는 영향을 받지 않습니다.

### 2.2 환경 변수 (`shared/config/`)

```typescript
// src/shared/config/env.ts

export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
} as const;
```

- Vite에서는 `import.meta.env.VITE_*`로 환경변수에 접근합니다. (`VITE_` 접두사가 필수)
- `as const`로 객체를 불변으로 만들어 실수로 값을 변경하는 것을 방지합니다.
- 환경변수를 한 곳에 모아두면, 프로젝트 전체에서 `import.meta.env`를 직접 참조하는 대신 이 파일을 통해 일관되게 접근합니다.

```typescript
// src/shared/config/index.ts

export { env } from "./env";
```

### 2.3 공통 타입 (`shared/types/`)

서버의 페이지네이션 응답 구조를 타입으로 정의합니다. 이 타입은 Post뿐 아니라 어떤 도메인이든 페이지네이션이 필요하면 재사용됩니다.

```typescript
// src/shared/types/pagination.ts

export interface PaginatedResponse<T> {
  items: T[];
  totalElements: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
```

- `PaginatedResponse<T>`는 제네릭입니다. `PaginatedResponse<Post>`로 쓰면 `items`가 `Post[]` 타입이 됩니다.
- `PaginationParams`는 요청 시 페이지 번호와 개수를 전달하는 용도입니다.

```typescript
// src/shared/types/index.ts

export type { PaginatedResponse, PaginationParams } from "./pagination";
```

> **FSD 포인트**: `shared/types`에는 특정 도메인에 속하지 않는 **범용 타입**만 둡니다. `Post` 인터페이스는 게시물 도메인에 속하므로 여기가 아니라 `entities/post/model`에 있어야 합니다.

### 2.4 UI 컴포넌트 (`shared/ui/`)

이 프로젝트는 [shadcn/ui](https://ui.shadcn.com)를 사용합니다. shadcn은 복사해서 쓰는 컴포넌트 라이브러리로, 설치하면 소스 코드가 프로젝트에 직접 복사됩니다.

#### shadcn/ui를 FSD 경로에 맞추기

`components.json`에서 shadcn의 설치 경로를 FSD 구조에 맞게 설정합니다:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/shared/ui",
    "utils": "@/shared/lib/utils",
    "ui": "@/shared/ui",
    "lib": "@/shared/lib",
    "hooks": "@/shared/hooks"
  }
}
```

핵심은 `aliases` 설정입니다. 기본값인 `@/components/ui`가 아니라 `@/shared/ui`로 변경하여, shadcn 컴포넌트가 설치될 때 자동으로 `src/shared/ui/` 폴더에 들어가도록 합니다.

#### `index.ts` — 모든 UI 컴포넌트를 한 곳에서 re-export

```typescript
// src/shared/ui/index.ts

export { Button, buttonVariants } from "./button";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
export { Input } from "./input";
export { Textarea } from "./textarea";
export { Label } from "./label";
export { Badge, badgeVariants } from "./badge";
export { Skeleton } from "./skeleton";
export { Separator } from "./separator";
export { Switch } from "./switch";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "./form";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
```

> **FSD 포인트**: 상위 레이어에서 `import { Button, Card } from "@/shared/ui"`처럼 하나의 경로에서 모든 UI 컴포넌트를 가져옵니다. 개별 파일 경로(예: `@/shared/ui/button`)를 import하지 않습니다. 새 shadcn 컴포넌트를 추가하면 이 `index.ts`에 re-export만 추가하면 됩니다.

---

## 3. 게시물 조회 기능 구현 (Read)

첫 번째 기능을 구현합니다. **Entities → Widgets → Pages** 순서로 레이어를 아래에서 위로 쌓아갑니다.

왜 이 순서일까요? 하위 레이어가 먼저 있어야 상위 레이어가 이를 사용할 수 있기 때문입니다. 건물의 기초부터 쌓는 것과 같습니다.

### 3.1 Entities Layer — Post 도메인 정의 (`entities/post/`)

Entities 레이어에는 "게시물(Post)이란 무엇인가"를 정의합니다. 데이터의 모양(타입), 서버에서 데이터를 읽어오는 방법(query), 데이터를 표시하는 UI를 이 레이어에 둡니다.

> **FSD 포인트**: Entities는 **"읽기 전용" 도메인**입니다. 데이터를 읽고(query) 표시(UI)하는 것만 담당합니다. 데이터를 변경하는 mutation(생성/수정/삭제)은 entities가 아닌 features 레이어에 둡니다. 이 분리가 FSD에서 가장 중요한 설계 결정 중 하나입니다.

#### `model/types.ts` — Post 도메인 타입

```typescript
// src/entities/post/model/types.ts

export interface Post {
  id: number;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  isPublished?: boolean;
}
```

- `Post` 인터페이스는 서버 응답의 게시물 객체와 **1:1로 매핑**됩니다. 서버가 반환하는 JSON의 필드와 이름과 타입이 동일합니다.
- `GetPostsParams`는 목록 조회 시 서버에 전달할 쿼리 파라미터입니다. 모든 필드가 `?`(선택적)인 이유는, 아무 파라미터 없이 호출하면 서버가 기본값을 사용하기 때문입니다.

#### `api/post-query-keys.ts` — Query Key 팩토리 패턴

TanStack Query는 `queryKey`로 캐시를 관리합니다. 키를 문자열 배열로 체계적으로 관리하면 **캐시 무효화를 정밀하게 제어**할 수 있습니다.

```typescript
// src/entities/post/api/post-query-keys.ts

import type { GetPostsParams } from "../model/types";

export const postQueryKeys = {
  all: ["posts"] as const,
  lists: () => [...postQueryKeys.all, "list"] as const,
  list: (params: GetPostsParams) => [...postQueryKeys.lists(), params] as const,
  details: () => [...postQueryKeys.all, "detail"] as const,
  detail: (id: number) => [...postQueryKeys.details(), id] as const,
};
```

이 패턴은 **Query Key Factory**라고 불리며, TanStack Query 공식 문서에서도 권장합니다. 각 키의 용도를 설명합니다:

| 키 | 값 (예시) | 용도 |
|----|-----------|------|
| `all` | `["posts"]` | 게시물 관련 모든 캐시를 무효화할 때 |
| `lists()` | `["posts", "list"]` | 목록 캐시만 무효화할 때 |
| `list(params)` | `["posts", "list", { page: 1, limit: 10 }]` | 특정 파라미터의 목록 캐시 |
| `details()` | `["posts", "detail"]` | 모든 상세 캐시를 무효화할 때 |
| `detail(id)` | `["posts", "detail", 42]` | 특정 게시물의 상세 캐시 |

왜 이렇게 계층적으로 구성할까요? 예를 들어 게시물을 삭제한 후 `postQueryKeys.lists()`로 무효화하면, page 1, page 2 등 **모든 목록 캐시**가 한번에 무효화됩니다. 특정 게시물을 수정한 후에는 `postQueryKeys.detail(id)`로 해당 게시물의 상세 캐시만 정밀하게 무효화할 수 있습니다.

#### `api/post-api.ts` — 순수 API 함수

서버와 직접 통신하는 함수입니다. React 훅이 아닌 **순수 함수**로 작성합니다.

```typescript
// src/entities/post/api/post-api.ts

import { apiClient } from "@/shared/api";
import type { PaginatedResponse } from "@/shared/types";
import type { Post, GetPostsParams } from "../model/types";

export function getPosts(
  params: GetPostsParams = {},
): Promise<PaginatedResponse<Post>> {
  return apiClient<PaginatedResponse<Post>>("/posts", {
    params: {
      page: params.page,
      limit: params.limit,
      isPublished: params.isPublished,
    },
  });
}

export function getPostById(id: number): Promise<Post> {
  return apiClient<Post>(`/posts/${id}`);
}
```

- `getPosts`: 2장에서 만든 `apiClient`를 사용합니다. 제네릭으로 `PaginatedResponse<Post>`를 지정하여 반환 타입이 자동으로 추론됩니다. `params` 객체에서 `undefined` 값은 `apiClient`의 `buildUrl`이 자동으로 걸러냅니다.
- `getPostById`: 단일 게시물 조회. 경로 파라미터만 사용하고 쿼리 파라미터는 없습니다.
- 이 함수들은 React에 의존하지 않는 순수 함수이므로 테스트하기도 쉽습니다.

#### `api/use-posts.ts` — 목록 조회 훅

순수 API 함수를 TanStack Query의 `useQuery`로 감싸서 React 컴포넌트에서 사용할 수 있게 합니다.

```typescript
// src/entities/post/api/use-posts.ts

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { GetPostsParams } from "../model/types";
import { postQueryKeys } from "./post-query-keys";
import { getPosts } from "./post-api";

export function usePosts(params: GetPostsParams = {}) {
  return useQuery({
    queryKey: postQueryKeys.list(params),
    queryFn: () => getPosts(params),
    placeholderData: keepPreviousData,
  });
}
```

- `queryKey`: 위에서 만든 Query Key Factory를 사용합니다. `params`가 바뀌면 키가 바뀌고, 새 데이터를 fetch합니다.
- `queryFn`: 실제 데이터를 가져오는 함수. 위에서 만든 `getPosts`를 호출합니다.
- `placeholderData: keepPreviousData`: **페이지네이션의 핵심**입니다. 페이지를 이동할 때 이전 페이지 데이터를 유지하면서 새 데이터를 불러옵니다. 이것이 없으면 페이지를 넘길 때마다 화면이 깜빡이며 로딩 스켈레톤이 보입니다.

#### `api/use-post.ts` — 상세 조회 훅

```typescript
// src/entities/post/api/use-post.ts

import { useQuery } from "@tanstack/react-query";
import { postQueryKeys } from "./post-query-keys";
import { getPostById } from "./post-api";

export function usePost(id: number) {
  return useQuery({
    queryKey: postQueryKeys.detail(id),
    queryFn: () => getPostById(id),
    enabled: id > 0,
  });
}
```

- `enabled: id > 0`: **조건부 쿼리**입니다. `id`가 유효한 값(0보다 큰 수)일 때만 서버 요청을 보냅니다. URL 파라미터를 파싱하는 과정에서 일시적으로 `id`가 0이나 NaN이 될 수 있는데, 그때 불필요한 API 호출을 방지합니다.

#### `ui/post-card.tsx` — 목록용 카드 컴포넌트

```typescript
// src/entities/post/ui/post-card.tsx

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@/shared/ui";
import type { Post } from "../model/types";

interface PostCardProps {
  post: Post;
  onClick?: (postId: number) => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  const formattedDate = new Date(post.createdAt).toLocaleDateString();

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick?.(post.id)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{post.title}</CardTitle>
          <Badge variant={post.isPublished ? "default" : "secondary"}>
            {post.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {post.content}
        </p>
      </CardContent>
    </Card>
  );
}
```

> **FSD 포인트**: Entities의 UI 컴포넌트는 **"데이터를 표시만"** 합니다. `PostCard`는 `Post` 데이터를 받아서 보여주기만 하고, 클릭 시 무엇을 할지는 `onClick` 콜백으로 외부에 위임합니다. "삭제 버튼"이나 "수정 링크" 같은 사용자 액션은 entities에 두지 않습니다.

- `onClick?: (postId: number) => void`: 선택적 콜백으로 클릭 동작을 외부에 위임합니다. 목록에서는 상세 페이지 이동, 다른 곳에서는 다른 동작을 할 수 있습니다.
- shadcn/ui의 `Card`, `Badge` 등을 `@/shared/ui`에서 가져옵니다 (Public API 패턴).
- `line-clamp-3`: 내용이 길면 3줄까지만 보여주고 말줄임표를 표시하는 Tailwind 유틸리티입니다.

#### `ui/post-detail-card.tsx` — 상세용 카드 컴포넌트

```typescript
// src/entities/post/ui/post-detail-card.tsx

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
} from "@/shared/ui";
import type { Post } from "../model/types";

interface PostDetailCardProps {
  post: Post;
}

export function PostDetailCard({ post }: PostDetailCardProps) {
  const createdDate = new Date(post.createdAt).toLocaleDateString();
  const updatedDate = new Date(post.updatedAt).toLocaleDateString();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{post.title}</CardTitle>
          <Badge variant={post.isPublished ? "default" : "secondary"}>
            {post.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <CardDescription>
          Created: {createdDate} | Updated: {updatedDate}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <p className="whitespace-pre-wrap text-base leading-relaxed">
          {post.content}
        </p>
      </CardContent>
    </Card>
  );
}
```

- `PostCard`와 비교하면: `onClick`이 없고(상세 페이지에서 이미 해당 게시물을 보고 있으므로), `line-clamp` 없이 전체 내용을 보여주고, `updatedAt`도 표시합니다.
- `whitespace-pre-wrap`: 서버에서 줄바꿈이 포함된 내용이 올 때 그대로 표시합니다.

#### `index.ts` — Entities 슬라이스의 Public API

```typescript
// src/entities/post/index.ts

export type { Post, GetPostsParams } from "./model/types";

export { usePosts } from "./api/use-posts";
export { usePost } from "./api/use-post";
export { postQueryKeys } from "./api/post-query-keys";

export { PostCard } from "./ui/post-card";
export { PostDetailCard } from "./ui/post-detail-card";
```

외부에 노출할 것만 선별했습니다. 주목할 점:

- `Post` 타입은 `type` 키워드로 re-export합니다 (타입만 내보내기).
- `getPosts`, `getPostById` 같은 순수 API 함수는 **노출하지 않습니다**. 외부에서는 `usePosts`/`usePost` 훅을 통해 간접적으로 사용합니다.
- `postQueryKeys`는 features 레이어에서 mutation 후 캐시 무효화에 필요하므로 노출합니다.

### 3.2 Widgets Layer — PostList 합성 위젯 (`widgets/post/`)

위젯은 여러 entities를 **조합**하여 독립적인 UI 블록을 만듭니다.

```typescript
// src/widgets/post/ui/post-list.tsx

import { usePosts, PostCard } from "@/entities/post";
import type { GetPostsParams } from "@/entities/post";
import { Button, Skeleton } from "@/shared/ui";

interface PostListProps {
  params: GetPostsParams;
  onPageChange: (page: number) => void;
  onPostClick: (postId: number) => void;
}

export function PostList({ params, onPageChange, onPostClick }: PostListProps) {
  const { data, isLoading, isError, error } = usePosts(params);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: params.limit ?? 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-destructive">
        <p>Failed to load posts: {error.message}</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No posts found.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.totalElements / data.limit);
  const currentPage = data.page;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {data.items.map((post) => (
          <PostCard key={post.id} post={post} onClick={onPostClick} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

이 위젯이 하는 일:
1. `usePosts(params)`로 데이터를 가져옵니다 (entities의 훅 사용).
2. 로딩/에러/빈 상태를 각각 처리합니다.
3. `PostCard` 목록을 렌더링하고, 페이지네이션 UI를 제공합니다.

> **FSD 포인트**: Widgets는 entities를 "조합"하되, **비즈니스 로직(페이지 이동 등)은 props로 위임**합니다. `onPageChange`와 `onPostClick`이 콜백 props인 이유는, 위젯은 "클릭하면 어디로 이동할지"를 모르기 때문입니다. 이 결정은 상위 레이어(pages)에서 합니다.

```typescript
// src/widgets/post/index.ts

export { PostList } from "./ui/post-list";
```

### 3.3 Pages Layer — 목록/상세 페이지 (`pages/post/`)

Pages 레이어는 URL과 1:1로 매핑됩니다. 라우트 파라미터를 읽고, 하위 레이어의 위젯과 컴포넌트를 조립합니다.

#### `ui/post-list-page.tsx` — 게시물 목록 페이지

```typescript
// src/pages/post/ui/post-list-page.tsx

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PostList } from "@/widgets/post";
import type { GetPostsParams } from "@/entities/post";

export function PostListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<GetPostsParams>({
    page: 1,
    limit: 10,
  });

  function handlePageChange(page: number) {
    setParams((prev) => ({ ...prev, page }));
  }

  function handlePostClick(postId: number) {
    navigate({ to: "/posts/$postId", params: { postId: String(postId) } });
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Posts</h1>
        <p className="mt-2 text-muted-foreground">
          Browse and manage your posts
        </p>
      </div>
      <PostList
        params={params}
        onPageChange={handlePageChange}
        onPostClick={handlePostClick}
      />
    </div>
  );
}
```

- 페이지는 **상태 관리의 "주인"** 입니다. `params` 상태를 관리하며, `PostList` 위젯에 내려줍니다.
- `handlePostClick`: 게시물 클릭 시 상세 페이지로 이동합니다. TanStack Router의 `navigate`를 사용합니다.
- `handlePageChange`: 페이지네이션의 페이지 변경을 처리합니다.

#### `ui/post-detail-page.tsx` — 게시물 상세 페이지

이 파일은 6장에서 삭제 기능을 추가할 때 수정됩니다. 여기서는 먼저 조회 기능의 관점에서 설명합니다. (최종 코드에는 Edit/Delete 버튼이 포함되어 있지만, 이 단계에서는 조회 부분에 집중합니다.)

```typescript
// src/pages/post/ui/post-detail-page.tsx

import { useNavigate, useParams } from "@tanstack/react-router";
import { usePost, PostDetailCard } from "@/entities/post";
import { DeletePostButton } from "@/features/post";
import { Button, Skeleton } from "@/shared/ui";

export function PostDetailPage() {
  const { postId } = useParams({ strict: false }) as { postId: string };
  const navigate = useNavigate();
  const { data: post, isLoading, isError, error } = usePost(Number(postId));

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-destructive">Failed to load post: {error.message}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: "/posts" })}
        >
          Back to Posts
        </Button>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/posts" })}
        >
          &larr; Back to Posts
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate({ to: "/posts/$postId/edit", params: { postId } })
            }
          >
            Edit
          </Button>
          <DeletePostButton
            postId={Number(postId)}
            onSuccess={() => navigate({ to: "/posts" })}
          />
        </div>
      </div>
      <PostDetailCard post={post} />
    </div>
  );
}
```

- `useParams({ strict: false })`: TanStack Router에서 URL의 `$postId` 파라미터를 읽습니다.
- `usePost(Number(postId))`: 문자열인 URL 파라미터를 숫자로 변환하여 entities의 조회 훅에 전달합니다.
- 로딩 → 에러 → 빈 데이터 → 정상의 순서로 상태를 분기합니다. 이 패턴은 모든 데이터 조회 페이지에서 반복됩니다.

> **FSD 포인트**: Pages는 **"접착제"** 역할을 합니다. 라우트 파라미터를 읽고, entities/widgets/features를 조합하며, 네비게이션을 처리합니다. 직접 API를 호출하거나 비즈니스 로직을 수행하지 않습니다.

```typescript
// src/pages/post/index.ts

export { PostListPage } from "./ui/post-list-page";
export { PostDetailPage } from "./ui/post-detail-page";
export { PostCreatePage } from "./ui/post-create-page";
export { PostEditPage } from "./ui/post-edit-page";
```

### 3.4 조회 기능의 데이터 흐름 다이어그램

목록 조회의 데이터 흐름을 아래에서 위로 따라가 봅니다:

```
[사용자가 /posts 접속]
        │
        ▼
┌─ Pages ────────────────────────────────────┐
│  PostListPage                              │
│  - params 상태 관리 { page: 1, limit: 10 } │
│  - onPageChange, onPostClick 핸들러 정의    │
│  - PostList 위젯에 props 전달               │
└───────────────┬────────────────────────────┘
                │ params, onPageChange, onPostClick
                ▼
┌─ Widgets ──────────────────────────────────┐
│  PostList                                  │
│  - usePosts(params) 호출                    │
│  - 로딩/에러/빈 상태 분기                    │
│  - PostCard 목록 렌더링                     │
│  - 페이지네이션 UI 렌더링                    │
└───────────────┬────────────────────────────┘
                │ usePosts() 내부
                ▼
┌─ Entities ─────────────────────────────────┐
│  usePosts → useQuery                       │
│  - queryKey: ["posts", "list", params]     │
│  - queryFn: getPosts(params)               │
└───────────────┬────────────────────────────┘
                │ getPosts() 내부
                ▼
┌─ Shared ───────────────────────────────────┐
│  apiClient<PaginatedResponse<Post>>        │
│  - buildUrl("/posts", params)              │
│  - fetch → 응답 파싱 → 반환                 │
└───────────────┬────────────────────────────┘
                │ HTTP GET /posts?page=1&limit=10
                ▼
          ┌──────────┐
          │  Server  │
          └──────────┘
```

응답은 역방향으로 흘러갑니다:
```
Server → apiClient(JSON 파싱) → getPosts(타입 적용) → useQuery(캐시 저장) → PostList(렌더링) → PostCard(화면에 표시)
```

---

## 4. 게시물 생성 기능 구현 (Create)

두 번째 기능입니다. 여기서 **Features 레이어가 처음 등장**합니다. 서버 데이터를 변경하는 mutation은 features에 둡니다.

### 4.1 Features Layer — 생성 기능 (`features/post/`)

#### `model/types.ts` — 요청 DTO 타입

```typescript
// src/features/post/model/types.ts

export interface CreatePostDto {
  title: string;
  content: string;
  isPublished?: boolean;
}

export interface CreatePostResponse {
  id: number;
}

export interface UpdatePostDto {
  title: string;
  content: string;
  isPublished: boolean;
}
```

`CreatePostDto`와 entities의 `Post`를 비교해 보세요:

| | `Post` (entities) | `CreatePostDto` (features) |
|---|---|---|
| `id` | 있음 | **없음** (서버가 생성) |
| `title` | 있음 | 있음 |
| `content` | 있음 | 있음 |
| `isPublished` | 필수 (`boolean`) | **선택** (`boolean?`) |
| `createdAt` | 있음 | **없음** (서버가 생성) |
| `updatedAt` | 있음 | **없음** (서버가 생성) |

왜 타입을 분리할까요? **서버가 응답하는 데이터(Post)와 사용자가 전송하는 데이터(CreatePostDto)는 구조가 다르기 때문**입니다. `id`, `createdAt`, `updatedAt`는 서버가 자동 생성하므로 요청에 포함하지 않습니다.

> **FSD 포인트**: entities에는 "서버가 내려주는 데이터의 모양"을, features에는 "사용자가 서버에 보내는 데이터의 모양"을 둡니다. 이 분리가 entities(읽기)와 features(쓰기)의 구분을 타입 레벨에서도 명확하게 합니다.

#### `model/create-post-schema.ts` — Yup 유효성 검증 스키마

사용자 입력을 서버에 보내기 전에 클라이언트에서 먼저 검증합니다.

```typescript
// src/features/post/model/create-post-schema.ts

import * as yup from "yup";

export const createPostSchema = yup.object({
  title: yup
    .string()
    .required("Title is required")
    .max(200, "Title must be 200 characters or less"),
  content: yup
    .string()
    .required("Content is required"),
  isPublished: yup.boolean().default(false),
});

export type CreatePostFormValues = yup.InferType<typeof createPostSchema>;
```

- `yup.object()`로 폼의 각 필드에 대한 검증 규칙을 정의합니다.
- `title`: 필수이고 200자 이하.
- `content`: 필수.
- `isPublished`: 기본값 `false` (체크하지 않으면 초안으로 저장).
- `CreatePostFormValues`: 스키마에서 **타입을 자동 추론**합니다. 따로 타입을 정의하지 않아도 스키마와 타입이 항상 동기화됩니다.

#### `api/use-create-post.ts` — 생성 mutation 훅

```typescript
// src/features/post/api/use-create-post.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { postQueryKeys } from "@/entities/post";
import type { CreatePostDto, CreatePostResponse } from "../model/types";

function createPost(dto: CreatePostDto): Promise<CreatePostResponse> {
  return apiClient<CreatePostResponse>("/posts", {
    method: "POST",
    body: dto,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postQueryKeys.lists() });
    },
  });
}
```

주요 개념을 설명합니다:

- **`useMutation`** vs **`useQuery`**: `useQuery`는 데이터를 읽을 때, `useMutation`은 데이터를 변경할 때 사용합니다. Mutation은 명시적으로 `.mutate()` 또는 `.mutateAsync()`를 호출해야 실행됩니다.
- **`createPost` 함수**: 파일 내부에서만 사용하는 순수 API 함수입니다. 이 함수는 외부에 노출하지 않습니다.
- **`postQueryKeys.lists()`로 캐시 무효화**: 새 게시물이 생성되면 기존 목록 캐시가 더 이상 유효하지 않습니다. `invalidateQueries`를 호출하면 TanStack Query가 자동으로 목록 데이터를 다시 fetch합니다.

> **FSD 포인트**: features는 **"사용자 액션" 단위**로 구성합니다. `useCreatePost`는 "게시물 생성"이라는 하나의 액션을 캡슐화합니다. entities의 `postQueryKeys`를 import하여 캐시를 무효화하는 것은 FSD 규칙에 부합합니다 — features는 entities(하위 레이어)를 import 할 수 있습니다.

#### `ui/create-post-form.tsx` — 생성 폼 컴포넌트

react-hook-form + yupResolver + shadcn Form을 통합하는 폼 컴포넌트입니다.

```typescript
// src/features/post/ui/create-post-form.tsx

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Button,
  Input,
  Textarea,
  Switch,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui";
import {
  createPostSchema,
  type CreatePostFormValues,
} from "../model/create-post-schema";
import { useCreatePost } from "../api/use-create-post";

interface CreatePostFormProps {
  onSuccess?: (postId: number) => void;
}

export function CreatePostForm({ onSuccess }: CreatePostFormProps) {
  const createPost = useCreatePost();

  const form = useForm<CreatePostFormValues>({
    resolver: yupResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
      isPublished: false,
    },
  });

  async function onSubmit(values: CreatePostFormValues) {
    const result = await createPost.mutateAsync(values);
    form.reset();
    onSuccess?.(result.id);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter post title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write your post content..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Publish</FormLabel>
                <FormDescription>
                  Make this post publicly visible
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={createPost.isPending}
          className="w-full"
        >
          {createPost.isPending ? "Creating..." : "Create Post"}
        </Button>

        {createPost.isError && (
          <p className="text-sm text-destructive">
            Failed to create post. Please try again.
          </p>
        )}
      </form>
    </Form>
  );
}
```

코드의 각 부분을 해설합니다:

1. **`useForm` + `yupResolver`**: react-hook-form에 Yup 스키마를 연결합니다. 폼 제출 시 자동으로 유효성 검증이 실행되고, 실패하면 `<FormMessage />`에 에러 메시지가 표시됩니다.
2. **`defaultValues`**: 빈 폼의 초기값입니다. 생성 폼이므로 모두 빈 값입니다.
3. **`onSubmit`**: `mutateAsync`를 사용하여 비동기적으로 서버에 요청합니다. 성공하면 폼을 초기화(`form.reset()`)하고 `onSuccess` 콜백을 호출합니다.
4. **`FormField` 패턴**: shadcn Form의 render props 패턴입니다. `field` 객체를 Input/Textarea에 스프레드(`...field`)하면 `value`, `onChange`, `onBlur` 등이 자동으로 연결됩니다.
5. **`createPost.isPending`**: mutation이 진행 중일 때 버튼을 비활성화하고 텍스트를 변경합니다.
6. **에러 표시**: `createPost.isError`가 `true`이면 에러 메시지를 표시합니다.

#### `index.ts` — Features 슬라이스의 Public API

```typescript
// src/features/post/index.ts

export { CreatePostForm } from "./ui/create-post-form";
export { UpdatePostForm } from "./ui/update-post-form";
export { DeletePostButton } from "./ui/delete-post-button";
export type {
  CreatePostDto,
  CreatePostResponse,
  UpdatePostDto,
} from "./model/types";
export {
  createPostSchema,
  type CreatePostFormValues,
} from "./model/create-post-schema";
export {
  updatePostSchema,
  type UpdatePostFormValues,
} from "./model/update-post-schema";
```

- UI 컴포넌트(`CreatePostForm`, `UpdatePostForm`, `DeletePostButton`)를 외부에 공개합니다.
- `useCreatePost` 같은 mutation 훅은 공개하지 않습니다 — 폼 내부에서만 사용되기 때문입니다.

### 4.2 Pages Layer — 생성 페이지 (`pages/post/`)

```typescript
// src/pages/post/ui/post-create-page.tsx

import { useNavigate } from "@tanstack/react-router";
import { CreatePostForm } from "@/features/post";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

export function PostCreatePage() {
  const navigate = useNavigate();

  function handleSuccess(postId: number) {
    navigate({ to: "/posts/$postId", params: { postId: String(postId) } });
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePostForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
```

> **FSD 포인트**: 페이지는 features에 의존하되, **폼 내부 로직을 알 필요가 없습니다**. 페이지가 아는 것은 딱 두 가지뿐입니다: (1) `CreatePostForm`이라는 컴포넌트가 있다, (2) 성공하면 `postId`와 함께 `onSuccess` 콜백이 호출된다. 폼의 유효성 검증, mutation 호출, 에러 처리 등은 모두 features 내부에 캡슐화되어 있습니다.

### 4.3 생성 기능의 데이터 흐름 다이어그램

```
[사용자가 폼에 입력 후 Submit 클릭]
        │
        ▼
┌─ Pages ────────────────────────────────────┐
│  PostCreatePage                            │
│  - onSuccess 콜백: 상세 페이지로 이동        │
└───────────────┬────────────────────────────┘
                │ onSuccess
                ▼
┌─ Features ─────────────────────────────────┐
│  CreatePostForm                            │
│  - yup 스키마로 유효성 검증                  │
│  - useCreatePost().mutateAsync(values)     │
│  - 성공 시: form.reset() → onSuccess(id)   │
└───────────────┬────────────────────────────┘
                │ useMutation 내부
                ▼
┌─ Shared ───────────────────────────────────┐
│  apiClient("/posts", { method: "POST" })   │
└───────────────┬────────────────────────────┘
                │ HTTP POST /posts
                ▼
          ┌──────────┐
          │  Server  │
          └────┬─────┘
               │ { id: 42 }
               ▼
        캐시 무효화: postQueryKeys.lists()
               │
               ▼
        목록 페이지로 이동하면 자동으로 새 데이터 fetch
```

---

## 5. 게시물 수정 기능 구현 (Update)

세 번째 기능입니다. 기존 FSD 구조를 **확장**하는 패턴을 학습합니다.

### 5.1 조회 vs 생성과 다른 점

수정은 생성과 비슷하지만 두 가지 핵심적인 차이가 있습니다:

1. **기존 데이터를 먼저 로드해야 합니다** — 빈 폼이 아니라 서버에서 가져온 현재 데이터로 폼을 채웁니다.
2. **두 가지 캐시를 무효화해야 합니다** — 생성은 목록 캐시만 무효화하면 되지만, 수정은 **상세 캐시(`detail(id)`)와 목록 캐시(`lists()`) 모두** 무효화해야 합니다. 제목이 바뀌면 목록에서도 바뀌어야 하니까요.

### 5.2 Features Layer 확장

#### `model/types.ts` — UpdatePostDto 추가

4장에서 만든 `types.ts`에 `UpdatePostDto`가 이미 함께 정의되어 있습니다.

```typescript
// src/features/post/model/types.ts (이미 4장에서 전체 작성)

export interface CreatePostDto {
  title: string;
  content: string;
  isPublished?: boolean;
}

export interface CreatePostResponse {
  id: number;
}

export interface UpdatePostDto {
  title: string;
  content: string;
  isPublished: boolean;
}
```

`CreatePostDto`와 `UpdatePostDto`의 차이점:
- `CreatePostDto`의 `isPublished`는 **선택적**(`boolean?`) — 생성 시 지정하지 않으면 서버가 기본값(`false`)을 사용합니다.
- `UpdatePostDto`의 `isPublished`는 **필수**(`boolean`) — 수정 시에는 현재 공개 상태를 명시적으로 전달해야 합니다.

#### `model/update-post-schema.ts` — 수정 전용 유효성 검증 스키마

```typescript
// src/features/post/model/update-post-schema.ts

import * as yup from "yup";

export const updatePostSchema = yup.object({
  title: yup
    .string()
    .required("Title is required")
    .max(200, "Title must be 200 characters or less"),
  content: yup
    .string()
    .required("Content is required"),
  isPublished: yup.boolean().required().default(false),
});

export type UpdatePostFormValues = yup.InferType<typeof updatePostSchema>;
```

`createPostSchema`와 비교하면 `isPublished`에 `.required()`가 추가되었습니다. 수정 폼에서는 공개 상태를 반드시 선택해야 합니다.

#### `api/use-update-post.ts` — 수정 mutation 훅

```typescript
// src/features/post/api/use-update-post.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { postQueryKeys } from "@/entities/post";
import type { UpdatePostDto } from "../model/types";

function updatePost(id: number, dto: UpdatePostDto): Promise<void> {
  return apiClient<void>(`/posts/${id}`, {
    method: "PATCH",
    body: dto,
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdatePostDto }) =>
      updatePost(id, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.lists(),
      });
    },
  });
}
```

4장의 `useCreatePost`와 비교하며 달라진 점을 설명합니다:

- **`mutationFn`에 `{ id, dto }` 객체 전달**: `useMutation`의 `mutationFn`은 인자를 하나만 받으므로, `id`와 `dto`를 객체로 묶어서 전달합니다.
- **이중 캐시 무효화**: `onSuccess`에서 두 번 `invalidateQueries`를 호출합니다.
  - `postQueryKeys.detail(variables.id)`: 수정된 게시물의 상세 캐시. 상세 페이지로 돌아갈 때 최신 데이터가 보여야 합니다.
  - `postQueryKeys.lists()`: 모든 목록 캐시. 제목이나 공개 상태가 바뀌면 목록에도 반영되어야 합니다.
- **`_data`**: 수정 요청은 204 No Content를 반환하므로 data가 `undefined`입니다. 사용하지 않음을 나타내기 위해 `_` 접두사를 붙였습니다.

#### `ui/update-post-form.tsx` — 수정 폼 컴포넌트

```typescript
// src/features/post/ui/update-post-form.tsx

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Button,
  Input,
  Textarea,
  Switch,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui";
import {
  updatePostSchema,
  type UpdatePostFormValues,
} from "../model/update-post-schema";
import { useUpdatePost } from "../api/use-update-post";

interface UpdatePostFormProps {
  postId: number;
  defaultValues: UpdatePostFormValues;
  onSuccess?: () => void;
}

export function UpdatePostForm({
  postId,
  defaultValues,
  onSuccess,
}: UpdatePostFormProps) {
  const updatePost = useUpdatePost();

  const form = useForm<UpdatePostFormValues>({
    resolver: yupResolver(updatePostSchema),
    defaultValues,
  });

  async function onSubmit(values: UpdatePostFormValues) {
    await updatePost.mutateAsync({ id: postId, dto: values });
    onSuccess?.();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter post title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write your post content..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Publish</FormLabel>
                <FormDescription>
                  Make this post publicly visible
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={updatePost.isPending}
          className="w-full"
        >
          {updatePost.isPending ? "Updating..." : "Update Post"}
        </Button>

        {updatePost.isError && (
          <p className="text-sm text-destructive">
            Failed to update post. Please try again.
          </p>
        )}
      </form>
    </Form>
  );
}
```

`CreatePostForm`과 비교하면 **구조는 거의 동일**하고 다른 점은:

| | CreatePostForm | UpdatePostForm |
|---|---|---|
| `postId` prop | 없음 | 있음 (어떤 게시물을 수정하는지) |
| `defaultValues` | 빈 문자열로 하드코딩 | **props로 받음** (기존 데이터) |
| `onSuccess` 인자 | `postId: number` (생성된 ID) | 없음 (이미 ID를 알고 있음) |
| mutation | `useCreatePost` | `useUpdatePost` |
| 제출 후 | `form.reset()` 호출 | reset 없음 |

### 5.3 Pages Layer — 수정 페이지 추가

```typescript
// src/pages/post/ui/post-edit-page.tsx

import { useNavigate, useParams } from "@tanstack/react-router";
import { usePost } from "@/entities/post";
import { UpdatePostForm } from "@/features/post";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui";

export function PostEditPage() {
  const { postId } = useParams({ strict: false }) as { postId: string };
  const navigate = useNavigate();
  const id = Number(postId);
  const { data: post, isLoading, isError, error } = usePost(id);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-destructive">Failed to load post: {error.message}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: "/posts" })}
        >
          Back to Posts
        </Button>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate({ to: "/posts/$postId", params: { postId } })}
      >
        &larr; Back to Post
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit Post</CardTitle>
        </CardHeader>
        <CardContent>
          <UpdatePostForm
            postId={id}
            defaultValues={{
              title: post.title,
              content: post.content,
              isPublished: post.isPublished,
            }}
            onSuccess={() =>
              navigate({ to: "/posts/$postId", params: { postId } })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

이 페이지의 핵심 패턴:

1. **`usePost(id)`로 기존 데이터를 로드합니다** — entities의 조회 훅을 재사용합니다.
2. **로딩/에러 상태를 처리합니다** — 3장의 상세 페이지와 동일한 패턴입니다.
3. **`defaultValues`를 구성합니다** — 서버에서 가져온 `post` 데이터에서 폼에 필요한 필드만 추출합니다. `id`, `createdAt`, `updatedAt`는 수정 대상이 아니므로 제외합니다.
4. **`onSuccess`에서 상세 페이지로 돌아갑니다**.

> **FSD 포인트**: 새 기능을 추가할 때 **기존 파일 수정을 최소화**합니다. features 내부에 새 파일을 추가하고, pages에서 새 페이지를 만들고, 라우터에 경로만 등록하면 됩니다. 기존의 entities, widgets, shared는 전혀 수정하지 않았습니다.

### 5.4 App Layer — 라우트 추가

`router.tsx`에 수정 페이지 라우트를 등록합니다. (전체 라우터 코드는 7장에서 다룹니다.)

```typescript
const postEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId/edit",
  component: PostEditPage,
});
```

---

## 6. 게시물 삭제 기능 구현 (Delete)

네 번째 기능입니다. 삭제는 **폼이 없는 mutation**이며, 위험한 작업이므로 확인 다이얼로그 패턴을 사용합니다.

### 6.1 삭제 기능의 특징

삭제는 생성/수정과 다릅니다:
- **입력 폼이 없습니다** — 버튼 한 번 클릭으로 동작합니다.
- **위험한 작업입니다** — 실수로 삭제하면 복구가 어렵습니다. 따라서 확인 다이얼로그를 보여줍니다.
- shadcn의 `AlertDialog` 컴포넌트를 사용합니다.

### 6.2 Features Layer — 삭제 기능

#### `api/use-delete-post.ts` — 삭제 mutation 훅

```typescript
// src/features/post/api/use-delete-post.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { postQueryKeys } from "@/entities/post";

function deletePost(id: number): Promise<void> {
  return apiClient<void>(`/posts/${id}`, {
    method: "DELETE",
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.lists(),
      });
    },
  });
}
```

이것은 프로젝트에서 가장 **간단한 mutation 훅**입니다:
- `deletePost(id)`: ID만 받아서 DELETE 요청을 보냅니다. 요청 본문이 없습니다.
- 캐시 무효화는 `lists()`만 합니다. 삭제된 게시물의 `detail(id)` 캐시는 어차피 다시 접근하지 않으므로 무효화할 필요가 없습니다.

#### `ui/delete-post-button.tsx` — 삭제 버튼 + 확인 다이얼로그

```typescript
// src/features/post/ui/delete-post-button.tsx

import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui";
import { useDeletePost } from "../api/use-delete-post";

interface DeletePostButtonProps {
  postId: number;
  onSuccess?: () => void;
}

export function DeletePostButton({ postId, onSuccess }: DeletePostButtonProps) {
  const deletePost = useDeletePost();

  async function handleDelete() {
    await deletePost.mutateAsync(postId);
    onSuccess?.();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={deletePost.isPending}>
          {deletePost.isPending ? "Deleting..." : "Delete"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Post</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this post? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

확인/취소 플로우를 설명합니다:

1. 사용자가 빨간색 "Delete" 버튼을 클릭합니다 (`AlertDialogTrigger`).
2. 확인 다이얼로그가 열립니다 (`AlertDialogContent`).
3. **Cancel** 클릭 → 다이얼로그가 닫히고 아무 일도 일어나지 않습니다.
4. **Delete** 클릭 → `handleDelete()`가 실행되어 서버에 삭제 요청을 보냅니다.
5. 성공하면 `onSuccess` 콜백이 호출됩니다 (보통 목록 페이지로 이동).

- `variant="destructive"`: shadcn Button의 빨간색 위험 동작 스타일입니다.
- `asChild`: `AlertDialogTrigger`가 자체 요소를 렌더링하지 않고, 자식인 `Button`에 트리거 기능을 위임합니다.

### 6.3 Pages Layer — 상세 페이지 수정

상세 페이지(`post-detail-page.tsx`)에 Edit 버튼과 Delete 버튼을 추가합니다. 전체 코드는 3.3절에서 이미 보여드렸습니다. 핵심 변경 부분만 다시 봅니다:

```typescript
// post-detail-page.tsx에서 추가된 부분

import { DeletePostButton } from "@/features/post";

// ... JSX 내부
<div className="flex gap-2">
  <Button
    variant="outline"
    onClick={() =>
      navigate({ to: "/posts/$postId/edit", params: { postId } })
    }
  >
    Edit
  </Button>
  <DeletePostButton
    postId={Number(postId)}
    onSuccess={() => navigate({ to: "/posts" })}
  />
</div>
```

> **FSD 포인트**: 기존 페이지에 features를 **"꽂아 넣는"** 느낌입니다. 페이지는 `DeletePostButton`의 내부 동작(다이얼로그, mutation, 캐시 무효화)을 전혀 모릅니다. `postId`와 `onSuccess` 콜백만 전달하면 됩니다. 이것이 FSD의 캡슐화가 주는 이점입니다.

---

## 7. App Layer — 전체 조립

App 레이어는 모든 하위 레이어를 조립하여 하나의 애플리케이션으로 만듭니다. 라우터, 프로바이더, 레이아웃, 엔트리포인트를 담당합니다.

### `providers/query-provider.tsx` — QueryClient 설정

```typescript
// src/app/providers/query-provider.tsx

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- **`useState`로 QueryClient 생성**: 컴포넌트가 리렌더링될 때마다 새 QueryClient를 만들지 않도록 `useState`의 초기화 함수를 사용합니다.
- **`staleTime: 60 * 1000`**: 데이터를 가져온 후 1분 동안은 "신선한" 상태로 간주합니다. 이 시간 동안은 같은 queryKey로 재요청하지 않습니다.
- **`retry: 1`**: 실패 시 1번만 재시도합니다 (기본값은 3번).
- **`refetchOnWindowFocus: false`**: 브라우저 탭 전환 시 자동 재요청을 끕니다. 개발 중에 탭을 전환할 때마다 API 호출이 발생하는 것을 방지합니다.

### `router/router.tsx` — 전체 라우트 트리

```typescript
// src/app/router/router.tsx

import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { RootLayout } from "../layouts/root-layout";
import {
  PostListPage,
  PostDetailPage,
  PostCreatePage,
  PostEditPage,
} from "@/pages/post";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/posts" });
  },
});

const postsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts",
  component: PostListPage,
});

const createPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/create",
  component: PostCreatePage,
});

const postDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId",
  component: PostDetailPage,
});

const postEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId/edit",
  component: PostEditPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  postsListRoute,
  createPostRoute,
  postEditRoute,
  postDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

전체 라우트 구성:

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | (redirect) | `/posts`로 리다이렉트 |
| `/posts` | `PostListPage` | 게시물 목록 |
| `/posts/create` | `PostCreatePage` | 게시물 생성 |
| `/posts/$postId` | `PostDetailPage` | 게시물 상세 |
| `/posts/$postId/edit` | `PostEditPage` | 게시물 수정 |

- **`createRootRoute`**: 모든 라우트의 부모. `RootLayout`을 렌더링합니다.
- **`redirect`**: `/` 접속 시 `/posts`로 리다이렉트합니다.
- **`$postId`**: TanStack Router의 동적 파라미터 문법입니다. `/posts/42`에서 `42`가 `postId`에 바인딩됩니다.
- **`declare module`**: TypeScript에서 라우터 타입을 등록하여 `navigate`, `Link` 등에서 타입 안전한 자동완성을 제공합니다.
- **라우트 순서**: `routeTree`에서 `createPostRoute`(`/posts/create`)가 `postDetailRoute`(`/posts/$postId`)보다 먼저 와야 합니다. 그렇지 않으면 `/posts/create`가 `$postId = "create"`로 매칭될 수 있습니다.

### `layouts/root-layout.tsx` — 공통 레이아웃

```typescript
// src/app/layouts/root-layout.tsx

import { Outlet } from "@tanstack/react-router";
import { Header } from "@/widgets/header";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

- `<Header />`: widgets 레이어의 Header 컴포넌트입니다. 모든 페이지 상단에 표시됩니다.
- `<Outlet />`: 현재 URL에 매칭된 라우트의 컴포넌트가 이 자리에 렌더링됩니다. (TanStack Router의 중첩 라우트 패턴)

참고로 `Header` 위젯은 다음과 같이 구현되어 있습니다:

```typescript
// src/widgets/header/ui/header.tsx

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

### `app.tsx` — Provider 중첩 패턴

```typescript
// src/app/app.tsx

import { RouterProvider } from "@tanstack/react-router";
import { QueryProvider } from "./providers";
import { router } from "./router";

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}
```

Provider 중첩 순서가 중요합니다:
1. **`QueryProvider`** (가장 바깥): 모든 하위 컴포넌트에서 TanStack Query를 사용할 수 있게 합니다.
2. **`RouterProvider`** (안쪽): 라우터가 QueryClient 위에서 동작합니다.

`QueryProvider`가 `RouterProvider`를 감싸야 하는 이유: 라우트 컴포넌트(페이지) 안에서 `useQuery`를 사용하므로, QueryClient가 먼저 제공되어야 합니다.

### `main.tsx` — 엔트리포인트

```typescript
// src/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- `StrictMode`: 개발 모드에서 잠재적 문제를 감지합니다 (이중 렌더링으로 부수 효과 검출 등).
- `@/app`에서 `App`을 가져옵니다. `index.ts` Public API를 통해 접근합니다.
- `./index.css`: Tailwind CSS의 기본 스타일과 shadcn/ui의 CSS 변수가 정의되어 있습니다.

---

## 8. FSD 규칙 자가 점검 체크리스트

프로젝트를 완성한 후, 아래 체크리스트로 FSD 규칙을 지키고 있는지 점검합니다.

### Import 방향 검증

각 파일의 `import` 문이 **하위 레이어만 참조**하는지 확인합니다.

| 파일 위치 | 허용되는 import 대상 |
|-----------|---------------------|
| `app/` | pages, widgets, features, entities, shared |
| `pages/` | widgets, features, entities, shared |
| `widgets/` | features, entities, shared |
| `features/` | entities, shared |
| `entities/` | shared |
| `shared/` | 외부 라이브러리만 |

**자가 점검 방법**: 각 파일에서 `import ... from "@/` 부분을 찾아서, import 대상이 같은 레이어나 상위 레이어가 아닌지 확인합니다.

```bash
# 예: entities에서 features를 import하는 위반 사례를 찾기
grep -r "from \"@/features" src/entities/
# 결과가 비어있어야 정상
```

### Public API 검증

외부에서 슬라이스 내부 파일에 **직접 접근하지 않는지** 확인합니다.

```bash
# 잘못된 예: entities 내부 파일에 직접 접근
grep -r "from \"@/entities/post/" src/ --include="*.ts" --include="*.tsx" \
  | grep -v "src/entities/post/"
# index.ts를 통하지 않는 import가 없어야 정상
```

✅ 올바른 import:
```typescript
import { PostCard, usePosts } from "@/entities/post";
```

❌ 잘못된 import:
```typescript
import { PostCard } from "@/entities/post/ui/post-card";
import { getPosts } from "@/entities/post/api/post-api";
```

### 네이밍 검증

- **파일명**: `kebab-case` 사용 (예: `post-card.tsx`, `use-posts.ts`)
- **컴포넌트명**: `PascalCase` 사용 (예: `PostCard`, `CreatePostForm`)
- **훅 이름**: `use` 접두사 + `PascalCase` (예: `usePosts`, `useCreatePost`)
- **각 슬라이스에 `index.ts`** 존재 여부 확인

### 위반 사례와 수정 방법

**사례 1**: entities에서 features의 mutation 훅을 import
```typescript
// ❌ entities/post/ui/post-card.tsx
import { useDeletePost } from "@/features/post";
```
→ **수정**: 삭제 버튼은 entities가 아닌 features에 만들고, 페이지에서 조합합니다.

**사례 2**: 같은 레이어의 다른 슬라이스를 import
```typescript
// ❌ features/post/api/use-create-post.ts
import { useAuth } from "@/features/auth";
```
→ **수정**: 공통으로 필요한 것은 shared로 내리거나, 상위 레이어(pages/widgets)에서 조합합니다.

**사례 3**: pages에서 Public API를 우회
```typescript
// ❌ pages/post/ui/post-list-page.tsx
import { getPosts } from "@/entities/post/api/post-api";
```
→ **수정**: `import { usePosts } from "@/entities/post"` — Public API를 통해 접근합니다.

---

## 9. 정리 — FSD로 새 기능을 추가하는 절차

새로운 기능을 추가할 때 다음 순서를 따릅니다. 각 단계에서 "예"이면 해당 작업을 수행합니다.

```
1. 도메인 타입이 새로운가?
   → YES: entities/{domain}/model/types.ts에 인터페이스 추가
   → NO: 기존 타입 사용

2. 서버에서 데이터를 읽는가? (GET)
   → YES: entities/{domain}/api/에 query 훅 추가
         - query-keys.ts에 키 추가
         - {entity}-api.ts에 API 함수 추가
         - use-{entity}.ts에 useQuery 훅 추가

3. 서버 데이터를 변경하는가? (POST/PATCH/DELETE)
   → YES: features/{domain}/api/에 mutation 훅 추가
         - use-create-{entity}.ts, use-update-{entity}.ts 등

4. 사용자 입력 폼이 필요한가?
   → YES: features/{domain}/model/에 스키마 추가
         features/{domain}/ui/에 폼 컴포넌트 추가

5. 여러 entities를 조합한 독립 UI 블록이 필요한가?
   → YES: widgets/{domain}/ui/에 합성 위젯 추가

6. 새 URL(페이지)이 필요한가?
   → YES: pages/{domain}/ui/에 페이지 추가
         app/router/router.tsx에 라우트 등록

7. 마지막: 각 레이어의 index.ts Public API를 업데이트합니다.
```

이 절차를 시각적으로 표현하면:

```
[새 기능 요구사항]
        │
        ├─ 새 도메인 타입? ──→ entities/model/types.ts
        │
        ├─ 데이터 읽기? ──→ entities/api/ (query 훅)
        │
        ├─ 데이터 변경? ──→ features/api/ (mutation 훅)
        │
        ├─ 입력 폼? ──→ features/model/ (스키마)
        │              features/ui/ (폼 컴포넌트)
        │
        ├─ 합성 UI? ──→ widgets/ui/ (위젯)
        │
        ├─ 새 URL? ──→ pages/ui/ (페이지)
        │              app/router/ (라우트)
        │
        └─ 각 index.ts Public API 업데이트
```

이 가이드에서 구현한 4가지 기능을 이 절차에 대입해 보면:

| 기능 | entities | features | widgets | pages | app/router |
|------|----------|----------|---------|-------|------------|
| **조회** | types, query 훅, UI | - | PostList | ListPage, DetailPage | ✓ |
| **생성** | - | mutation 훅, 스키마, 폼 | - | CreatePage | ✓ |
| **수정** | - | mutation 훅, 스키마, 폼 | - | EditPage | ✓ |
| **삭제** | - | mutation 훅, 버튼 | - | DetailPage 수정 | - |

패턴이 보이시나요? **조회는 entities 중심, 변경은 features 중심**입니다. Pages는 항상 이들을 조립하는 "접착제"입니다.

---

이 가이드를 따라 하면서 FSD의 사고방식이 체득되었기를 바랍니다. 핵심은 단 하나입니다:

> **"각 코드가 어디에 있어야 하는가?"** — 이 질문에 대한 답을 레이어와 슬라이스로 제공하는 것이 FSD입니다.
