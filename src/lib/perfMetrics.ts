/**
 * Telemetria de performance leve, 100% client-side.
 * - Não envia para o banco. Custo zero.
 * - Lê Performance API + PerformanceObserver e mantém um buffer em memória.
 * - O overlay de debug consome esse buffer.
 */

export interface RouteMetric {
  path: string;
  startedAt: number;
  loadedAt?: number;
  durationMs?: number;
}

export interface SlowEvent {
  type: "longtask" | "fetch" | "render";
  label: string;
  durationMs: number;
  timestamp: number;
  detail?: string;
}

const SLOW_FETCH_MS = 800;
const SLOW_LONGTASK_MS = 200;
const MAX_EVENTS = 200;

const state = {
  routes: [] as RouteMetric[],
  events: [] as SlowEvent[],
  ttfbMs: undefined as number | undefined,
  domContentLoadedMs: undefined as number | undefined,
  fcpMs: undefined as number | undefined,
  listeners: new Set<() => void>(),
  initialized: false,
};

function notify() {
  state.listeners.forEach((l) => {
    try { l(); } catch { /* ignore */ }
  });
}

function pushEvent(e: SlowEvent) {
  state.events.push(e);
  if (state.events.length > MAX_EVENTS) state.events.shift();
  notify();
}

export function initPerfMetrics() {
  if (state.initialized || typeof window === "undefined") return;
  state.initialized = true;

  // Web Vitals básicos via Navigation Timing
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      state.ttfbMs = Math.round(nav.responseStart - nav.requestStart);
      state.domContentLoadedMs = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
    }
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    if (fcp) state.fcpMs = Math.round(fcp.startTime);
  } catch { /* ignore */ }

  // Long tasks (>50ms na main thread)
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= SLOW_LONGTASK_MS) {
          pushEvent({
            type: "longtask",
            label: "Main thread bloqueada",
            durationMs: Math.round(entry.duration),
            timestamp: Date.now(),
          });
        }
      }
    });
    obs.observe({ type: "longtask", buffered: true });
  } catch { /* longtask API não suportada em todos os browsers */ }

  // Resource timing — só registra os realmente lentos
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (entry.duration >= SLOW_FETCH_MS && (entry.initiatorType === "fetch" || entry.initiatorType === "xmlhttprequest")) {
          const url = new URL(entry.name, location.origin);
          pushEvent({
            type: "fetch",
            label: url.pathname.split("/").slice(-2).join("/") || url.host,
            durationMs: Math.round(entry.duration),
            timestamp: Date.now(),
            detail: url.host,
          });
        }
      }
    });
    obs.observe({ type: "resource", buffered: true });
  } catch { /* ignore */ }
}

export function trackRouteStart(path: string) {
  state.routes.push({ path, startedAt: performance.now() });
  if (state.routes.length > 50) state.routes.shift();
  notify();
}

export function trackRouteLoaded(path: string) {
  const last = [...state.routes].reverse().find((r) => r.path === path && r.loadedAt === undefined);
  if (last) {
    last.loadedAt = performance.now();
    last.durationMs = Math.round(last.loadedAt - last.startedAt);
    if (last.durationMs >= 600) {
      pushEvent({
        type: "render",
        label: `Rota lenta: ${path}`,
        durationMs: last.durationMs,
        timestamp: Date.now(),
      });
    }
    notify();
  }
}

export function getMetricsSnapshot() {
  return {
    ttfbMs: state.ttfbMs,
    domContentLoadedMs: state.domContentLoadedMs,
    fcpMs: state.fcpMs,
    routes: state.routes.slice(-10),
    events: state.events.slice(-50),
  };
}

export function subscribePerfMetrics(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

export function clearMetrics() {
  state.routes = [];
  state.events = [];
  notify();
}
