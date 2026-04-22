import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import {
  initPerfMetrics,
  trackRouteStart,
  trackRouteLoaded,
  getMetricsSnapshot,
  subscribePerfMetrics,
  clearMetrics,
} from "@/lib/perfMetrics";
import { Activity, X, Trash2 } from "lucide-react";

const STORAGE_KEY = "__natleva_perf_overlay__";

function isEnabledByUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("debug") === "1";
}

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

function writeStored(on: boolean) {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/**
 * Overlay de diagnóstico de performance.
 * Liga/desliga via:
 *  - URL ?debug=1
 *  - Atalho Ctrl+Shift+D (ou Cmd+Shift+D no Mac)
 *  - localStorage __natleva_perf_overlay__ = "1"
 *
 * Custo zero quando desligado: não renderiza nada nem assina os observers.
 */
export default function PerfDebugOverlay() {
  const [enabled, setEnabled] = useState<boolean>(() => isEnabledByUrl() || readStored());
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Atalho de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setEnabled((prev) => {
          const next = !prev;
          writeStored(next);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!enabled) return null;
  return <PerfDebugInner currentPath={location.pathname} onClose={() => { setEnabled(false); writeStored(false); }} collapsed={collapsed} setCollapsed={setCollapsed} />;
}

function PerfDebugInner({ currentPath, onClose, collapsed, setCollapsed }: { currentPath: string; onClose: () => void; collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  // Inicializa coletor uma vez
  useEffect(() => { initPerfMetrics(); }, []);

  // Mede tempo de cada navegação
  useEffect(() => {
    trackRouteStart(currentPath);
    const handle = requestAnimationFrame(() => {
      // Quando a próxima frame paintar, considera carregado
      requestAnimationFrame(() => trackRouteLoaded(currentPath));
    });
    return () => cancelAnimationFrame(handle);
  }, [currentPath]);

  const snapshot = useSyncExternalStore(subscribePerfMetrics, getMetricsSnapshot, getMetricsSnapshot);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-[99998] flex h-10 w-10 items-center justify-center rounded-full bg-foreground/90 text-background shadow-2xl backdrop-blur hover:bg-foreground"
        title="Abrir diagnóstico de performance"
      >
        <Activity className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[99998] w-[360px] max-h-[70vh] overflow-hidden rounded-xl border border-border/40 bg-background/95 text-foreground shadow-2xl backdrop-blur-md flex flex-col">
      <header className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Diagnóstico
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearMetrics} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Limpar eventos"><Trash2 className="h-3.5 w-3.5" /></button>
          <button onClick={() => setCollapsed(true)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Minimizar">_</button>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Fechar (Ctrl+Shift+D)"><X className="h-3.5 w-3.5" /></button>
        </div>
      </header>

      <div className="overflow-y-auto px-3 py-2 text-xs space-y-3">
        <section>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Web Vitals</div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="TTFB" value={snapshot.ttfbMs} />
            <Metric label="FCP" value={snapshot.fcpMs} />
            <Metric label="DCL" value={snapshot.domContentLoadedMs} />
          </div>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Rotas recentes</div>
          {snapshot.routes.length === 0 ? (
            <div className="text-muted-foreground italic">Sem dados ainda…</div>
          ) : (
            <ul className="space-y-1">
              {snapshot.routes.slice().reverse().map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{r.path}</span>
                  <span className={r.durationMs && r.durationMs > 600 ? "text-amber-500" : "text-muted-foreground"}>
                    {r.durationMs ? `${r.durationMs}ms` : "…"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Eventos lentos</div>
          {snapshot.events.length === 0 ? (
            <div className="text-muted-foreground italic">Nada lento detectado 🎉</div>
          ) : (
            <ul className="space-y-1">
              {snapshot.events.slice().reverse().slice(0, 30).map((e, i) => (
                <li key={i} className="flex items-start justify-between gap-2 border-l-2 border-amber-500/40 pl-2">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{e.label}</div>
                    {e.detail && <div className="truncate text-[10px] text-muted-foreground">{e.detail}</div>}
                  </div>
                  <span className="shrink-0 text-amber-500">{e.durationMs}ms</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
          Ctrl/Cmd + Shift + D para alternar · ?debug=1 na URL ativa em qualquer dispositivo
        </footer>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-border/30 bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-mono font-semibold ${value && value > 2500 ? "text-destructive" : value && value > 1500 ? "text-amber-500" : "text-foreground"}`}>
        {value !== undefined ? `${value}ms` : "—"}
      </div>
    </div>
  );
}
