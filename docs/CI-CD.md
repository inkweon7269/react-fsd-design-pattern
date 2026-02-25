# CI/CD 전략 기획서

## 1. 프로젝트 현황

| 항목 | 상태 |
|---|---|
| 런타임 | Node.js v24.13.0, pnpm 9.11.0 |
| 빌드 | `tsc -b && vite build` → `dist/` |
| 린트 | ESLint flat config (`eslint .`) |
| 단위/통합 테스트 | Vitest 7파일 30개 (MSW 기반, 백엔드 불필요) |
| E2E 테스트 | Playwright 4파일 10개 (실제 백엔드 API 필요) |
| 배포 채널 | 미정 |
| 버전 고정 파일 | `.nvmrc` (`24`), `packageManager: pnpm@9.11.0` |
| 커버리지 도구 | `@vitest/coverage-v8` (v8 provider 설정 완료) |

### 빌드 스크립트

```bash
pnpm lint          # ESLint
pnpm build         # tsc -b + vite build (타입 체크 포함)
pnpm test:run      # Vitest 단일 실행
pnpm test:e2e      # Playwright E2E
```

> **주의:** `pnpm build`가 `tsc -b`를 포함하므로, 별도 타입 체크 단계를 추가하면 중복 실행된다.

### E2E 테스트 의존성

E2E 테스트는 Playwright가 실제 브라우저를 열고 Vite dev 서버(`localhost:5173`)에 접속한다. Vite dev 서버는 `/api` 요청을 `localhost:3000`으로 프록시한다.

```text
Playwright → 브라우저 → Vite dev 서버(:5173) → proxy → 백엔드 API(:3000)
```

- **MSW는 Vitest 전용.** E2E에서는 사용되지 않는다.
- **E2E 실행 시 백엔드 API 서버가 반드시 필요하다.**
- Playwright 설정에서 `reuseExistingServer: !process.env.CI`로 CI 환경을 구분한다.

### 커버리지 현황

`@vitest/coverage-v8`이 설치되어 있고, `vitest.config.ts`에 v8 provider가 설정되어 있다. `pnpm test:run --coverage` 실행 시 `coverage/` 디렉토리에 리포트가 생성된다. PR 생성 시 `coverage.yml` 워크플로우가 커버리지 리포트를 PR 코멘트로 게시한다.

---

## 2. CI 파이프라인 설계

### 워크플로우 트리거

```yaml
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true
```

동일 브랜치에서 빠르게 연속 push할 경우, 이전 CI 실행을 자동 취소하여 불필요한 리소스 사용을 방지한다.

### Job 구성

```text
PR / push
    │
    ├── Job 1: lint (병렬)
    │     └── pnpm lint
    │
    ├── Job 2: test (병렬)
    │     └── pnpm test:run
    │
    └── Job 3: build (병렬)
          ├── pnpm build  ← tsc 타입 체크 포함
          └── dist/ 아티팩트 업로드
```

세 Job은 **독립적으로 병렬 실행**된다. `pnpm build`가 `tsc -b`를 포함하므로 별도 타입 체크 Job을 두지 않는다.

### Job 상세

#### Job 1: Lint

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: ".nvmrc"
        cache: "pnpm"
    - run: pnpm install --frozen-lockfile
    - run: pnpm lint
```

#### Job 2: Unit/Integration Test

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: ".nvmrc"
        cache: "pnpm"
    - run: pnpm install --frozen-lockfile
    - run: pnpm test:run
```

- MSW가 네트워크 요청을 가로채므로 **백엔드 없이 실행 가능**.
- `--frozen-lockfile`으로 lockfile 무결성을 보장한다.

#### Job 3: Build

```yaml
build:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: ".nvmrc"
        cache: "pnpm"
    - run: pnpm install --frozen-lockfile
    - run: pnpm build
    - uses: actions/upload-artifact@v4
      with:
        name: dist
        path: dist/
```

- `pnpm build` = `tsc -b` + `vite build`. 타입 에러가 있으면 빌드가 실패한다.
- `dist/` 아티팩트를 업로드하여 이후 배포 Job에서 재사용한다.

### 추가 워크플로우

#### Coverage — PR 커버리지 리포트

PR 생성 시 테스트 커버리지를 측정하고, 결과를 PR 코멘트로 게시한다.

```yaml
name: Coverage

on:
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true

permissions:
  pull-requests: write

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run --coverage
      - uses: davelosert/vitest-coverage-report-action@v2
        with:
          json-summary-path: coverage/coverage-summary.json
          json-final-path: coverage/coverage-final.json
          file-coverage-mode: changes
          name: Unit Test Coverage
```

- `file-coverage-mode: changes`로 변경된 파일의 커버리지만 표시한다.
- `vitest.config.ts`에 v8 provider와 `json`, `json-summary` reporter가 설정되어 있다.

#### PR Auto Label — FSD 기반 자동 라벨링

PR에서 변경된 파일 경로에 따라 FSD 레이어 라벨을 자동 부여한다.

```yaml
name: PR Auto Label

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          sync-labels: true
```

라벨 규칙 (`.github/labeler.yml`):

| 라벨 | 경로 패턴 |
|---|---|
| `shared` | `src/shared/**` |
| `entities` | `src/entities/**` |
| `features` | `src/features/**` |
| `widgets` | `src/widgets/**` |
| `pages` | `src/pages/**` |
| `app` | `src/app/**` |
| `test` | `src/**/*.test.*`, `e2e/**` |
| `documentation` | `*.md`, `docs/**` |
| `ci` | `.github/**` |

#### Dependency Audit — 보안 감사

프로덕션 의존성의 알려진 취약점을 검사한다. 비차단(`continue-on-error: true`)으로 실행되며, 주간 스케줄로도 자동 실행된다.

```yaml
name: Dependency Audit

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 0 * * 1" # 매주 월요일 00:00 UTC (09:00 KST)

concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true

jobs:
  audit:
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --prod
```

#### Dependabot — 의존성 자동 업데이트

매주 월요일(Asia/Seoul) 의존성 업데이트 PR을 자동 생성한다. 관련 패키지를 그룹화하여 PR 수를 최소화한다.

| 그룹 | 포함 패키지 |
|---|---|
| `react` | react, react-dom, @types/react* |
| `tanstack` | @tanstack/* |
| `testing` | vitest, @vitest/*, @testing-library/*, @playwright/test, msw, jsdom |
| `eslint` | eslint*, typescript-eslint, globals |
| `ui` | radix-ui, class-variance-authority, clsx, tailwind-merge, lucide-react, shadcn, tw-animate-css |
| `form` | react-hook-form, @hookform/*, yup, zod |
| `build` | vite, @vitejs/*, tailwindcss, @tailwindcss/*, typescript |

GitHub Actions 생태계도 별도로 주간 업데이트를 확인한다.

---

## 3. E2E 테스트 전략

CI에서 E2E를 실행하려면 백엔드 API 서버가 필요하다. 현재 단계에서는 배포 채널과 백엔드 인프라가 미정이므로, 아래 3가지 방안 중 선택한다.

### 방안 비교

| 방안 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A. CI에서 E2E 제외** | 로컬에서만 E2E 실행 | 단순, 추가 인프라 불필요 | 자동 검증 불가 |
| **B. Docker Compose** | 백엔드 컨테이너를 CI에서 실행 | 실제 환경과 동일한 검증 | 백엔드 Docker 이미지 필요 |
| **C. MSW 브라우저 모킹** | E2E에서도 MSW로 API 모킹 | 백엔드 완전 독립 | 테스트 코드 수정 필요, 실제 API 검증 불가 |

### 방안 A: CI에서 E2E 제외 (현재 권장)

배포 채널 미정 상태에서 가장 현실적인 선택이다.

```yaml
# ci.yml에 E2E 없음. 로컬에서 수동 실행:
# 1. 백엔드 API 서버 실행 (localhost:3000)
# 2. pnpm test:e2e
```

### 방안 B: Docker Compose (백엔드 확정 후)

백엔드 Docker 이미지가 준비되면 적용한다.

```yaml
e2e:
  runs-on: ubuntu-latest
  needs: [build]  # 빌드 통과 후 실행
  services:
    api:
      image: backend-api:latest
      ports:
        - 3000:3000
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: ".nvmrc"
        cache: "pnpm"
    - run: pnpm install --frozen-lockfile
    - run: npx playwright install chromium
    - run: pnpm test:e2e
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: |
          test-results/
          playwright-report/
```

### 방안 C: MSW 브라우저 모킹 (대안)

E2E 테스트에서도 MSW를 사용하려면 다음 작업이 필요하다:

1. `npx msw init public/` 실행하여 Service Worker 파일 생성
2. E2E 테스트 진입 시 `worker.start()` 호출
3. 기존 E2E 테스트의 API 의존성을 MSW 핸들러로 교체

---

## 4. CD 파이프라인 (배포)

배포 채널 미정이므로 **빌드 아티팩트 생성까지만 자동화**하고, 배포 단계는 대상 확정 후 추가한다.

### 워크플로우 구조

```text
main 브랜치 머지
    │
    ├── CI 통과 (lint + test + build)
    │
    └── Deploy Job (배포 채널 확정 시 추가)
          └── dist/ 아티팩트를 대상 환경에 배포
```

### 배포 채널별 구현 예시

#### Vercel

```yaml
deploy:
  needs: [lint, test, build]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4
    - uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: "--prod"
```

#### GitHub Pages

```yaml
deploy:
  needs: [lint, test, build]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  permissions:
    pages: write
    id-token: write
  environment:
    name: github-pages
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    - uses: actions/configure-pages@v5
    - uses: actions/upload-pages-artifact@v3
      with:
        path: dist/
    - uses: actions/deploy-pages@v4
```

> **참고:** GitHub Pages를 사용할 경우 `vite.config.ts`에 `base` 옵션 설정이 필요하다. SPA 라우팅을 위해 404.html 리다이렉트도 필요하다.

#### AWS S3 + CloudFront

```yaml
deploy:
  needs: [lint, test, build]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    - uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ap-northeast-2
    - run: aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }} --delete
    - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} --paths "/*"
```

#### Netlify

```yaml
deploy:
  needs: [lint, test, build]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    - run: npx netlify-cli deploy --prod --dir=dist
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

#### Cloudflare Pages

```yaml
deploy:
  needs: [lint, test, build]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  permissions:
    contents: read
    deployments: write
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    - uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        command: pages deploy dist/ --project-name=${{ secrets.CLOUDFLARE_PROJECT_NAME }}
```

> **참고:** Cloudflare Pages는 SPA 라우팅을 기본 지원한다. 별도의 리다이렉트 설정 없이 클라이언트 사이드 라우팅이 동작한다.

---

## 5. 사전 작업 목록

### 완료

| 작업 | 설명 | 상태 |
|---|---|---|
| `.nvmrc` 생성 | `24` 작성 (Node.js 24, 로컬 환경과 일치) | 완료 |
| `package.json`에 `packageManager` 추가 | `"packageManager": "pnpm@9.11.0"` | 완료 |
| `.github/workflows/ci.yml` 생성 | lint + test + build 3개 Job 병렬 실행 + concurrency group | 완료 |
| 커버리지 설정 | `@vitest/coverage-v8` 설치 + `vitest.config.ts`에 v8 provider 추가 | 완료 |
| PR 커버리지 리포트 | `coverage.yml` — PR 코멘트로 커버리지 게시 | 완료 |
| PR 자동 라벨링 | `pr-auto-label.yml` + `labeler.yml` — FSD 레이어별 라벨 | 완료 |
| 보안 감사 | `dependency-audit.yml` — `pnpm audit --prod` 주간 + push/PR | 완료 |
| 의존성 자동 업데이트 | `dependabot.yml` — 7개 그룹 + GitHub Actions 생태계 | 완료 |

### 미완료 (선택)

| 작업 | 설명 |
|---|---|
| Branch Protection Rule | main 브랜치에 CI 통과 필수 조건 설정 |
| Playwright retries | CI 환경에서 `retries: 1` 설정 (네트워크 불안정 대응) |
| PR 크기 제한 | `danger-js` 또는 GitHub Actions로 대규모 PR 경고 |

---

## 6. 전체 흐름 요약

```text
개발자
  │
  ├── feature 브랜치에서 작업
  │
  ├── main 브랜치로 PR
  │     ├── CI 자동 실행 (lint + test + build)
  │     ├── Coverage 리포트 → PR 코멘트
  │     ├── PR Auto Label → FSD 레이어 라벨 자동 부여
  │     ├── Dependency Audit → 보안 감사 (non-blocking, continue-on-error)
  │     │     ├── 실패 → PR에 경고 표시 (머지 차단하지 않음)
  │     │     └── 통과 → 코드 리뷰 후 머지
  │     └── (Dependabot → 주간 의존성 업데이트 PR 자동 생성)
  │
  └── main 머지 시
        └── CD 자동 실행 (배포 채널 확정 후)
              └── dist/ → 배포 대상 환경
```
