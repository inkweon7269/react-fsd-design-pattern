# PRD: 게시물 관리 기능 (Posts Management)

## 1. 개요

### 1.1 프로젝트 배경

NestJS 기반 백엔드 서버(`56-nest-repository-pattern`)에 CQRS + Repository 패턴으로 구현된 게시물 CRUD API가 존재합니다. 이 API를 프론트엔드에서 활용하기 위해 React 프로젝트(`57-react-rsd-design-pattern`)에 **Feature-Sliced Design(FSD)** 아키텍처를 적용하여 게시물 생성 및 조회 기능을 구현합니다.

### 1.2 목적

- 게시물 CRUD(목록 조회, 상세 조회, 생성, 수정, 삭제) 기능을 React 프론트엔드에 구현
- FSD 아키텍처 패턴을 프로젝트 전반에 적용하여 확장 가능한 구조 확보
- 타입 안전한 API 연동 및 서버 상태 관리 체계 구축

### 1.3 범위

| 포함 | 미포함 |
|------|--------|
| 게시물 목록 조회 (페이지네이션) | 사용자 인증/인가 |
| 게시물 상세 조회 | 검색/필터링 UI |
| 게시물 생성 | 다크 모드 |
| 게시물 수정 (PATCH) | |
| 게시물 삭제 (DELETE) | |
| FSD 레이어 구조 전체 셋업 | |
| shadcn/ui 기반 UI 구현 | |

---

## 2. 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React | 19.2 |
| 언어 | TypeScript (strict) | 5.9 |
| 빌드 도구 | Vite | 7.3 |
| 서버 상태 관리 | TanStack Query | 5.x |
| 라우팅 | TanStack Router | 1.x |
| 폼 관리 | react-hook-form | 7.x |
| 폼 검증 | yup + @hookform/resolvers | - |
| UI 컴포넌트 | shadcn/ui | 3.x |
| 스타일링 | Tailwind CSS v4 (Vite 플러그인) | 4.x |
| HTTP 클라이언트 | native fetch 래퍼 | - |
| 패키지 매니저 | pnpm | - |

---

## 3. 서버 API 스펙

### 3.1 게시물 목록 조회

```
GET /posts?page={page}&limit={limit}&isPublished={boolean}
```

**Response (200)**:
```json
{
  "items": [
    {
      "id": 1,
      "title": "제목",
      "content": "내용",
      "isPublished": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "totalElements": 42,
  "page": 1,
  "limit": 10
}
```

### 3.2 게시물 상세 조회

```
GET /posts/:id
```

**Response (200)**:
```json
{
  "id": 1,
  "title": "제목",
  "content": "내용",
  "isPublished": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error**: 404 Not Found (존재하지 않는 ID)

### 3.3 게시물 생성

```
POST /posts
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "제목",          // 필수, 1~200자, 유니크
  "content": "내용",        // 필수, 1자 이상
  "isPublished": false      // 선택, 기본값 false
}
```

**Response (201)**:
```json
{
  "id": 1
}
```

**Error**: 409 Conflict (중복 제목)

### 3.4 게시물 수정

```
PATCH /posts/:id
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "수정된 제목",       // 필수
  "content": "수정된 내용",     // 필수
  "isPublished": true           // 필수
}
```

**Response**: 204 No Content (빈 응답)

**Error**: 404 Not Found (존재하지 않는 ID)

### 3.5 게시물 삭제

```
DELETE /posts/:id
```

**Response**: 204 No Content (빈 응답)

**Error**: 404 Not Found (존재하지 않는 ID)

---

## 4. 기능 요구사항

### 4.1 게시물 목록 페이지 (`/posts`)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-01 | 페이지 진입 시 게시물 목록을 카드 형태로 표시한다 | P0 |
| FR-02 | 각 카드에 제목, 내용 미리보기(3줄), 게시 상태(Badge), 생성일을 표시한다 | P0 |
| FR-03 | 페이지네이션 UI로 이전/다음 페이지 이동이 가능하다 | P0 |
| FR-04 | 카드 클릭 시 해당 게시물 상세 페이지로 이동한다 | P0 |
| FR-05 | 데이터 로딩 중 스켈레톤 UI를 표시한다 | P1 |
| FR-06 | 게시물이 없을 때 "게시물 없음" 안내 메시지를 표시한다 | P1 |
| FR-07 | API 에러 발생 시 에러 메시지를 표시한다 | P1 |

### 4.2 게시물 상세 페이지 (`/posts/:id`)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-08 | 게시물의 제목, 내용 전문, 게시 상태, 생성일, 수정일을 표시한다 | P0 |
| FR-09 | "목록으로" 버튼 클릭 시 게시물 목록 페이지로 이동한다 | P0 |
| FR-10 | "Edit" 버튼 클릭 시 게시물 수정 페이지로 이동한다 | P0 |
| FR-11 | "Delete" 버튼 클릭 시 확인 다이얼로그를 표시하고, 확인 시 삭제 후 목록으로 이동한다 | P0 |
| FR-12 | 데이터 로딩 중 스켈레톤 UI를 표시한다 | P1 |
| FR-13 | 존재하지 않는 게시물 접근 시 에러 메시지를 표시한다 | P1 |

### 4.3 게시물 생성 페이지 (`/posts/create`)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-14 | 제목(Input), 내용(Textarea), 게시 여부(Switch) 입력 폼을 제공한다 | P0 |
| FR-15 | 제목은 필수이며 최대 200자 제한, 내용은 필수이다 | P0 |
| FR-16 | 유효성 검증 실패 시 각 필드 아래에 에러 메시지를 표시한다 | P0 |
| FR-17 | 생성 버튼 클릭 시 API를 호출하고, 성공 시 해당 게시물 상세 페이지로 이동한다 | P0 |
| FR-18 | API 호출 중 버튼을 비활성화하고 "Creating..." 텍스트를 표시한다 | P1 |
| FR-19 | 생성 성공 후 게시물 목록 캐시를 자동 무효화하여 최신 데이터를 반영한다 | P1 |
| FR-20 | API 에러 발생 시 폼 하단에 에러 메시지를 표시한다 | P1 |

### 4.4 게시물 수정 페이지 (`/posts/:id/edit`)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-21 | 페이지 진입 시 기존 게시물 데이터를 폼에 자동으로 채워서 표시한다 | P0 |
| FR-22 | 제목(Input), 내용(Textarea), 게시 여부(Switch) 수정 폼을 제공한다 | P0 |
| FR-23 | 제목은 필수이며 최대 200자 제한, 내용은 필수, 게시 여부는 필수이다 | P0 |
| FR-24 | 유효성 검증 실패 시 각 필드 아래에 에러 메시지를 표시한다 | P0 |
| FR-25 | 수정 버튼 클릭 시 PATCH API를 호출하고, 성공 시 해당 게시물 상세 페이지로 이동한다 | P0 |
| FR-26 | API 호출 중 버튼을 비활성화하고 "Updating..." 텍스트를 표시한다 | P1 |
| FR-27 | 수정 성공 후 해당 게시물 상세 캐시 및 목록 캐시를 자동 무효화한다 | P1 |
| FR-28 | API 에러 발생 시 폼 하단에 에러 메시지를 표시한다 | P1 |
| FR-29 | 데이터 로딩 중 스켈레톤 UI를 표시한다 | P1 |

### 4.5 게시물 삭제

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-30 | 상세 페이지에서 Delete 버튼 클릭 시 확인 다이얼로그(AlertDialog)를 표시한다 | P0 |
| FR-31 | 확인 다이얼로그에 경고 메시지를 표시하고, 취소/확인 버튼을 제공한다 | P0 |
| FR-32 | 확인 클릭 시 DELETE API를 호출하고, 성공 시 게시물 목록 페이지로 이동한다 | P0 |
| FR-33 | 삭제 진행 중 확인 버튼을 비활성화하고 "Deleting..." 텍스트를 표시한다 | P1 |
| FR-34 | 삭제 성공 후 게시물 목록 캐시를 자동 무효화한다 | P1 |

### 4.6 공통 네비게이션

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-35 | 상단 헤더에 앱 로고, "All Posts" 링크, "New Post" 버튼을 표시한다 | P0 |
| FR-36 | 루트 경로(`/`) 접근 시 `/posts`로 자동 리다이렉트한다 | P0 |

---

## 5. 아키텍처 설계

### 5.1 FSD 레이어 구조

```
src/
├── app/           ← 앱 초기화, Provider, 라우터, 글로벌 스타일
├── pages/         ← 라우트별 페이지 컴포넌트
│   └── post/      ← 게시물 관련 4개 페이지 (목록, 상세, 생성, 수정)
├── widgets/       ← 독립적인 대형 UI 블록
│   ├── post/      ← 게시물 목록 위젯
│   └── header/    ← 앱 네비게이션 헤더
├── features/      ← 사용자 인터랙션 단위 기능
│   └── post/      ← 게시물 생성, 수정, 삭제 기능
├── entities/      ← 비즈니스 도메인 객체
│   └── post/      ← 게시물 엔티티 (타입, API, UI)
└── shared/        ← 재사용 인프라 코드
    ├── api/       ← HTTP 클라이언트
    ├── config/    ← 환경 변수
    ├── lib/       ← 유틸리티 (cn)
    ├── types/     ← 공통 타입 (Pagination)
    └── ui/        ← shadcn 컴포넌트
```

### 5.2 Import 규칙

모든 import는 **하위 레이어 방향으로만** 허용됩니다:

```
app → pages → widgets → features → entities → shared
```

동일 레이어 간, 상위 레이어 방향의 import는 금지됩니다.

### 5.3 데이터 흐름

```
[사용자 액션]
    ↓
[Pages] ← 라우트 파라미터, 페이지 상태 관리
    ↓
[Widgets] ← UI 합성, 이벤트 핸들링 위임
    ↓
[Features] ← mutation 훅 (useCreatePost, useUpdatePost, useDeletePost)
[Entities] ← query 훅 (usePosts, usePost)
    ↓
[Shared/API] ← fetch 래퍼로 서버 통신
    ↓
[NestJS 서버]
```

### 5.4 캐시 전략

| 항목 | 전략 |
|------|------|
| staleTime | 60초 (1분간 캐시 데이터 사용) |
| 페이지 전환 | `keepPreviousData`로 이전 페이지 유지하며 로딩 |
| 게시물 생성 후 | `queryClient.invalidateQueries`로 목록 캐시 무효화 |
| 게시물 수정 후 | 해당 상세 캐시 + 목록 캐시 동시 무효화 |
| 게시물 삭제 후 | 목록 캐시 무효화 (목록 페이지로 이동) |
| 재시도 | 실패 시 1회 재시도 |
| 윈도우 포커스 | 자동 재조회 비활성화 |

---

## 6. 주요 기술 결정 사항

| 결정 | 선택 | 이유 |
|------|------|------|
| HTTP 클라이언트 | native `fetch` 래퍼 | axios 추가 의존성 불필요, fetch로 충분한 요구사항 |
| 상태 관리 | TanStack Query 단독 | 서버 상태만 존재하며, 클라이언트 전역 상태 불필요 |
| 폼 검증 | yup + react-hook-form | 스키마 기반 검증, shadcn Form과 통합 |
| 라우팅 | TanStack Router | 이미 설치됨, 타입 안전 네비게이션 제공 |
| 스타일링 | Tailwind CSS v4 | shadcn/ui 필수 의존성, Vite 플러그인 방식으로 설정 최소화 |
| 슬라이스 네이밍 | 도메인 기반 (`post/`) | 모든 레이어에서 일관된 구조, FSD 규칙 준수 |

---

## 7. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 타입 안전성 | TypeScript strict 모드, `any` 타입 사용 금지 |
| 코드 품질 | ESLint 규칙 준수, 빌드 에러 없음 |
| 성능 | 페이지 전환 시 이전 데이터 유지 (깜빡임 방지) |
| 접근성 | shadcn/ui 기본 접근성 속성 유지 |
| 확장성 | 수정/삭제 기능 추가 시 기존 구조 변경 최소화 |

---

## 8. 향후 확장 가능 영역

현재 범위에서 제외되었으나, FSD 구조 덕분에 독립적으로 추가 가능한 기능들:

- `features/post/` — 게시 상태 필터링 기능 추가
- `widgets/post/` — 게시물 검색 위젯 추가
- `entities/user/` — 사용자 엔티티 및 인증 기능 추가
