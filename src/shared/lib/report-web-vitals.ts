import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import type { Metric } from "web-vitals";

function logMetric(metric: Metric) {
  console.log(`[Web Vitals] ${metric.name}: ${Math.round(metric.value)}ms`);
}

export function reportWebVitals(onReport: (metric: Metric) => void = logMetric) {
  onFCP(onReport);
  onLCP(onReport);
  onCLS(onReport);
  onINP(onReport);
  onTTFB(onReport);
}
