import { lazy, Suspense } from "react";
import type { Control } from "react-hook-form";

const LazyDevTool = import.meta.env.DEV
  ? lazy(() =>
      import("@hookform/devtools").then((m) => ({ default: m.DevTool })),
    )
  : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormDevTool({ control }: { control: Control<any> }) {
  if (!import.meta.env.DEV || !LazyDevTool) return null;

  return (
    <Suspense fallback={null}>
      <LazyDevTool control={control} />
    </Suspense>
  );
}
