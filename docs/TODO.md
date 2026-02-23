# TODO: 게시물 관리 기능 구현 체크리스트

## Phase 0: 의존성 설치 및 인프라 설정

- [ ] `pnpm add yup @hookform/resolvers` 실행
- [ ] `pnpm add -D tailwindcss @tailwindcss/vite` 실행
- [ ] `tsconfig.app.json`에 path alias 추가 (`@/*` → `./src/*`)
- [ ] `vite.config.ts` 수정 (path alias, Tailwind 플러그인, API 프록시)
- [ ] `.env` 파일 생성 (`VITE_API_BASE_URL=/api`)
- [ ] `pnpm dlx shadcn@latest init` 실행 (컴포넌트 경로: `@/shared/ui`)
- [ ] shadcn 컴포넌트 설치 (button, card, input, textarea, form, label, badge, skeleton, separator, switch)
- [ ] 기존 파일 삭제 (`App.tsx`, `App.css`, `index.css`)

---

## Phase 1: Shared Layer

### api

- [ ] `src/shared/api/api-error.ts` — ApiError 클래스 작성
- [ ] `src/shared/api/api-client.ts` — fetch 기반 HTTP 클라이언트 작성
- [ ] `src/shared/api/index.ts` — Public API 작성

### config

- [ ] `src/shared/config/env.ts` — 환경 변수 접근 객체 작성
- [ ] `src/shared/config/index.ts` — Public API 작성

### types

- [ ] `src/shared/types/pagination.ts` — PaginatedResponse, PaginationParams 타입 작성
- [ ] `src/shared/types/index.ts` — Public API 작성

### lib

- [ ] `src/shared/lib/utils.ts` — cn() 유틸리티 확인 (shadcn init이 자동 생성)
- [ ] `src/shared/lib/index.ts` — Public API 작성

### ui

- [ ] `src/shared/ui/index.ts` — shadcn 컴포넌트 re-export 작성

---

## Phase 2: Entities Layer — Post

### model

- [ ] `src/entities/post/model/types.ts` — Post, GetPostsParams 타입 정의

### api

- [ ] `src/entities/post/api/post-query-keys.ts` — TanStack Query 캐시 키 팩토리
- [ ] `src/entities/post/api/post-api.ts` — getPosts(), getPostById() 함수
- [ ] `src/entities/post/api/use-posts.ts` — usePosts() 페이지네이션 조회 훅
- [ ] `src/entities/post/api/use-post.ts` — usePost(id) 단일 조회 훅

### ui

- [ ] `src/entities/post/ui/post-card.tsx` — 목록용 카드 컴포넌트
- [ ] `src/entities/post/ui/post-detail-card.tsx` — 상세용 카드 컴포넌트

### public api

- [ ] `src/entities/post/index.ts` — 타입, 훅, 컴포넌트 export

---

## Phase 3: Features Layer — Post (생성)

### model

- [ ] `src/features/post/model/types.ts` — CreatePostDto, CreatePostResponse 타입
- [ ] `src/features/post/model/create-post-schema.ts` — Yup 유효성 검증 스키마

### api

- [ ] `src/features/post/api/use-create-post.ts` — useCreatePost() mutation 훅

### ui

- [ ] `src/features/post/ui/create-post-form.tsx` — react-hook-form + yup + shadcn 통합 폼

### public api

- [ ] `src/features/post/index.ts` — 폼 컴포넌트, 타입 export

---

## Phase 3-1: Features Layer — Post (수정/삭제)

### shadcn 컴포넌트 추가

- [ ] `alert-dialog` 컴포넌트 설치 (`pnpm dlx shadcn@latest add alert-dialog`)
- [ ] `src/shared/ui/index.ts` — AlertDialog 관련 컴포넌트 re-export 추가

### model

- [ ] `src/features/post/model/types.ts` — UpdatePostDto 타입 추가
- [ ] `src/features/post/model/update-post-schema.ts` — Yup 수정 폼 유효성 검증 스키마

### api

- [ ] `src/features/post/api/use-update-post.ts` — useUpdatePost() mutation 훅 (상세+목록 캐시 무효화)
- [ ] `src/features/post/api/use-delete-post.ts` — useDeletePost() mutation 훅 (목록 캐시 무효화)

### ui

- [ ] `src/features/post/ui/update-post-form.tsx` — 수정 폼 (기존 데이터 defaultValues로 반영)
- [ ] `src/features/post/ui/delete-post-button.tsx` — 삭제 버튼 + AlertDialog 확인 다이얼로그

### public api

- [ ] `src/features/post/index.ts` — UpdatePostForm, DeletePostButton, UpdatePostDto 등 export 추가

---

## Phase 4: Widgets Layer

### post 위젯

- [ ] `src/widgets/post/ui/post-list.tsx` — PostCard + 페이지네이션 합성 위젯
- [ ] `src/widgets/post/index.ts` — Public API

### header 위젯

- [ ] `src/widgets/header/ui/header.tsx` — 앱 네비게이션 헤더
- [ ] `src/widgets/header/index.ts` — Public API

---

## Phase 5: Pages Layer

- [ ] `src/pages/post/ui/post-list-page.tsx` — 게시물 목록 페이지 (`/posts`)
- [ ] `src/pages/post/ui/post-detail-page.tsx` — 게시물 상세 페이지 (`/posts/:id`)
- [ ] `src/pages/post/ui/post-create-page.tsx` — 게시물 생성 페이지 (`/posts/create`)
- [ ] `src/pages/post/index.ts` — Public API (3개 페이지 export)

---

## Phase 5-1: Pages Layer — 수정/삭제 확장

- [ ] `src/pages/post/ui/post-edit-page.tsx` — 게시물 수정 페이지 (`/posts/:id/edit`, usePost로 기존 데이터 로드)
- [ ] `src/pages/post/ui/post-detail-page.tsx` — Edit 버튼, DeletePostButton 추가
- [ ] `src/pages/post/index.ts` — PostEditPage export 추가
- [ ] `src/app/router/router.tsx` — `/posts/$postId/edit` 라우트 추가

---

## Phase 6: App Layer

- [ ] `src/app/providers/query-provider.tsx` — QueryClientProvider 래퍼
- [ ] `src/app/providers/index.ts` — Public API
- [ ] `src/app/router/router.tsx` — TanStack Router 라우트 트리 및 타입 등록
- [ ] `src/app/router/index.ts` — Public API
- [ ] `src/app/layouts/root-layout.tsx` — Header + Outlet 루트 레이아웃
- [ ] `src/app/styles/globals.css` — Tailwind 임포트 + CSS 변수
- [ ] `src/app/app.tsx` — QueryProvider + RouterProvider 조합
- [ ] `src/app/index.ts` — Public API
- [ ] `src/main.tsx` — 엔트리포인트 수정 (App 임포트, globals.css 임포트)

---

## Phase 7: 검증

### 빌드 검증

- [ ] `pnpm dev` 실행 시 에러 없이 개발 서버 구동 확인
- [ ] `pnpm build` 실행 시 프로덕션 빌드 성공 확인
- [ ] `pnpm lint` 실행 시 린트 에러 없음 확인

### 기능 검증 — 조회/생성

- [ ] NestJS 서버(`56-nest-repository-pattern`)를 `localhost:3000`에서 실행
- [ ] `/posts` — 게시물 목록이 카드로 정상 출력되는지 확인
- [ ] `/posts` — 페이지네이션 이전/다음 버튼 동작 확인
- [ ] `/posts` — 게시물 없을 때 안내 메시지 표시 확인
- [ ] `/posts/create` — 빈 폼 제출 시 유효성 검증 에러 표시 확인
- [ ] `/posts/create` — 정상 데이터 입력 후 생성 성공 확인
- [ ] `/posts/create` — 생성 후 상세 페이지로 자동 이동 확인
- [ ] `/posts/:id` — 게시물 상세 내용 정상 표시 확인
- [ ] `/posts/:id` — "목록으로" 버튼 클릭 시 목록 페이지 이동 확인
- [ ] `/` — 루트 경로 접근 시 `/posts`로 리다이렉트 확인

### 기능 검증 — 수정/삭제

- [ ] `/posts/:id` — Edit 버튼, Delete 버튼이 표시되는지 확인
- [ ] `/posts/:id` — Edit 버튼 클릭 시 `/posts/:id/edit` 페이지로 이동 확인
- [ ] `/posts/:id/edit` — 기존 게시물 데이터가 폼에 자동 반영되는지 확인
- [ ] `/posts/:id/edit` — 빈 필드 제출 시 유효성 검증 에러 표시 확인
- [ ] `/posts/:id/edit` — 수정 후 제출 시 상세 페이지 이동 + 변경 내용 반영 확인
- [ ] `/posts/:id/edit` — API 호출 중 "Updating..." 버튼 비활성화 확인
- [ ] `/posts/:id` — Delete 버튼 클릭 시 확인 다이얼로그 표시 확인
- [ ] `/posts/:id` — 다이얼로그 취소 버튼 클릭 시 아무 일도 일어나지 않는지 확인
- [ ] `/posts/:id` — 다이얼로그 확인 버튼 클릭 시 삭제 후 목록 페이지 이동 확인
- [ ] `/posts/:id` — 삭제 후 목록에서 해당 게시물이 사라졌는지 확인

### FSD 규칙 검증

- [ ] 모든 import가 하위 레이어 방향으로만 흐르는지 확인
- [ ] 모든 슬라이스에 `index.ts` Public API가 존재하는지 확인
- [ ] 외부 슬라이스에서 내부 파일 직접 접근 없이 Public API만 사용하는지 확인
- [ ] 파일/폴더 네이밍이 kebab-case인지 확인
