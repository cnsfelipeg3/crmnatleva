import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Zap, Globe, Database, RefreshCw, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ResourceTiming {
  name: string;
  shortName: string;
  type: string;
  duration: number;
  size: number;
  startTime: number;
}

interface VitalMetric {
  label: string;
  value: number | null;
  unit: string;
  threshold: { good: number; warn: number };
  description: string;
}

function classify(value: number | null, t: { good: number; warn: number }) {
  if (value == null) return "pending";
  if (value <= t.good) return "good";
  if (value <= t.warn) return "warn";
  return "bad";
}

const tone: Record<string, string> = {
  good: "bg-success/10 text-success border-success/20",
  warn: "bg-warning/10 text-warning-foreground border-warning/20",
  bad: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-muted text-muted-foreground border-border",
};

function shortenName(url: string) {
  try {
    const u = new URL(url, window.location.origin);
    const p = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
    return p.length > 60 ? p.slice(0, 57) + "..." : p;
  } catch {
    return url.slice(0, 60);
  }
}

function formatBytes(b: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function Diagnostico() {
  const [resources, setResources] = useState<ResourceTiming[]>([]);
  const [vitals, setVitals] = useState<VitalMetric[]>([]);
  const [supaLatency, setSupaLatency] = useState<number | null>(null);
  const [supaError, setSupaError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Collect Resource Timing + Web Vitals
  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime ?? null;

    let lcp: number | null = null;
    try {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as any;
        if (last) {
          lcp = last.renderTime || last.loadTime;
          updateVitals(lcp);
        }
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
    } catch { /* ignore */ }

    function updateVitals(lcpVal: number | null) {
      const ttfb = nav ? nav.responseStart - nav.requestStart : null;
      const domReady = nav ? nav.domContentLoadedEventEnd - nav.startTime : null;
      const loadEvt = nav ? nav.loadEventEnd - nav.startTime : null;

      setVitals([
        { label: "TTFB", value: ttfb, unit: "ms", threshold: { good: 200, warn: 600 }, description: "Tempo até o primeiro byte do servidor" },
        { label: "FCP", value: fcp, unit: "ms", threshold: { good: 1800, warn: 3000 }, description: "Primeiro pixel visível" },
        { label: "LCP", value: lcpVal, unit: "ms", threshold: { good: 2500, warn: 4000 }, description: "Maior elemento visível pintado" },
        { label: "DOM Ready", value: domReady, unit: "ms", threshold: { good: 1500, warn: 3000 }, description: "DOM pronto para interação" },
        { label: "Load Event", value: loadEvt, unit: "ms", threshold: { good: 3000, warn: 5000 }, description: "Carregamento total da página" },
      ]);
    }
    updateVitals(lcp);

    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const mapped: ResourceTiming[] = entries.map((e) => ({
      name: e.name,
      shortName: shortenName(e.name),
      type: e.initiatorType || "other",
      duration: Math.round(e.duration),
      size: e.transferSize || 0,
      startTime: Math.round(e.startTime),
    })).sort((a, b) => b.duration - a.duration);
    setResources(mapped);
  }, [tick]);

  // Probe Supabase latency
  useEffect(() => {
    const t0 = performance.now();
    supabase.from("clients").select("id", { count: "exact", head: true })
      .then(({ error }) => {
        if (error) setSupaError(error.message);
        else setSupaLatency(Math.round(performance.now() - t0));
      });
  }, [tick]);

  const totals = useMemo(() => {
    const totalSize = resources.reduce((s, r) => s + r.size, 0);
    const slowest = resources.slice(0, 15);
    const heaviest = [...resources].sort((a, b) => b.size - a.size).slice(0, 10);
    const jsCount = resources.filter((r) => r.type === "script" || r.name.endsWith(".js")).length;
    const cssCount = resources.filter((r) => r.type === "link" || r.name.endsWith(".css")).length;
    return { totalSize, slowest, heaviest, jsCount, cssCount };
  }, [resources]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-serif text-foreground">Diagnóstico de Performance</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Análise em tempo real de carregamento, chunks e latência do backend
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
              <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          </div>
        </div>

        {/* Vitals */}
        <div>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Web Vitals</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {vitals.map((v) => {
              const c = classify(v.value, v.threshold);
              return (
                <Card key={v.label} className={cn("p-4 border", tone[c])}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs uppercase tracking-wider opacity-80">{v.label}</span>
                    {c === "good" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {c === "bad" && <AlertTriangle className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-2xl font-bold">
                    {v.value != null ? Math.round(v.value) : "—"}
                    <span className="text-sm font-normal opacity-70 ml-1">{v.unit}</span>
                  </p>
                  <p className="text-[11px] opacity-70 mt-1 leading-tight">{v.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Backend probe */}
        <div className="grid md:grid-cols-3 gap-3">
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Backend</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {supaError ? "Erro" : supaLatency != null ? `${supaLatency} ms` : "..."}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {supaError ?? "Latência da query mais simples"}
            </p>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total Transferido</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatBytes(totals.totalSize)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {resources.length} requests · {totals.jsCount} JS · {totals.cssCount} CSS
            </p>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Conexão</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {(navigator as any).connection?.effectiveType?.toUpperCase() ?? "—"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Downlink: {(navigator as any).connection?.downlink ?? "?"} Mbps
            </p>
          </Card>
        </div>

        {/* Slowest resources */}
        <Card className="p-4 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 15 Recursos Mais Lentos</h3>
          <div className="space-y-1.5">
            {totals.slowest.map((r, i) => {
              const c = r.duration > 1500 ? "bad" : r.duration > 600 ? "warn" : "good";
              return (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                  <Badge variant="outline" className={cn("text-[10px] shrink-0 font-mono", tone[c])}>
                    {r.duration}ms
                  </Badge>
                  <span className="font-mono text-muted-foreground shrink-0 w-16 truncate">{r.type}</span>
                  <span className="text-foreground truncate flex-1" title={r.name}>{r.shortName}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">{formatBytes(r.size)}</span>
                </div>
              );
            })}
            {totals.slowest.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Nenhum recurso registrado ainda.</p>
            )}
          </div>
        </Card>

        {/* Heaviest resources */}
        <Card className="p-4 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 10 Recursos Mais Pesados</h3>
          <div className="space-y-1.5">
            {totals.heaviest.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                  {formatBytes(r.size)}
                </Badge>
                <span className="font-mono text-muted-foreground shrink-0 w-16 truncate">{r.type}</span>
                <span className="text-foreground truncate flex-1" title={r.name}>{r.shortName}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">{r.duration}ms</span>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          Dica: abra esta página em uma aba nova ({window.location.origin}/diagnostico) para medir um cold start real.
        </p>
      </div>
    </div>
  );
}
