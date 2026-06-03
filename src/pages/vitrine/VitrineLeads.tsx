import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users2,
  MousePointerClick,
  Target,
  Wallet,
  TrendingUp,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Globe,
  Clock,
} from "lucide-react";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateLeadsStats } from "@/components/vitrine/useAffiliateLeadsStats";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  click: { label: "Clique", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  lead: { label: "Lead", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  qualified: { label: "Qualificado", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  negotiating: { label: "Negociando", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  converted: { label: "Convertido", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

function DeviceIcon({ d }: { d: string | null }) {
  if (d === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (d === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

export default function VitrineLeads() {
  const { data: affiliate } = useAffiliateProfile();
  const [days, setDays] = useState<number>(30);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: stats, isLoading } = useAffiliateLeadsStats(affiliate?.id, days);

  const filteredRows = useMemo(() => {
    if (!stats) return [];
    return stats.rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (r.lead_name || "").toLowerCase().includes(q) ||
        (r.lead_email || "").toLowerCase().includes(q) ||
        (r.lead_phone || "").toLowerCase().includes(q) ||
        (r.product_slug || "").toLowerCase().includes(q) ||
        (r.city || "").toLowerCase().includes(q)
      );
    });
  }, [stats, statusFilter, search]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Meus leads · Painel de tráfego</h1>
          <p className="text-sm text-muted-foreground">
            Tudo que aconteceu nos seus links de divulgação · cliques, leads, conversões e comissões.
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard icon={<MousePointerClick className="h-4 w-4" />} label="Cliques" value={String(stats?.totalClicks ?? 0)} hint={`${stats?.uniqueSessions ?? 0} sessões`} />
        <KpiCard icon={<Users2 className="h-4 w-4" />} label="Leads" value={String(stats?.leadsCount ?? 0)} />
        <KpiCard icon={<Target className="h-4 w-4" />} label="Conversões" value={String(stats?.conversions ?? 0)} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Taxa conversão" value={`${(stats?.conversionRate ?? 0).toFixed(1)}%`} />
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="Comissão estim." value={brl(stats?.estimatedCommission ?? 0)} />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Tempo médio" value={`${stats?.avgTimeOnPage ?? 0}s`} hint="na página do pacote" />
      </div>

      {/* Funil */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Funil de conversão</h3>
          <span className="text-xs text-muted-foreground">Últimos {days} dias</span>
        </div>
        <FunnelBar funnel={stats?.funnel ?? { click: 0, lead: 0, negotiating: 0, converted: 0 }} />
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <h3 className="text-sm font-semibold mb-3">Cliques · Leads · Conversões por dia</h3>
          <div className="h-64">
            {stats && stats.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => format(parseISO(d), "dd/MM", { locale: ptBR })}
                    fontSize={11}
                  />
                  <YAxis fontSize={11} />
                  <Tooltip
                    labelFormatter={(d) => format(parseISO(String(d)), "dd 'de' MMM", { locale: ptBR })}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="clicks" name="Cliques" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="conversions" name="Conversões" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart loading={isLoading} />
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Origem do tráfego</h3>
          <div className="space-y-2">
            {(stats?.bySource ?? []).slice(0, 8).map((s) => (
              <div key={s.source} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{s.source}</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">{s.count}</Badge>
              </div>
            ))}
            {(!stats || stats.bySource.length === 0) && (
              <div className="text-xs text-muted-foreground text-center py-4">Sem dados ainda</div>
            )}
          </div>
        </Card>
      </div>

      {/* Pacotes + cidades + devices */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <h3 className="text-sm font-semibold mb-3">Top pacotes que você divulga</h3>
          <div className="h-64">
            {stats && stats.byProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byProduct.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="product" fontSize={11} width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="clicks" name="Cliques" fill="#10b981" />
                  <Bar dataKey="leads" name="Leads" fill="#3b82f6" />
                  <Bar dataKey="conversions" name="Vendas" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart loading={isLoading} />
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Dispositivos</h3>
            <div className="space-y-1.5">
              {Object.entries(stats?.byDevice ?? {}).map(([dev, count]) => (
                <div key={dev} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 capitalize">
                    <DeviceIcon d={dev} />
                    {dev}
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Top cidades</h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {(stats?.byCity ?? []).map((c) => (
                <div key={c.city} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{c.city}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">{c.count}</Badge>
                </div>
              ))}
              {(!stats || stats.byCity.length === 0) && (
                <div className="text-xs text-muted-foreground">Sem dados</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela detalhada */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold">Detalhamento de visitas e leads</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="click">Cliques</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="negotiating">Negociando</SelectItem>
                <SelectItem value="converted">Convertidos</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar pacote, cidade, nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pacote</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Disp.</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.slice(0, 200).map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.click;
                const source =
                  r.utm_source ||
                  (r.referrer || "direct").replace(/^https?:\/\//, "").split("/")[0];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(parseISO(r.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{r.product_slug || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${meta.cls} text-[10px] font-medium border`}>
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.lead_name ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{r.lead_name}</span>
                          {(r.lead_phone || r.lead_email) && (
                            <span className="text-muted-foreground text-[10px]">
                              {r.lead_phone || r.lead_email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{source}</TableCell>
                    <TableCell className="text-xs">{r.city || "—"}</TableCell>
                    <TableCell><DeviceIcon d={r.device_type} /></TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {r.time_on_page_seconds ? `${r.time_on_page_seconds}s` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {r.status === "converted" && r.estimated_commission
                        ? brl(Number(r.estimated_commission))
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                    {isLoading ? "Carregando..." : "Nenhum registro no período selecionado."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filteredRows.length > 200 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Mostrando 200 de {filteredRows.length} registros · use filtros para refinar.
          </p>
        )}
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

function FunnelBar({ funnel }: { funnel: { click: number; lead: number; negotiating: number; converted: number } }) {
  const totalClicks = funnel.click + funnel.lead + funnel.negotiating + funnel.converted;
  const stages = [
    { label: "Cliques", value: totalClicks, color: "bg-emerald-500" },
    { label: "Leads", value: funnel.lead + funnel.negotiating + funnel.converted, color: "bg-blue-500" },
    { label: "Negociando", value: funnel.negotiating + funnel.converted, color: "bg-amber-500" },
    { label: "Convertidos", value: funnel.converted, color: "bg-orange-500" },
  ];
  const max = stages[0].value || 1;
  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <div key={s.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">{s.label}</span>
            <span className="tabular-nums">
              {s.value}
              {i > 0 && max > 0 && (
                <span className="text-muted-foreground ml-2">
                  {((s.value / max) * 100).toFixed(1)}%
                </span>
              )}
            </span>
          </div>
          <div className="h-6 rounded bg-muted/50 overflow-hidden">
            <div
              className={`h-full ${s.color} transition-all`}
              style={{ width: `${max > 0 ? (s.value / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ loading }: { loading: boolean }) {
  return (
    <div className="h-full grid place-items-center text-sm text-muted-foreground">
      {loading ? "Carregando..." : "Sem dados no período selecionado"}
    </div>
  );
}
