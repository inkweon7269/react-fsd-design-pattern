# React FSD Design Pattern

Feature-Sliced Design(FSD) 아키텍처를 적용한 React 게시판 애플리케이션입니다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19, TypeScript 5.9, Vite 7 |
| 라우팅 | TanStack Router |
| 서버 상태 | TanStack Query |
| 클라이언트 상태 | Zustand |
| 폼 | React Hook Form + Yup |
| UI | shadcn/ui (New York), Tailwind CSS v4 |
| 테스트 | Vitest, Testing Library, MSW, Playwright |

## 프로젝트 구조

FSD 아키텍처를 따릅니다. 레이어 간 import는 **아래 방향으로만** 허용됩니다.

```
src/
├── app/          # 프로바이더, 라우터, 레이아웃
├── pages/        # 라우트 단위 페이지 컴포넌트
├── widgets/      # 복합 UI 블록 (PostList, Header)
├── features/     # 사용자 액션 + 뮤테이션 (생성/수정/삭제)
├── entities/     # 도메인 모델 + 쿼리 (Post, Session)
├── shared/       # 인프라: API 클라이언트, 설정, 타입, UI 컴포넌트
└── main.tsx
```

**핵심 규칙:**
- 각 슬라이스는 `index.ts`를 통해 공개 API 노출 (내부 파일 직접 import 금지)
- 슬라이스 내부는 `model/`, `api/`, `ui/` 세그먼트로 구성
- 같은 레이어의 다른 슬라이스 간 import 금지
- `entities` = 읽기 전용 (쿼리), `features` = 사용자 액션 (뮤테이션)

## 상태 관리

| 상태 종류 | 관리 도구 | 예시 |
|-----------|-----------|------|
| 서버 상태 | TanStack Query | 게시글 목록, 프로필, 세션 |
| 클라이언트 상태 | Zustand | 인증 여부 (`isAuthenticated`) |
| 인증 토큰 | 쿠키 (js-cookie) | accessToken, refreshToken |
| 폼 상태 | React Hook Form | 로그인, 회원가입, 게시글 작성 |

## 시작하기

### 사전 요구사항

- Node.js 18+
- pnpm 9+

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행 (API 프록시: /api → http://localhost:3000)
pnpm dev
```

### 환경 변수

```bash
# .env (선택사항, 기본값: /api)
VITE_API_BASE_URL=/api
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | Vite 개발 서버 실행 |
| `pnpm build` | 타입 체크 + 프로덕션 빌드 |
| `pnpm lint` | ESLint 실행 |
| `pnpm preview` | 프로덕션 빌드 미리보기 |
| `pnpm test:run` | Vitest 단위 테스트 |
| `pnpm test:coverage` | 커버리지 포함 테스트 |
| `pnpm test:e2e` | Playwright E2E 테스트 |

## Git 워크플로우

- `feature/*` 브랜치 → `dev` 대상 **Squash and merge**
- `dev` 브랜치 → `main` 대상 **Create a merge commit**
- `main`/`master`에 직접 push 금지
