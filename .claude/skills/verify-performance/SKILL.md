---
name: verify-performance
description: Chrome DevTools MCP를 통해 모든 페이지의 성능 테스트, Lighthouse 감사, 디버깅을 수행합니다. 기능 구현 후, PR 전 사용.
argument-hint: '[선택사항: 특정 페이지 URL 또는 "lighthouse-only", "performance-only", "debug-only"]'
---

# Chrome DevTools 성능 검증

## Purpose

Chrome DevTools MCP 서버를 활용하여 모든 페이지의 프론트엔드 품질을 자동 검증합니다:

1. **Performance Trace** — LCP, TTFB, CLS 등 Core Web Vitals 측정
2. **Lighthouse 감사** — Accessibility, Best Practices, SEO 점수 측정
3. **콘솔 에러 점검** — 런타임 에러 및 경고 탐지
4. **네트워크 요청 점검** — 실패한 API 요청 탐지

## When to Run

- 새로운 페이지 또는 컴포넌트를 추가한 후
- 레이아웃, 스타일 변경 후
- 성능 관련 코드 변경 후 (로딩 상태, Skeleton, lazy loading 등)
- Pull Request를 생성하기 전
- CLS, LCP 등 Core Web Vitals 이슈를 디버깅할 때

## Prerequisites

Chrome DevTools MCP 서버가 연결되어 있어야 합니다:

1. Chrome에서 `chrome://inspect/#remote-debugging` → 원격 디버깅 활성화
2. `~/.claude.json`에 chrome-devtools MCP 서버 설정 (`--autoConnect` 옵션 포함)
3. Vite dev 서버 실행 중 (`pnpm dev`)

## Related Files

| File | Purpose |
| ---- | ------- |
| `src/index.css` | 글로벌 CSS (scrollbar-gutter 등 CLS 관련) |
| `src/app/router/routes/` | 라우트 정의 (테스트 대상 페이지 목록) |
| `src/app/layouts/root-layout.tsx` | 루트 레이아웃 (공통 UI 영향) |

## Test Targets

테스트 대상 페이지 목록입니다. 새 페이지 추가 시 이 목록을 업데이트합니다.

### 비인증 페이지

| # | 페이지 | URL | 비고 |
|---|--------|-----|------|
| 1 | 로그인 | `/` | 게스트 가드 적용 |
| 2 | 회원가입 | `/register` | 게스트 가드 적용 |

### 인증 필요 페이지

| # | 페이지 | URL | 비고 |
|---|--------|-----|------|
| 3 | 게시글 목록 | `/posts` | 페이지네이션, Skeleton 로딩 |
| 4 | 게시글 생성 | `/posts/create` | 폼, Switch 컴포넌트 |
| 5 | 게시글 상세 | `/posts/$postId` | API 데이터 로딩, 삭제 다이얼로그 |
| 6 | 게시글 수정 | `/posts/$postId/edit` | 폼 프리필, API 데이터 로딩 |
| 7 | 프로필 | `/profile` | 프로필 API 데이터 로딩 |

## Workflow

### Step 1: 사전 준비

**도구:** MCP chrome-devtools (list_pages, navigate_page)

#### 1a. Chrome DevTools MCP 연결 확인

`list_pages`로 브라우저 연결 상태를 확인합니다.

**연결 실패 시:** Prerequisites 섹션의 설정 안내를 표시하고 종료합니다.

#### 1b. Dev 서버 확인

`http://localhost:5173`으로 접속을 시도합니다.

**접속 실패 시:** `pnpm dev` 실행을 안내하고 종료합니다.

#### 1c. 인수 처리

- 인수 없음: 전체 페이지에 대해 Performance + Lighthouse + Debug 실행
- 특정 URL: 해당 페이지만 테스트
- `lighthouse-only`: Lighthouse 감사만 실행
- `performance-only`: Performance Trace만 실행
- `debug-only`: 콘솔 에러 + 네트워크 점검만 실행

### Step 2: 테스트 데이터 준비

**도구:** MCP chrome-devtools (fill_form, click, wait_for)

인증 필요 페이지 테스트를 위해 로그인이 필요합니다.

#### 2a. 현재 인증 상태 확인

`/posts`로 이동하여 리다이렉트 여부를 확인합니다.

- `/posts`에 머물면: 로그인 상태 → Step 2c로 이동
- `/`로 리다이렉트: 비로그인 상태 → Step 2b로 이동

#### 2b. 로그인 수행

1. 로그인 폼에 테스트 계정 정보 입력 (`fill_form` 사용 — React Hook Form 호환)
2. Login 버튼 클릭
3. `/posts` 페이지 도달 확인

**로그인 실패 시:** 사용자에게 테스트 계정 정보를 요청합니다.

#### 2c. 테스트용 게시글 확인

`/posts` 페이지에서 게시글 존재 여부를 확인합니다.

- 게시글 있음: 첫 번째 게시글의 ID를 기록하여 상세/수정 페이지 테스트에 사용
- 게시글 없음: 테스트용 게시글 1개 생성 후 ID 기록

### Step 3: 비인증 페이지 테스트

**도구:** MCP chrome-devtools (navigate_page, performance_start_trace, lighthouse_audit, list_console_messages, list_network_requests)

비인증 페이지 테스트를 위해 먼저 로그아웃합니다.

각 비인증 페이지에 대해 다음을 수행합니다:

#### 3a. Performance Trace

```
navigate_page → 대상 URL
performance_start_trace (reload: true, autoStop: true)
```

기록할 메트릭:
- **LCP** (Largest Contentful Paint)
- **TTFB** (Time To First Byte)
- **CLS** (Cumulative Layout Shift)

#### 3b. Lighthouse 감사

```
lighthouse_audit (device: desktop, mode: navigation)
```

기록할 점수:
- **Accessibility**
- **Best Practices**
- **SEO**

#### 3c. 디버깅 점검

```
list_console_messages (types: ["error", "warn"])
list_network_requests (resourceTypes: ["fetch", "xhr"])
```

기록할 항목:
- 콘솔 에러/경고 개수 및 내용
- 실패한 네트워크 요청 (4xx, 5xx 응답)

### Step 4: 인증 페이지 테스트

다시 로그인 후, 각 인증 필요 페이지에 대해 Step 3a ~ 3c와 동일한 테스트를 수행합니다.

**게시글 상세/수정 페이지**: Step 2c에서 기록한 게시글 ID를 사용하여 URL을 구성합니다:
- `/posts/{postId}` → 게시글 상세
- `/posts/{postId}/edit` → 게시글 수정

### Step 5: CLS 상세 분석 (조건부)

**CLS > 0인 페이지가 있는 경우에만 실행합니다.**

#### 5a. CLSCulprits 분석

```
performance_analyze_insight (insightSetId: "NAVIGATION_0", insightName: "CLSCulprits")
```

#### 5b. DOM 레이아웃 시프트 소스 확인

```javascript
// evaluate_script로 실행
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // entry.sources에서 시프트된 요소 식별
  }
}).observe({ type: 'layout-shift', buffered: true });
```

#### 5c. 원인 분류 및 해결 방안 제시

| 원인 | 해결 방안 |
|------|-----------|
| 스크롤바 표시/숨김 | `scrollbar-gutter: stable` 적용 |
| Skeleton과 실제 콘텐츠 높이 차이 | Skeleton 높이를 실제 콘텐츠와 일치시킴 |
| 이미지/폰트 로딩 | `width`/`height` 명시 또는 `aspect-ratio` 설정 |
| 동적 콘텐츠 삽입 | `min-height` 예약 또는 `content-visibility` 활용 |

### Step 6: 결과 보고서 작성

모든 테스트 완료 후, 종합 보고서를 출력합니다.

## Output Format

```markdown
## 성능 검증 결과

### Performance Trace

| 페이지 | LCP | TTFB | CLS | 평가 |
|--------|-----|------|-----|------|
| `/` (로그인) | Xms | Xms | X.XX | Good/Needs Improvement/Poor |
| `/register` | Xms | Xms | X.XX | ... |
| `/posts` | Xms | Xms | X.XX | ... |
| `/posts/create` | Xms | Xms | X.XX | ... |
| `/posts/:id` | Xms | Xms | X.XX | ... |
| `/posts/:id/edit` | Xms | Xms | X.XX | ... |
| `/profile` | Xms | Xms | X.XX | ... |

> LCP 기준: Good < 2,500ms / Needs Improvement < 4,000ms / Poor > 4,000ms
> CLS 기준: Good <= 0.1 / Needs Improvement <= 0.25 / Poor > 0.25

### Lighthouse 감사

| 페이지 | Accessibility | Best Practices | SEO |
|--------|:---:|:---:|:---:|
| `/` | X | X | X |
| ... | ... | ... | ... |

### 디버깅 점검

| 페이지 | 콘솔 에러 | 콘솔 경고 | 실패 API |
|--------|:---------:|:---------:|:--------:|
| `/` | 0 | 0 | 0 |
| ... | ... | ... | ... |

### 분석 요약

1. **Core Web Vitals**: [전체 평가]
2. **Lighthouse**: [주요 감점 항목 분석]
3. **에러/경고**: [발견된 문제]
4. **개선 제안**: [구체적 조치 사항]
```

## Pass/Fail Criteria

| 항목 | PASS | WARN | FAIL |
|------|------|------|------|
| LCP | < 2,500ms | < 4,000ms | >= 4,000ms |
| CLS | = 0.00 | <= 0.1 | > 0.1 |
| Accessibility | >= 90 | >= 70 | < 70 |
| Best Practices | >= 90 | >= 70 | < 70 |
| SEO | >= 80 | >= 60 | < 60 |
| 콘솔 에러 | 0개 | - | >= 1개 |
| 실패 API | 0개 | - | >= 1개 |

## Exceptions

다음은 **문제가 아닙니다**:

1. **Vite dev 모드의 높은 LCP** — dev 모드는 모듈을 개별 로딩하므로 LCP가 프로덕션 대비 높을 수 있음. 2,500ms 이내라면 정상
2. **SPA의 SEO 점수 80점대** — CSR 기반 SPA는 meta description 부재 등으로 SEO 점수가 낮을 수 있음. 80점 이상이면 정상
3. **React Hook Form DevTool 관련 콘솔 메시지** — 개발 도구의 메시지는 프로덕션에 영향 없음
4. **TanStack Query DevTools 관련 요소** — 개발 도구 버튼/패널은 CLS 분석에서 제외
5. **CharacterSet 인사이트** — Vite dev 서버의 HTML 응답에 charset 선언이 없는 것은 프로덕션 빌드에서 해결됨
6. **CrUX 데이터 없음** — localhost 환경에서는 실제 사용자 데이터(field data)가 없는 것이 정상
