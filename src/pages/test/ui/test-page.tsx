import { useState } from "react";
import { ErrorBoundary } from "@/shared/ui";
import { Button } from "@/shared/ui";
import type { FallbackProps } from "@/shared/ui";
import { useErrorBoundary } from "react-error-boundary";

// ─── 예시 1: 기본 fallback (JSX) ────────────────────────────────
// 가장 간단한 형태. fallback prop에 JSX를 넘긴다.

function BrokenComponent(): React.JSX.Element {
  throw new Error("이 컴포넌트는 항상 에러를 발생시킵니다!");
}

function BasicFallbackExample() {
  const [show, setShow] = useState(false);

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">
        1. fallback — 정적 JSX 폴백
      </h2>
      <p className="text-sm text-muted-foreground">
        가장 간단한 형태로, 에러 발생 시 고정된 JSX를 보여줍니다. 리셋 기능은
        없습니다.
      </p>
      <Button variant="outline" size="sm" onClick={() => setShow(true)}>
        에러 발생시키기
      </Button>
      {show && (
        <ErrorBoundary
          fallback={
            <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
              에러가 발생했습니다. (정적 폴백)
            </div>
          }
        >
          <BrokenComponent />
        </ErrorBoundary>
      )}
    </section>
  );
}

// ─── 예시 2: FallbackComponent (리셋 가능) ──────────────────────
// resetErrorBoundary를 통해 재시도가 가능한 형태.

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="space-y-2 rounded border border-red-200 bg-red-50 p-4">
      <p className="font-medium text-red-700">
        에러 발생: {error instanceof Error ? error.message : "알 수 없는 에러"}
      </p>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        다시 시도
      </Button>
    </div>
  );
}

function UnstableComponent() {
  const [count, setCount] = useState(0);

  if (count >= 3) {
    throw new Error("카운트가 3 이상이면 에러 발생!");
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-lg">{count}</span>
      <Button variant="outline" size="sm" onClick={() => setCount((c) => c + 1)}>
        +1 (3이 되면 에러)
      </Button>
    </div>
  );
}

function FallbackComponentExample() {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">
        2. FallbackComponent — 리셋 가능한 폴백
      </h2>
      <p className="text-sm text-muted-foreground">
        FallbackComponent에 error와 resetErrorBoundary가 전달됩니다. 버튼 클릭으로
        에러를 리셋하고 컴포넌트를 다시 렌더링합니다.
      </p>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <UnstableComponent />
      </ErrorBoundary>
    </section>
  );
}

// ─── 예시 3: onReset + resetKeys ────────────────────────────────
// 특정 상태가 바뀌면 자동으로 에러를 리셋하는 패턴.

function ResetKeysExample() {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">
        3. resetKeys — 상태 변경 시 자동 리셋
      </h2>
      <p className="text-sm text-muted-foreground">
        resetKeys 배열의 값이 변경되면 ErrorBoundary가 자동으로 리셋됩니다.
        onReset 콜백에서 추가 정리 로직을 실행할 수 있습니다.
      </p>
      <div className="flex items-center gap-3">
        <span className="text-sm">retryCount: {retryCount}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRetryCount((c) => c + 1)}
        >
          retryCount 증가 (자동 리셋)
        </Button>
      </div>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => console.log("ErrorBoundary가 리셋되었습니다.")}
        resetKeys={[retryCount]}
      >
        <BrokenComponent />
      </ErrorBoundary>
    </section>
  );
}

// ─── 예시 4: useErrorBoundary 훅 ────────────────────────────────
// 이벤트 핸들러나 비동기 코드에서 발생한 에러를 ErrorBoundary로 전파.

function AsyncErrorComponent() {
  const { showBoundary } = useErrorBoundary();

  const handleClick = async () => {
    try {
      // 비동기 작업 시뮬레이션
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error("API 호출 실패!")), 500),
      );
    } catch (error) {
      showBoundary(error);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      비동기 에러 발생시키기 (0.5초 후)
    </Button>
  );
}

function UseErrorBoundaryExample() {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">
        4. useErrorBoundary — 비동기 에러 처리
      </h2>
      <p className="text-sm text-muted-foreground">
        렌더링 중이 아닌 이벤트 핸들러/비동기 코드의 에러는 React가 자동으로
        잡지 못합니다. useErrorBoundary의 showBoundary로 수동 전파합니다.
      </p>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AsyncErrorComponent />
      </ErrorBoundary>
    </section>
  );
}

// ─── 페이지 ─────────────────────────────────────────────────────

export const TestPage = () => {
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">
        react-error-boundary 사용 예시
      </h1>

      <BasicFallbackExample />
      <hr />
      <FallbackComponentExample />
      <hr />
      <ResetKeysExample />
      <hr />
      <UseErrorBoundaryExample />
    </div>
  );
};
