import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import {
  Send,
  DollarSign,
  TrendingUp,
  Eye,
  Clock,
  Share2,
  MessageCircle,
  MousePointerClick,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProposalsPulse } from "@/hooks/useProposalsPulse";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "proposals-pulse-window-hours";
const WINDOWS: Array<{ value: number; label: string }> = [
  { value: 24, label: "24h" },
  { value: 24 * 7, label: "7d" },
  { value: 24 * 30, label: "30d" },
];

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  onClick,
}: {
  icon: typeof Send;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const clickable = typeof onClick === "function";
  return (
    <Card
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "border-border bg-card transition-colors hover:border-primary/40",
        clickable &&
          "cursor-pointer hover:shadow-md hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          <span className="text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <div
          className={cn(
            "mt-2 text-2xl font-semibold tabular-nums sm:text-3xl",
            accent ? "text-primary" : "text-foreground"
          )}
        >
          {value}
        </div>
        {hint ? (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SecondaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Send;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

export default function ProposalsPulseSection() {
  const [hours, setHours] = useState<number>(() => {
    if (typeof window === "undefined") return 24;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : 24;
    return WINDOWS.some((w) => w.value === parsed) ? parsed : 24;
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(hours));
    }
  }, [hours]);

  const { data, isLoading, isError } = useProposalsPulse(hours);

  const windowLabel = useMemo(
    () => WINDOWS.find((w) => w.value === hours)?.label ?? "24h",
    [hours]
  );

  return (
    <section
      aria-label="Pulso comercial das propostas"
      className="rounded-xl border border-border bg-gradient-to-br from-card to-card/60 p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Pulso Comercial · Últimas {windowLabel}
            </h2>
            <p className="text-xs text-muted-foreground">
              Propostas enviadas, valores e engajamento dos clientes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setHours(w.value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                hours === w.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Não consegui carregar o pulso agora. Tente atualizar a página.
        </div>
      ) : data.sent_count === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Send
            className="mx-auto h-6 w-6 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma proposta enviada nas últimas {windowLabel}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              icon={Send}
              label="Propostas enviadas"
              value={String(data.sent_count)}
              hint={`Ticket médio ${brl.format(data.avg_ticket || 0)}`}
            />
            <MetricCard
              icon={DollarSign}
              label="Valor total"
              value={brl.format(data.total_value || 0)}
              hint={`em ${data.sent_count} ${
                data.sent_count === 1 ? "proposta" : "propostas"
              }`}
            />
            <MetricCard
              icon={TrendingUp}
              label="Lucro estimado"
              value={`~ ${brl.format(data.estimated_profit || 0)}`}
              hint={`margem histórica ~${(
                (Number(data.margin_used) || 0) * 100
              ).toFixed(1)}%`}
              accent
            />
            <MetricCard
              icon={Eye}
              label="Clientes que abriram"
              value={`${data.proposals_opened} de ${data.sent_count}`}
              hint={`taxa de abertura ${data.open_rate}%`}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SecondaryStat
              icon={Clock}
              label="Tempo médio na proposta:"
              value={formatDuration(data.avg_active_seconds || 0)}
            />
            <SecondaryStat
              icon={Activity}
              label="Engajamento alto (>60s):"
              value={data.high_engagement_count}
            />
            <SecondaryStat
              icon={Share2}
              label="Compartilhamentos:"
              value={data.shares_count}
            />
            <SecondaryStat
              icon={MessageCircle}
              label="Cliques no WhatsApp:"
              value={data.whatsapp_clicks}
            />
            <SecondaryStat
              icon={MousePointerClick}
              label="CTA:"
              value={data.cta_clicks}
            />
          </div>

          {data.top_engaged && data.top_engaged.length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                <span>
                  Top {data.top_engaged.length}{" "}
                  {data.top_engaged.length === 1 ? "proposta" : "propostas"} com
                  mais engajamento
                </span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <ChevronDown className="h-4 w-4" strokeWidth={2} />
                )}
              </button>

              {expanded ? (
                <ul className="mt-3 space-y-2">
                  {data.top_engaged.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/p/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-sm font-medium text-foreground hover:text-primary"
                        >
                          {p.client_name || p.title}
                        </Link>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p.title}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-normal tabular-nums"
                        >
                          {brl.format(p.total_value || 0)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="gap-1 font-normal tabular-nums"
                        >
                          <Clock className="h-3 w-3" strokeWidth={2} />
                          {formatDuration(p.total_active_seconds)}
                        </Badge>
                        {p.viewers_count > 0 ? (
                          <Badge
                            variant="outline"
                            className="gap-1 font-normal tabular-nums"
                          >
                            <Eye className="h-3 w-3" strokeWidth={2} />
                            {p.viewers_count}
                          </Badge>
                        ) : null}
                        {p.shared ? (
                          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                            <Share2 className="h-3 w-3" strokeWidth={2} />
                            Compartilhou
                          </Badge>
                        ) : null}
                        {p.cta_clicked ? (
                          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                            <MousePointerClick
                              className="h-3 w-3"
                              strokeWidth={2}
                            />
                            CTA
                          </Badge>
                        ) : null}
                        {p.whatsapp_clicked ? (
                          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                            <MessageCircle
                              className="h-3 w-3"
                              strokeWidth={2}
                            />
                            WhatsApp
                          </Badge>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/propostas">
                Ver todas as propostas
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
