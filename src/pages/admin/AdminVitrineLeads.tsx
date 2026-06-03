import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MousePointerClick,
  Users2,
  Target,
  Wallet,
  TrendingUp,
  Trophy,
  ArrowLeft,
  Search,
  Store,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAllAffiliatesLeadsStats } from "@/components/vitrine/useAffiliateLeadsStats";
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

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}
function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  click: { label: "Clique", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  lead: { label: "Lead", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  qualified: { label: "Qualificado", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  negotiating: { label: "Negociando", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  converted: { label: "Convertido", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function AdminVitrineLeads() {
  const { role } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [search, setSearch] = useState("");
  const [affiliateFilter, setAffiliateFilter] = useState<string>("all");
  const { data, isLoading } = useAllAffiliatesLeadsStats(days);

  const ranking = data?.ranking ?? [];
  const stats = data?.stats;

  const filteredRanking = useMemo(() => {
    const q = search.toLowerCase().trim();
    return ranking.filter((r) =>
      !q || r.full_name.toLowerCase().includes(q) || (r.ref_code || "").toLowerCase().includes(q)
    );
  }, [ranking, search]);

  const filteredRows = useMemo(() => {
    if (!stats) return [];
    return stats.rows.filter((r) => affiliateFilter === "all" || r.affiliate_id === affiliateFilter);
  }, [stats, affiliateFilter]);

  if (role !== "admin" && role !== "gestor") {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Acesso restrito a administradores e gestores.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/admin/vitrine"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Leads & Tráfego de Afiliados</h1>
            <p className="text-sm text-muted-foreground">
              Visão consolidada de tudo que os afiliados trazem · cliques, leads, conversões e receita gerada.
            </p>
          </div>
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={<MousePointerClick className="h-4 w-4" />} label="Cliques" value={String(stats?.totalClicks ?? 0)} hint={`${stats?.uniqueSessions ?? 0} sessões`} />
        <KpiCard icon={<Users2 className="h-4 w-4" />} label="Leads" value={String(stats?.leadsCount ?? 0)} />
        <KpiCard icon={<Target className="h-4 w-4" />} label="Conversões" value={String(stats?.conversions ?? 0)} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Taxa conversão" value={`${(stats?.conversionRate ?? 0).toFixed(1)}%`} />
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="Comissões pagas" value={brl(stats?.estimatedCommission ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <h3 className="text-sm font-semibold mb-3">Movimento agregado por dia</h3>
          <div className="h-64">
            {stats && stats.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "dd/MM", { locale: ptBR })} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={(d) => format(parseISO(String(d)), "dd 'de' MMM", { locale: ptBR })} />
                  <Legend />
                  <Line type="monotone" dataKey="clicks" name="Cliques" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="conversions" name="Vendas" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                {isLoading ? "Carregando..." : "Sem dados"}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Top pacotes (todos afiliados)</h3>
          <div className="h-64">
            {stats && stats.byProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byProduct.slice(0, 7)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="product" fontSize={9} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="conversions" name="Vendas" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>
        </Card>
      </div>

      {/* Ranking */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Ranking de afiliados
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar afiliado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Afiliado</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRanking.slice(0, 50).map((a, i) => (
                <TableRow key={a.affiliate_id}>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={a.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{initials(a.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{a.full_name}</span>
                        {a.ref_code && <span className="text-[10px] text-muted-foreground font-mono">ref: {a.ref_code}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{a.clicks}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{a.leads}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">{a.conversions}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{a.conversionRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{brl(a.commission)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAffiliateFilter(a.affiliate_id)}
                      className="text-xs h-7"
                    >
                      Ver leads
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRanking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum afiliado com movimento no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detalhamento "Quem trouxe quem" */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold">Quem trouxe quem · detalhamento</h3>
          <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
            <SelectTrigger className="w-60"><SelectValue placeholder="Todos afiliados" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos afiliados</SelectItem>
              {(data?.affiliates ?? []).map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Afiliado</TableHead>
                <TableHead>Pacote</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Local</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.slice(0, 200).map((r) => {
                const aff: any = data?.affiliates.find((a: any) => a.id === r.affiliate_id);
                const meta = STATUS_META[r.status] || STATUS_META.click;
                const source =
                  r.utm_source ||
                  (r.referrer || "direct").replace(/^https?:\/\//, "").split("/")[0];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(parseISO(r.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs">{aff?.full_name || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{r.product_slug || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.lead_name ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{r.lead_name}</span>
                          {(r.lead_phone || r.lead_email) && (
                            <span className="text-muted-foreground text-[10px]">{r.lead_phone || r.lead_email}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${meta.cls} text-[10px] font-medium border`}>
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{source}</TableCell>
                    <TableCell className="text-xs">{r.city || "—"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {r.status === "converted" && r.estimated_commission ? brl(Number(r.estimated_commission)) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    {isLoading ? "Carregando..." : "Sem registros."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
