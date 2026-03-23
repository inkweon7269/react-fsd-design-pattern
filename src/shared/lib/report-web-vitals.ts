import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import type { Metric } from "web-vitals";

function logMetric(metric: Metric) {
  const value =
    metric.name === "CLS"
      ? metric.value.toFixed(3)
      : `${Math.round(metric.value)}ms`;
  console.log(`[Web Vitals] ${metric.name}: ${value}`);
}

export function reportWebVitals(onReport: (metric: Metric) => void = logMetric) {
  onFCP(onReport);
  onLCP(onReport);
  onCLS(onReport);
  onINP(onReport);
  onTTFB(onReport);
}
