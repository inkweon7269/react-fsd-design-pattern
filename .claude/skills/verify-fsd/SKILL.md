---
name: verify-fsd
description: FSD 아키텍처 규칙 준수 여부를 검증합니다. 새 기능 구현 후, PR 전 사용.
---

# FSD 아키텍처 검증

## Purpose

Feature-Sliced Design 아키텍처 규칙 위반을 자동 탐지합니다:

1. **Import 방향 검증** — 상위 레이어가 하위 레이어에서만 import하는지
2. **Public API 검증** — 모든 cross-slice import가 `index.ts`를 통해 이루어지는지
3. **Cross-slice 격리** — 동일 레이어 간 cross-slice import가 없는지
4. **레이어 책임 분리** — entities에 mutation 없고, features에 query 없는지
5. **Slice 구조 검증** — 각 slice에 `index.ts`가 존재하는지

## When to Run

- 새로운 컴포넌트, 훅, API를 추가한 후
- import 구조를 변경한 후
- 새로운 slice를 생성한 후
- Pull Request를 생성하기 전
- 코드 리뷰 중

## Related Files

| File | Purpose |
| ---- | ------- |
| `src/entities/post/index.ts` | Entity public API |
| `src/features/post/index.ts` | Feature public API |
| `src/widgets/post/index.ts` | Widget public API |
| `src/widgets/header/index.ts` | Widget public API |
| `src/pages/post/index.ts` | Page public API |
| `src/shared/ui/index.ts` | Shared UI public API |
| `src/shared/api/index.ts` | Shared API public API |
| `src/shared/config/index.ts` | Shared config public API |
| `src/shared/lib/index.ts` | Shared lib public API |
| `src/shared/types/index.ts` | Shared types public API |
| `src/app/index.ts` | App layer entry |
| `CLAUDE.md` | FSD 아키텍처 규칙 정의 |

## Workflow

### Step 1: Import 방향 검증

**도구:** Grep, Read

FSD 레이어 순서: `app > pages > widgets > features > entities > shared`

상위 레이어에서 하위 레이어로만 import해야 합니다. 역방향 import를 탐지합니다.

**검사 1a: entities에서 features/widgets/pages/app import 금지**

```bash
grep -rn "from '@/features\|from '@/widgets\|from '@/pages\|from '@/app" src/entities/
```

**PASS:** 결과 없음
**FAIL:** entities 레이어에서 상위 레이어를 import하고 있음

**검사 1b: features에서 widgets/pages/app import 금지**

```bash
grep -rn "from '@/widgets\|from '@/pages\|from '@/app" src/features/
```

**PASS:** 결과 없음
**FAIL:** features 레이어에서 상위 레이어를 import하고 있음

**검사 1c: widgets에서 pages/app import 금지**

```bash
grep -rn "from '@/pages\|from '@/app" src/widgets/
```

**PASS:** 결과 없음
**FAIL:** widgets 레이어에서 상위 레이어를 import하고 있음

**검사 1d: pages에서 app import 금지**

```bash
grep -rn "from '@/app" src/pages/
```

**PASS:** 결과 없음
**FAIL:** pages 레이어에서 app 레이어를 import하고 있음

**검사 1e: shared에서 다른 레이어 import 금지**

```bash
grep -rn "from '@/entities\|from '@/features\|from '@/widgets\|from '@/pages\|from '@/app" src/shared/
```

**PASS:** 결과 없음
**FAIL:** shared 레이어에서 다른 레이어를 import하고 있음

### Step 2: Public API 검증

**도구:** Grep

cross-slice import가 `index.ts`를 통해 이루어지는지 확인합니다. 내부 파일(model/, api/, ui/)을 직접 import하는 패턴을 탐지합니다.

**검사 2a: 내부 파일 직접 import 탐지**

```bash
grep -rn "from '@/entities/[^']*/[^']*'" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "src/entities/"
grep -rn "from '@/features/[^']*/[^']*'" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "src/features/"
grep -rn "from '@/widgets/[^']*/[^']*'" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "src/widgets/"
```

**PASS:** 모든 cross-slice import가 `@/entities/post`, `@/features/post` 형태 (슬래시 없이 slice 이름까지만)
**FAIL:** `@/entities/post/model/types` 같이 내부 경로를 직접 import

### Step 3: Cross-slice 격리 검증

**도구:** Grep

동일 레이어 내 다른 slice를 import하는 패턴을 탐지합니다.

**검사 3a: entities 간 cross-slice import**

각 entity slice 디렉토리에서 같은 레이어의 다른 slice를 import하는지 확인합니다.

```bash
grep -rn "from '@/entities/" src/entities/ --include="*.ts" --include="*.tsx"
```

**PASS:** 자기 자신의 상대 경로 import만 존재 (예: `./model/types`)
**FAIL:** `from '@/entities/other-slice'` 형태의 import 존재

**검사 3b: features 간 cross-slice import**

```bash
grep -rn "from '@/features/" src/features/ --include="*.ts" --include="*.tsx"
```

**PASS:** 자기 자신의 상대 경로 import만 존재
**FAIL:** `from '@/features/other-slice'` 형태의 import 존재

**검사 3c: widgets 간 cross-slice import**

```bash
grep -rn "from '@/widgets/" src/widgets/ --include="*.ts" --include="*.tsx"
```

**PASS:** 자기 자신의 상대 경로 import만 존재
**FAIL:** `from '@/widgets/other-slice'` 형태의 import 존재

### Step 4: 레이어 책임 분리 검증

**도구:** Grep

entities는 읽기 전용(query), features는 쓰기(mutation)만 담당해야 합니다.

**검사 4a: entities에 useMutation 사용 금지**

```bash
grep -rn "useMutation" src/entities/ --include="*.ts" --include="*.tsx"
```

**PASS:** 결과 없음
**FAIL:** entities에서 useMutation을 사용하고 있음 — features 레이어로 이동 필요

**검사 4b: features에 useQuery 사용 금지**

```bash
grep -rn "useQuery\|useSuspenseQuery\|useInfiniteQuery" src/features/ --include="*.ts" --include="*.tsx"
```

**PASS:** 결과 없음
**FAIL:** features에서 useQuery를 사용하고 있음 — entities 레이어로 이동 필요

### Step 5: Slice 구조 검증

**도구:** Glob, Bash

각 slice 디렉토리에 `index.ts` public API 파일이 존재하는지 확인합니다.

**검사 5a: 모든 slice에 index.ts 존재 확인**

```bash
# entities 하위 각 디렉토리에 index.ts 존재 여부
for dir in src/entities/*/; do
  [ -f "$dir/index.ts" ] || echo "MISSING: $dir/index.ts"
done

# features 하위 각 디렉토리에 index.ts 존재 여부
for dir in src/features/*/; do
  [ -f "$dir/index.ts" ] || echo "MISSING: $dir/index.ts"
done

# widgets 하위 각 디렉토리에 index.ts 존재 여부
for dir in src/widgets/*/; do
  [ -f "$dir/index.ts" ] || echo "MISSING: $dir/index.ts"
done

# pages 하위 각 디렉토리에 index.ts 존재 여부
for dir in src/pages/*/; do
  [ -f "$dir/index.ts" ] || echo "MISSING: $dir/index.ts"
done
```

**PASS:** 모든 slice에 index.ts 존재
**FAIL:** index.ts가 없는 slice 존재 — public API 파일 생성 필요

## Output Format

```markdown
## FSD 아키텍처 검증 결과

| # | 검사 | 상태 | 상세 |
|---|------|------|------|
| 1 | Import 방향 | PASS/FAIL | 역방향 import N건 |
| 2 | Public API | PASS/FAIL | 내부 직접 import N건 |
| 3 | Cross-slice 격리 | PASS/FAIL | 동일 레이어 cross-slice N건 |
| 4 | 레이어 책임 분리 | PASS/FAIL | 위반 N건 |
| 5 | Slice 구조 | PASS/FAIL | 누락 index.ts N건 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **slice 내부의 상대 경로 import** — `./model/types`, `../ui/PostCard` 같은 slice 내부 import는 정상
2. **app 레이어의 모든 레이어 import** — app은 최상위 레이어로 모든 하위 레이어를 import할 수 있음
3. **shared 레이어의 내부 경로 import** — shared는 slice가 아닌 세그먼트 기반이므로 `@/shared/ui/button` 같은 import는 허용 (단, `index.ts`를 통한 import 권장)
4. **TanStack Router 생성 파일** — `routeTree.gen.ts` 등 자동 생성 파일의 import 패턴은 면제
5. **테스트 파일** — `*.test.ts`, `*.test.tsx`, `*.spec.ts` 파일은 테스트 목적으로 내부 파일을 직접 import할 수 있음
