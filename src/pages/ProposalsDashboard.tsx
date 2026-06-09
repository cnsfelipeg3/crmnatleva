import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  Eye,
  DollarSign,
  Users,
  Target,
  Send,
  CheckCircle2,
  MapPin,
  Plane,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIOD_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
  all: null,
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  rascunho_ia: "Rascunho IA",
  sent: "Enviada",
  negotiation: "Em negociação",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--muted-foreground))",
  rascunho_ia: "hsl(280 65% 60%)",
  sent: "hsl(210 90% 55%)",
  negotiation: "hsl(35 90% 55%)",
  approved: "hsl(142 70% 45%)",
  rejected: "hsl(0 75% 55%)",
};

const SENT_STATUSES = ["sent", "negotiation", "approved", "rejected"];
const CONVERTED_STATUSES = ["approved"];

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
}

export default function ProposalsDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>("30d");
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ticketFilter, setTicketFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, title, client_name, origin, destinations, total_value, value_per_person, passenger_count, status, source, created_by, created_at, views_count, last_viewed_at, sale_id")
        .eq("is_fictional", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const creatorIds = useMemo(() => {
    const s = new Set<string>();
    (proposals || []).forEach((p: any) => p.created_by && s.add(p.created_by));
    return Array.from(s);
  }, [proposals]);

  const { data: creatorsMap } = useQuery({
    queryKey: ["proposals-dashboard-creators", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", creatorIds);
      const m: Record<string, string> = {};
      (data || []).forEach((u: any) => { m[u.id] = u.full_name || u.email || "Usuário"; });
      return m;
    },
  });

  // Filtered dataset
  const filtered = useMemo(() => {
    if (!proposals) return [];
    const days = PERIOD_DAYS[period];
    const cutoff = days ? startOfDay(subDays(new Date(), days)) : null;
    const q = search.trim().toLowerCase();

    return proposals.filter((p: any) => {
      if (cutoff && new Date(p.created_at) < cutoff) return false;
      if (creatorFilter !== "all" && p.created_by !== creatorFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (originFilter !== "all" && (p.origin || "—") !== originFilter) return false;
      if (destinationFilter !== "all") {
        const ds = (p.destinations || []) as string[];
        if (!ds.includes(destinationFilter)) return false;
      }
      if (ticketFilter !== "all") {
        const v = Number(p.total_value) || 0;
        if (ticketFilter === "lt5" && !(v > 0 && v < 5000)) return false;
        if (ticketFilter === "5to15" && !(v >= 5000 && v < 15000)) return false;
        if (ticketFilter === "15to50" && !(v >= 15000 && v < 50000)) return false;
        if (ticketFilter === "gt50" && !(v >= 50000)) return false;
      }
      if (q) {
        const hay = `${p.title || ""} ${p.client_name || ""} ${(p.destinations || []).join(" ")} ${p.origin || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [proposals, period, creatorFilter, statusFilter, originFilter, destinationFilter, ticketFilter, search]);

  // Unique values for filter selects (built from full dataset)
  const allOrigins = useMemo(() => {
    const s = new Set<string>();
    (proposals || []).forEach((p: any) => { if (p.origin) s.add(p.origin); });
    return Array.from(s).sort();
  }, [proposals]);

  const allDestinations = useMemo(() => {
    const s = new Set<string>();
    (proposals || []).forEach((p: any) => ((p.destinations || []) as string[]).forEach((d) => d && s.add(d)));
    return Array.from(s).sort();
  }, [proposals]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const sent = filtered.filter((p: any) => SENT_STATUSES.includes(p.status)).length;
    const converted = filtered.filter((p: any) => CONVERTED_STATUSES.includes(p.status)).length;
    const opened = filtered.filter((p: any) => (p.views_count || 0) > 0).length;
    const totalValue = filtered.reduce((s: number, p: any) => s + (Number(p.total_value) || 0), 0);
    const wonValue = filtered
      .filter((p: any) => CONVERTED_STATUSES.includes(p.status))
      .reduce((s: number, p: any) => s + (Number(p.total_value) || 0), 0);
    const totalViews = filtered.reduce((s: number, p: any) => s + (p.views_count || 0), 0);
    const totalPax = filtered.reduce((s: number, p: any) => s + (p.passenger_count || 0), 0);
    const avgTicket = total > 0 ? totalValue / total : 0;
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const convRate = sent > 0 ? (converted / sent) * 100 : 0;
    return { total, sent, converted, opened, totalValue, wonValue, totalViews, totalPax, avgTicket, openRate, convRate };
  }, [filtered]);

  // Time series (per day)
  const dailySeries = useMemo(() => {
    const days = PERIOD_DAYS[period] ?? 90;
    const start = startOfDay(subDays(new Date(), Math.min(days, 90)));
    const end = startOfDay(new Date());
    const range = eachDayOfInterval({ start, end });
    const map = new Map<string, { date: string; criadas: number; enviadas: number; aprovadas: number; valor: number }>();
    range.forEach((d) => {
      const k = format(d, "yyyy-MM-dd");
      map.set(k, { date: format(d, "dd/MM"), criadas: 0, enviadas: 0, aprovadas: 0, valor: 0 });
    });
    filtered.forEach((p: any) => {
      const k = format(parseISO(p.created_at), "yyyy-MM-dd");
      const row = map.get(k);
      if (!row) return;
      row.criadas += 1;
      if (SENT_STATUSES.includes(p.status)) row.enviadas += 1;
      if (CONVERTED_STATUSES.includes(p.status)) row.aprovadas += 1;
      row.valor += Number(p.total_value) || 0;
    });
    return Array.from(map.values());
  }, [filtered, period]);

  // By status
  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((p: any) => { m[p.status] = (m[p.status] || 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, key: k }));
  }, [filtered]);

  // By destination
  const byDestination = useMemo(() => {
    const m: Record<string, { count: number; value: number }> = {};
    filtered.forEach((p: any) => {
      ((p.destinations || []) as string[]).forEach((d) => {
        if (!d) return;
        if (!m[d]) m[d] = { count: 0, value: 0 };
        m[d].count += 1;
        m[d].value += Number(p.total_value) || 0;
      });
    });
    return Object.entries(m)
      .map(([name, v]) => ({ name, count: v.count, value: v.value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filtered]);

  // By origin
  const byOrigin = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((p: any) => {
      const o = p.origin || "Não informada";
      m[o] = (m[o] || 0) + 1;
    });
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered]);

  // Ticket bands
  const byTicket = useMemo(() => {
    const bands = [
      { name: "Sem valor", min: -1, max: 0 },
      { name: "< R$ 5k", min: 0.01, max: 5000 },
      { name: "R$ 5k–15k", min: 5000, max: 15000 },
      { name: "R$ 15k–50k", min: 15000, max: 50000 },
      { name: "> R$ 50k", min: 50000, max: Infinity },
    ];
    return bands.map((b) => ({
      name: b.name,
      count: filtered.filter((p: any) => {
        const v = Number(p.total_value) || 0;
        if (b.max === 0) return v === 0;
        return v >= b.min && v < b.max;
      }).length,
    }));
  }, [filtered]);

  // Per consultor (creator)
  const byConsultant = useMemo(() => {
    const m: Record<string, { sent: number; total: number; approved: number; value: number }> = {};
    filtered.forEach((p: any) => {
      const k = p.created_by || "—";
      if (!m[k]) m[k] = { sent: 0, total: 0, approved: 0, value: 0 };
      m[k].total += 1;
      if (SENT_STATUSES.includes(p.status)) m[k].sent += 1;
      if (CONVERTED_STATUSES.includes(p.status)) m[k].approved += 1;
      m[k].value += Number(p.total_value) || 0;
    });
    return Object.entries(m)
      .map(([id, v]) => ({
        id,
        name: creatorsMap?.[id] || "Sem responsável",
        ...v,
        convRate: v.sent > 0 ? (v.approved / v.sent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, creatorsMap]);

  // Top engagement (most viewed)
  const topEngagement = useMemo(() => {
    return [...filtered]
      .filter((p: any) => (p.views_count || 0) > 0)
      .sort((a: any, b: any) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 8);
  }, [filtered]);

  const PIE_COLORS = ["hsl(210 90% 55%)", "hsl(280 65% 60%)", "hsl(142 70% 45%)", "hsl(35 90% 55%)", "hsl(0 75% 55%)", "hsl(var(--muted-foreground))"];

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif text-foreground">Dashboard de Propostas</h1>
            <p className="text-sm text-muted-foreground">Visão inteligente do desempenho do time · conversões · engajamento</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Período</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="12m">Últimos 12 meses</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Consultor</label>
            <Select value={creatorFilter} onValueChange={setCreatorFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {creatorIds.map((id) => (
                  <SelectItem key={id} value={id}>{creatorsMap?.[id] || "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todas</SelectItem>
                {allOrigins.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Destino</label>
            <Select value={destinationFilter} onValueChange={setDestinationFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todos</SelectItem>
                {allDestinations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ticket</label>
            <Select value={ticketFilter} onValueChange={setTicketFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="lt5">Até R$ 5k</SelectItem>
                <SelectItem value="5to15">R$ 5k–15k</SelectItem>
                <SelectItem value="15to50">R$ 15k–50k</SelectItem>
                <SelectItem value="gt50">Acima de R$ 50k</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Input
          placeholder="Buscar por título, cliente, origem ou destino..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9"
        />
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard icon={FileText} label="Total" value={kpis.total} hint={`${kpis.totalPax} pax`} />
        <KpiCard icon={Send} label="Enviadas" value={kpis.sent} accent="blue" />
        <KpiCard icon={Eye} label="Abertas" value={kpis.opened} hint={`${kpis.totalViews} visualizações`} />
        <KpiCard icon={Target} label="Taxa de abertura" value={`${kpis.openRate.toFixed(1)}%`} accent="purple" />
        <KpiCard icon={CheckCircle2} label="Convertidas" value={kpis.converted} hint={`${kpis.convRate.toFixed(1)}% de conv.`} accent="green" />
        <KpiCard icon={DollarSign} label="Valor total" value={brl(kpis.totalValue)} hint={`Ganho ${brl(kpis.wonValue)}`} accent="gold" />
      </div>

      {/* Daily trend + status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Evolução diária</h3>
              <p className="text-xs text-muted-foreground">Propostas criadas · enviadas · aprovadas</p>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="criadas" stroke="hsl(210 90% 55%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="enviadas" stroke="hsl(280 65% 60%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="aprovadas" stroke="hsl(142 70% 45%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-1">Status</h3>
          <p className="text-xs text-muted-foreground mb-3">Distribuição no período</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {byStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.key] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Destinations + Origins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Top destinos</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDestination} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(210 90% 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Plane className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Top origens</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byOrigin} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(280 65% 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Ticket distribution + Consultant ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-1">Faixas de ticket</h3>
          <p className="text-xs text-muted-foreground mb-3">Distribuição por valor da proposta</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTicket}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(35 90% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Desempenho por consultor</h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium">Consultor</th>
                  <th className="text-right py-2 px-2 font-medium">Total</th>
                  <th className="text-right py-2 px-2 font-medium">Enviadas</th>
                  <th className="text-right py-2 px-2 font-medium">Aprovadas</th>
                  <th className="text-right py-2 px-2 font-medium">Conv.</th>
                  <th className="text-right py-2 px-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {byConsultant.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-muted-foreground text-xs">Sem dados no período</td></tr>
                )}
                {byConsultant.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="py-2 px-2 truncate max-w-[180px]">{c.name}</td>
                    <td className="py-2 px-2 text-right font-medium">{c.total}</td>
                    <td className="py-2 px-2 text-right">{c.sent}</td>
                    <td className="py-2 px-2 text-right text-emerald-600">{c.approved}</td>
                    <td className="py-2 px-2 text-right">
                      <Badge variant={c.convRate >= 30 ? "default" : "secondary"} className="text-[10px]">
                        {c.convRate.toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{brl(c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Engagement */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Top propostas por engajamento</h3>
        </div>
        {topEngagement.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma proposta visualizada ainda no período.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {topEngagement.map((p: any) => (
              <button
                key={p.id}
                onClick={() => navigate(`/propostas/${p.id}`)}
                className="text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[p.status] || p.status}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" /> {p.views_count}
                  </div>
                </div>
                <p className="font-medium text-sm text-foreground truncate">{p.title || "Sem título"}</p>
                {p.client_name && <p className="text-xs text-muted-foreground truncate">{p.client_name}</p>}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-muted-foreground truncate">{(p.destinations || [])[0] || "—"}</span>
                  <span className="font-semibold text-foreground">{brl(Number(p.total_value) || 0)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {isLoading && (
        <p className="text-xs text-muted-foreground text-center">Carregando dados...</p>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint, accent }: { icon: any; label: string; value: any; hint?: string; accent?: "blue" | "green" | "purple" | "gold" }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-500/10",
    green: "text-emerald-600 bg-emerald-500/10",
    purple: "text-purple-600 bg-purple-500/10",
    gold: "text-amber-600 bg-amber-500/10",
  };
  const cls = accent ? colorMap[accent] : "text-muted-foreground bg-muted";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${cls}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-xl font-semibold text-foreground truncate">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</div>}
    </Card>
  );
}
