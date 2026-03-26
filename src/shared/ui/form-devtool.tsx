import { lazy, Suspense } from "react";
import type { Control, FieldValues } from "react-hook-form";

const LazyDevTool = import.meta.env.DEV
  ? lazy(() =>
      import("@hookform/devtools").then((m) => ({ default: m.DevTool })),
    )
  : null;

export function FormDevTool<T extends FieldValues>({ control }: { control: Control<T> }) {
  if (!import.meta.env.DEV || !LazyDevTool) return null;

  return (
    <Suspense fallback={null}>
      <LazyDevTool control={control as Control<FieldValues>} />
    </Suspense>
  );
}
