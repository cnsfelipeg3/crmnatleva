import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Activity } from "lucide-react";
import type { DiscoverCachePoint } from "@/hooks/useDiscoverCacheHistory";

interface Props {
  history: DiscoverCachePoint[];
  onClear?: () => void;
}

// Mini chart leve (SVG puro · zero libs) · barras empilhadas cache vs API
// + linha de hit-rate sobreposta. Mostra evolução das últimas N buscas.
export function DiscoverCacheTrendChart({ history, onClear }: Props) {
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const totalHits = history.reduce((s, p) => s + p.cache_hits, 0);
    const totalCalls = history.reduce((s, p) => s + p.api_calls, 0);
    const totalChecked = totalHits + totalCalls;
    const avgHitRate = totalChecked > 0 ? Math.round((totalHits / totalChecked) * 100) : 0;
    const lastHitRate = history[history.length - 1].hit_rate_percent;
    return { totalHits, totalCalls, totalChecked, avgHitRate, lastHitRate };
  }, [history]);

  if (history.length === 0 || !stats) {
    return null;
  }

  // Layout do SVG
  const W = 320;
  const H = 80;
  const PAD_X = 4;
  const PAD_Y = 6;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const n = history.length;
  const barGap = 2;
  const barW = Math.max(2, innerW / n - barGap);

  const maxTotal = Math.max(
    1,
    ...history.map((p) => p.cache_hits + p.api_calls),
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Histórico de cache · últimas {n} buscas
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Média geral: <strong className="text-foreground">{stats.avgHitRate}%</strong> ·
            última: <strong className="text-foreground">{stats.lastHitRate}%</strong> ·
            <span className="text-emerald-600 dark:text-emerald-400"> ⚡ {stats.totalHits} cache</span>
            {" "}/
            <span className="text-blue-600 dark:text-blue-400"> 🌐 {stats.totalCalls} API</span>
          </p>
        </div>
        {onClear && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-7 px-2 text-[11px] text-muted-foreground"
            aria-label="Limpar histórico de cache"
          >
            <Trash2 className="h-3 w-3 mr-1" /> limpar
          </Button>
        )}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        aria-label={`Gráfico das últimas ${n} buscas · ${stats.avgHitRate}% de hit-rate médio`}
      >
        {/* Eixo de referência · 50% */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={PAD_Y + innerH / 2}
          y2={PAD_Y + innerH / 2}
          stroke="hsl(var(--border))"
          strokeDasharray="2 3"
          strokeWidth={1}
        />
        {history.map((p, i) => {
          const total = p.cache_hits + p.api_calls;
          const totalH = (total / maxTotal) * innerH;
          const cacheH = total > 0 ? (p.cache_hits / total) * totalH : 0;
          const apiH = totalH - cacheH;
          const x = PAD_X + i * (barW + barGap);
          const yApi = PAD_Y + innerH - totalH;
          const yCache = yApi + apiH;
          return (
            <g key={p.ts}>
              <title>
                {new Date(p.ts).toLocaleString("pt-BR")}
                {"\n"}cache: {p.cache_hits} · api: {p.api_calls} · {p.hit_rate_percent}%
              </title>
              {apiH > 0 && (
                <rect
                  x={x}
                  y={yApi}
                  width={barW}
                  height={apiH}
                  rx={1}
                  fill="hsl(217 91% 60%)"
                  opacity={0.85}
                />
              )}
              {cacheH > 0 && (
                <rect
                  x={x}
                  y={yCache}
                  width={barW}
                  height={cacheH}
                  rx={1}
                  fill="hsl(160 84% 39%)"
                />
              )}
            </g>
          );
        })}
        {/* Linha de hit-rate */}
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          points={history
            .map((p, i) => {
              const x = PAD_X + i * (barW + barGap) + barW / 2;
              const y = PAD_Y + innerH - (p.hit_rate_percent / 100) * innerH;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ")}
        />
      </svg>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> Cache
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-blue-500" /> API fresh
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-[2px] w-3 bg-primary" /> Hit-rate %
        </span>
      </div>
    </Card>
  );
}
