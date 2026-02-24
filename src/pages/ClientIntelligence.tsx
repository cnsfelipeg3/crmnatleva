import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllRows } from "@/lib/fetchAll";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  Users, DollarSign, TrendingUp, Target, Crown, AlertTriangle,
  Search, Download, ChevronRight, Star, Zap, Shield,
  BarChart3, Layers, Activity, Clock, Plane, Brain, Sparkles,
  ArrowUp, ArrowDown, Award, Ghost, HeartCrack, Timer,
  TrendingDown, UserX, CalendarX,
} from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v.toFixed(1)}%`;

const COLORS = [
  "hsl(160, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)",
  "hsl(280, 60%, 50%)", "hsl(0, 72%, 51%)", "hsl(158, 60%, 38%)",
  "hsl(30, 80%, 55%)", "hsl(190, 70%, 45%)",
];

interface Sale {
  id: string; name: string; status: string; display_id: string;
  origin_iata: string | null; destination_iata: string | null;
  departure_date: string | null; return_date: string | null;
  received_value: number; total_cost: number; profit: number; margin: number;
  products: string[]; airline: string | null;
  created_at: string; close_date: string | null;
  client_id: string | null; seller_id: string | null;
  is_international: boolean | null;
  origin_city: string | null; destination_city: string | null;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/\s*-\s*(tassia|tássia|check-in|volta cancelada|cancelad[ao]|organico|orgânico).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPerson(name: string): boolean {
  const blacklist = ["kiwif", "kiwify", "banco", "nubank", "teste", "test", "admin", "sistema"];
  const lower = name.toLowerCase();
  return !blacklist.some(b => lower.includes(b)) && name.length > 3;
}

function getRegion(iata: string | null): string {
  if (!iata) return "Desconhecido";
  const eu = ["LIS","CDG","FCO","BCN","MAD","LHR","AMS","FRA","MUC","ZRH","VIE","PRG","IST","MXP","NAP","VCE","GVA"];
  const na = ["JFK","MIA","MCO","LAX","SFO","EWR","BOS","ATL","ORD","DFW","YYZ","LAS","PHX","DEN"];
  const me = ["DXB","DOH","AUH","JED","RUH","AMM"];
  const asia = ["NRT","HND","ICN","PEK","SIN","BKK","HKG","KUL","DPS","TPE"];
  const carib = ["CUN","PUJ","SXM","AUA","CUR","NAS","MBJ","SJU"];
  const africa = ["JNB","CPT","NBO","CMN","CAI"];
  if (eu.includes(iata)) return "Europa";
  if (na.includes(iata)) return "América do Norte";
  if (me.includes(iata)) return "Oriente Médio";
  if (asia.includes(iata)) return "Ásia";
  if (carib.includes(iata)) return "Caribe";
  if (africa.includes(iata)) return "África";
  return "Brasil";
}

interface ClientAnalysis {
  key: string; name: string; saleIds: string[]; sales: Sale[];
  totalRevenue: number; totalProfit: number; avgMargin: number;
  totalTrips: number; avgTicket: number; frequency: number;
  lastTrip: string | null; nextTrip: string | null;
  topDestination: string; topRegion: string; topProduct: string;
  ltv: number; churnRisk: number; scoreValue: number; scorePotential: number;
  scoreRisk: number; scoreLoyalty: number; overallScore: number;
  status: string; daysInactive: number;
  revenue12m: number; revenue24m: number;
  originCity: string | null; isInternational: boolean;
  avgMonthsBetweenTrips: number;
  estimatedAnnualRevenue: number;
}

export default function ClientIntelligence() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof ClientAnalysis>("totalRevenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [drilldown, setDrilldown] = useState<{ label: string; clients: ClientAnalysis[] } | null>(null);

  useEffect(() => {
    fetchAllRows("sales", "*", { order: { column: "created_at", ascending: false } })
      .then((data) => { setSales(data as Sale[]); setLoading(false); });
  }, []);

  const analysisData = useMemo<ClientAnalysis[]>(() => {
    const now = new Date();
    const m12 = new Date(now.getTime() - 365 * 86400000);
    const m24 = new Date(now.getTime() - 730 * 86400000);

    const groups: Record<string, Sale[]> = {};
    const displayNames: Record<string, string> = {};

    sales.forEach(sale => {
      if (!sale.name || !isPerson(sale.name)) return;
      const key = normalizeName(sale.name);
      if (!key || key.length < 3) return;
      if (!groups[key]) { groups[key] = []; displayNames[key] = sale.name; }
      if (sale.name.length > displayNames[key].length) displayNames[key] = sale.name;
      groups[key].push(sale);
    });

    return Object.entries(groups).map(([key, cs]) => {
      const totalRevenue = cs.reduce((a, s) => a + (s.received_value || 0), 0);
      const totalCost = cs.reduce((a, s) => a + (s.total_cost || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const avgMargin = cs.length > 0 ? cs.reduce((a, s) => a + (s.margin || 0), 0) / cs.length : 0;
      const avgTicket = cs.length > 0 ? totalRevenue / cs.length : 0;

      const destMap: Record<string, number> = {};
      const regionMap: Record<string, number> = {};
      const productMap: Record<string, number> = {};
      let hasInternational = false;
      let originCity: string | null = null;

      cs.forEach(s => {
        if (s.destination_iata) {
          destMap[s.destination_iata] = (destMap[s.destination_iata] || 0) + 1;
          const r = getRegion(s.destination_iata);
          regionMap[r] = (regionMap[r] || 0) + 1;
        }
        (s.products || []).forEach(p => { productMap[p] = (productMap[p] || 0) + 1; });
        if (s.is_international) hasInternational = true;
        if (s.origin_city && !originCity) originCity = s.origin_city;
      });

      const topDestination = Object.entries(destMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
      const topRegion = Object.entries(regionMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
      const topProduct = Object.entries(productMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

      const dates = cs.map(s => s.departure_date || s.close_date).filter(Boolean).map(d => new Date(d!));
      const pastDates = dates.filter(d => d < now).sort((a, b) => b.getTime() - a.getTime());
      const futureDates = dates.filter(d => d >= now).sort((a, b) => a.getTime() - b.getTime());
      const lastTrip = pastDates[0]?.toISOString().slice(0, 10) || null;
      const nextTrip = futureDates[0]?.toISOString().slice(0, 10) || null;
      const daysInactive = lastTrip ? Math.floor((now.getTime() - new Date(lastTrip).getTime()) / 86400000) : 9999;

      const firstDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const yearsActive = firstDate ? Math.max(0.5, (now.getTime() - firstDate.getTime()) / (365 * 86400000)) : 1;
      const frequency = cs.length / yearsActive;

      // Average months between trips
      let avgMonthsBetweenTrips = 0;
      if (pastDates.length >= 2) {
        const sorted = [...pastDates].sort((a, b) => a.getTime() - b.getTime());
        let totalGap = 0;
        for (let i = 1; i < sorted.length; i++) {
          totalGap += (sorted[i].getTime() - sorted[i - 1].getTime()) / (30 * 86400000);
        }
        avgMonthsBetweenTrips = totalGap / (sorted.length - 1);
      }

      const revenue12m = cs.filter(s => {
        const d = s.close_date || s.created_at;
        return d && new Date(d) >= m12;
      }).reduce((a, s) => a + (s.received_value || 0), 0);
      const revenue24m = cs.filter(s => {
        const d = s.close_date || s.created_at;
        return d && new Date(d) >= m24;
      }).reduce((a, s) => a + (s.received_value || 0), 0);

      const annualRevenue = totalRevenue / Math.max(yearsActive, 0.5);
      const ltv = annualRevenue * 5;
      const estimatedAnnualRevenue = annualRevenue;

      const scoreValue = Math.min(100, (totalRevenue / 80000) * 100);
      const scorePotential = Math.min(100,
        (avgTicket / 12000) * 40 +
        (frequency > 2 ? 30 : frequency > 1 ? 20 : 10) +
        (avgMargin > 20 ? 30 : avgMargin > 10 ? 20 : 10)
      );
      const scoreRisk = Math.min(100, daysInactive > 365 ? 90 : daysInactive > 180 ? 70 : daysInactive > 90 ? 50 : daysInactive > 60 ? 30 : 10);
      const scoreLoyalty = Math.min(100,
        (cs.length / 8) * 40 +
        (frequency > 2 ? 30 : frequency > 1 ? 20 : 10) +
        (yearsActive > 2 ? 30 : yearsActive > 1 ? 20 : 10)
      );
      const overallScore = Math.round(scoreValue * 0.3 + scorePotential * 0.25 + (100 - scoreRisk) * 0.25 + scoreLoyalty * 0.2);

      let status = "Ativo";
      if (cs.length === 0) status = "Novo";
      else if (daysInactive > 365) status = "Perdido";
      else if (daysInactive > 180) status = "Em Risco";
      else if (daysInactive > 90) status = "Inativo";
      if (overallScore > 65 && totalRevenue > 15000 && cs.length >= 2) status = "VIP";

      return {
        key, name: displayNames[key], saleIds: cs.map(s => s.id), sales: cs,
        totalRevenue, totalProfit, avgMargin, totalTrips: cs.length,
        avgTicket, frequency, lastTrip, nextTrip, topDestination, topRegion, topProduct,
        ltv, churnRisk: scoreRisk, scoreValue, scorePotential, scoreRisk, scoreLoyalty, overallScore,
        status, daysInactive, revenue12m, revenue24m,
        originCity, isInternational: hasInternational,
        avgMonthsBetweenTrips, estimatedAnnualRevenue,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales]);

  // Global KPIs
  const kpis = useMemo(() => {
    const active = analysisData.filter(c => c.totalTrips > 0);
    const totalRevenue = active.reduce((a, c) => a + c.totalRevenue, 0);
    const totalProfit = active.reduce((a, c) => a + c.totalProfit, 0);
    const totalTrips = active.reduce((a, c) => a + c.totalTrips, 0);
    const avgTicket = totalTrips > 0 ? totalRevenue / totalTrips : 0;
    const avgMargin = active.length > 0 ? active.reduce((a, c) => a + c.avgMargin, 0) / active.length : 0;
    const avgFreq = active.length > 0 ? active.reduce((a, c) => a + c.frequency, 0) / active.length : 0;
    const vips = analysisData.filter(c => c.status === "VIP");
    const inactive90 = analysisData.filter(c => c.daysInactive > 90 && c.daysInactive < 9999);
    const inactive180 = analysisData.filter(c => c.daysInactive > 180 && c.daysInactive < 9999);
    const rev12m = active.reduce((a, c) => a + c.revenue12m, 0);
    const rev24m = active.reduce((a, c) => a + c.revenue24m, 0);
    const totalLtv = active.reduce((a, c) => a + c.ltv, 0);
    return { totalClients: active.length, totalRevenue, totalProfit, avgTicket, avgMargin, avgFreq,
      vips, inactive90, inactive180, rev12m, rev24m, totalLtv, active };
  }, [analysisData]);

  // Churn / lost revenue analysis
  const churnAnalysis = useMemo(() => {
    const inactive6m = analysisData.filter(c => c.daysInactive >= 180 && c.daysInactive < 9999 && c.totalTrips > 0);
    const lostRevenue = inactive6m.reduce((a, c) => a + c.estimatedAnnualRevenue, 0);
    const lostProfit = inactive6m.reduce((a, c) => a + (c.totalProfit / Math.max(c.totalTrips, 1)) * c.frequency, 0);

    // Frequency x Inactivity matrix
    const freqBuckets = ["< 1/ano", "1-2/ano", "2-4/ano", "4+/ano"];
    const inactBuckets = ["6-9 meses", "9-12 meses", "12-18 meses", "18+ meses"];
    const matrix: { freq: string; inact: string; count: number; lostRev: number; clients: ClientAnalysis[] }[] = [];

    freqBuckets.forEach(fb => {
      inactBuckets.forEach(ib => {
        const matching = inactive6m.filter(c => {
          const f = c.frequency;
          const fMatch = fb === "< 1/ano" ? f < 1 : fb === "1-2/ano" ? f >= 1 && f < 2 : fb === "2-4/ano" ? f >= 2 && f < 4 : f >= 4;
          const d = c.daysInactive;
          const iMatch = ib === "6-9 meses" ? d >= 180 && d < 270 : ib === "9-12 meses" ? d >= 270 && d < 365 : ib === "12-18 meses" ? d >= 365 && d < 540 : d >= 540;
          return fMatch && iMatch;
        });
        matrix.push({
          freq: fb, inact: ib,
          count: matching.length,
          lostRev: matching.reduce((a, c) => a + c.estimatedAnnualRevenue, 0),
          clients: matching,
        });
      });
    });

    // Top lost clients
    const topLost = [...inactive6m].sort((a, b) => b.estimatedAnnualRevenue - a.estimatedAnnualRevenue).slice(0, 15);

    // By month buckets for chart
    const monthBuckets = [
      { label: "6-9m", min: 180, max: 270 },
      { label: "9-12m", min: 270, max: 365 },
      { label: "12-18m", min: 365, max: 540 },
      { label: "18-24m", min: 540, max: 730 },
      { label: "24m+", min: 730, max: 99999 },
    ].map(b => {
      const cls = inactive6m.filter(c => c.daysInactive >= b.min && c.daysInactive < b.max);
      return {
        name: b.label,
        clientes: cls.length,
        receitaPerdida: cls.reduce((a, c) => a + c.estimatedAnnualRevenue, 0),
        ltvPerdido: cls.reduce((a, c) => a + c.ltv, 0),
      };
    });

    return { inactive6m, lostRevenue, lostProfit, matrix, topLost, monthBuckets };
  }, [analysisData]);

  // Rankings
  const rankings = useMemo(() => ({
    byRevenue: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
    byProfit: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 10),
    byMargin: [...analysisData].filter(c => c.totalTrips >= 2).sort((a, b) => b.avgMargin - a.avgMargin).slice(0, 10),
    byFrequency: [...analysisData].filter(c => c.totalTrips >= 2).sort((a, b) => b.frequency - a.frequency).slice(0, 10),
    byTicket: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.avgTicket - a.avgTicket).slice(0, 10),
    byLtv: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.ltv - a.ltv).slice(0, 10),
  }), [analysisData]);

  // Cross analysis
  const crossData = useMemo(() => {
    const active = analysisData.filter(c => c.totalTrips > 0);

    const regionMargin: Record<string, { total: number; count: number; rev: number }> = {};
    active.forEach(c => {
      const r = c.topRegion;
      if (!regionMargin[r]) regionMargin[r] = { total: 0, count: 0, rev: 0 };
      regionMargin[r].total += c.avgMargin;
      regionMargin[r].count++;
      regionMargin[r].rev += c.totalRevenue;
    });
    const regionMarginData = Object.entries(regionMargin)
      .map(([r, d]) => ({ region: r, margin: d.total / d.count, receita: d.rev, clientes: d.count }))
      .sort((a, b) => b.margin - a.margin);

    const scatterData = active.filter(c => c.avgTicket > 0).map(c => ({
      name: c.name, ticket: c.avgTicket, margin: c.avgMargin, trips: c.totalTrips,
    }));

    const statusDist: Record<string, number> = {};
    analysisData.forEach(c => { statusDist[c.status] = (statusDist[c.status] || 0) + 1; });
    const statusData = Object.entries(statusDist).map(([s, v]) => ({ name: s, value: v }));

    const ltvBuckets = [
      { name: "< 10k", min: 0, max: 10000, count: 0 },
      { name: "10k-50k", min: 10000, max: 50000, count: 0 },
      { name: "50k-100k", min: 50000, max: 100000, count: 0 },
      { name: "100k-500k", min: 100000, max: 500000, count: 0 },
      { name: "> 500k", min: 500000, max: Infinity, count: 0 },
    ];
    active.forEach(c => {
      const b = ltvBuckets.find(b => c.ltv >= b.min && c.ltv < b.max);
      if (b) b.count++;
    });

    const tripBrackets = [
      { name: "1 viagem", min: 1, max: 1, count: 0, rev: 0 },
      { name: "2-3", min: 2, max: 3, count: 0, rev: 0 },
      { name: "4-6", min: 4, max: 6, count: 0, rev: 0 },
      { name: "7-10", min: 7, max: 10, count: 0, rev: 0 },
      { name: "10+", min: 11, max: 999, count: 0, rev: 0 },
    ];
    active.forEach(c => {
      const b = tripBrackets.find(b => c.totalTrips >= b.min && c.totalTrips <= b.max);
      if (b) { b.count++; b.rev += c.totalRevenue; }
    });

    return { regionMarginData, scatterData, statusData, ltvBuckets, tripBrackets };
  }, [analysisData]);

  // Filtered & sorted table
  const tableData = useMemo(() => {
    let data = [...analysisData];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.topDestination.toLowerCase().includes(q) || c.originCity?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") data = data.filter(c => c.status === statusFilter);
    data.sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return data;
  }, [analysisData, search, sortBy, sortDir, statusFilter]);

  const toggleSort = (col: keyof ClientAnalysis) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const statusColors: Record<string, string> = {
    "VIP": "bg-primary/20 text-primary border-primary/30",
    "Ativo": "bg-success/20 text-success border-success/30",
    "Inativo": "bg-warning/20 text-warning border-warning/30",
    "Em Risco": "bg-destructive/20 text-destructive border-destructive/30",
    "Perdido": "bg-muted text-muted-foreground border-border",
    "Novo": "bg-info/20 text-info border-info/30",
  };

  const goToClient = (c: ClientAnalysis) => {
    if (c.saleIds.length > 0) navigate(`/sales/${c.saleIds[0]}`);
  };

  const openDrilldown = (label: string, clients: ClientAnalysis[]) => {
    setDrilldown({ label, clients });
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Inteligência de Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {analysisData.length} clientes analisados · {sales.length} vendas processadas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const csv = ["Nome,Receita,Lucro,Margem,Viagens,Ticket,Score,Status,LTV,Destino Top,Região,Dias Inativo,Freq Anual"]
            .concat(tableData.map(c => `"${c.name}",${c.totalRevenue.toFixed(2)},${c.totalProfit.toFixed(2)},${c.avgMargin.toFixed(1)},${c.totalTrips},${c.avgTicket.toFixed(2)},${c.overallScore},${c.status},${c.ltv.toFixed(2)},${c.topDestination},${c.topRegion},${c.daysInactive},${c.frequency.toFixed(2)}`))
            .join("\n");
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "inteligencia-clientes.csv"; a.click();
        }}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="dashboard"><BarChart3 className="w-3.5 h-3.5 mr-1" /> Dashboard</TabsTrigger>
          <TabsTrigger value="churn"><HeartCrack className="w-3.5 h-3.5 mr-1" /> Churn & Perda</TabsTrigger>
          <TabsTrigger value="rankings"><Crown className="w-3.5 h-3.5 mr-1" /> Rankings</TabsTrigger>
          <TabsTrigger value="table"><Layers className="w-3.5 h-3.5 mr-1" /> Tabela</TabsTrigger>
          <TabsTrigger value="cross"><Sparkles className="w-3.5 h-3.5 mr-1" /> Cruzamentos</TabsTrigger>
        </TabsList>

        {/* ===== DASHBOARD ===== */}
        <TabsContent value="dashboard" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Clientes Ativos", value: kpis.totalClients.toString(), icon: Users, color: "text-primary", clients: kpis.active },
              { label: "Receita Total", value: fmt(kpis.totalRevenue), icon: DollarSign, color: "text-success", clients: kpis.active },
              { label: "Lucro Total", value: fmt(kpis.totalProfit), icon: TrendingUp, color: "text-primary", clients: [...analysisData].filter(c => c.totalProfit > 0).sort((a, b) => b.totalProfit - a.totalProfit) },
              { label: "Ticket Médio", value: fmt(kpis.avgTicket), icon: Target, color: "text-info", clients: [...kpis.active].sort((a, b) => b.avgTicket - a.avgTicket) },
              { label: "Margem Média", value: pct(kpis.avgMargin), icon: Activity, color: "text-accent", clients: [...kpis.active].sort((a, b) => b.avgMargin - a.avgMargin) },
              { label: "Freq. Média", value: `${kpis.avgFreq.toFixed(1)}/ano`, icon: Clock, color: "text-warning", clients: [...kpis.active].sort((a, b) => b.frequency - a.frequency) },
              { label: "Clientes VIP", value: kpis.vips.length.toString(), icon: Crown, color: "text-primary", clients: kpis.vips },
              { label: "Inativos +90d", value: kpis.inactive90.length.toString(), icon: AlertTriangle, color: "text-destructive", clients: kpis.inactive90 },
              { label: "Receita 12m", value: fmt(kpis.rev12m), icon: DollarSign, color: "text-success", clients: [...kpis.active].filter(c => c.revenue12m > 0).sort((a, b) => b.revenue12m - a.revenue12m) },
              { label: "LTV Total", value: fmt(kpis.totalLtv), icon: Zap, color: "text-warning", clients: [...kpis.active].sort((a, b) => b.ltv - a.ltv) },
            ].map(k => (
              <Card key={k.label}
                className="p-3.5 glass-card cursor-pointer hover:ring-1 hover:ring-accent/30 transition-all group"
                onClick={() => openDrilldown(k.label, k.clients)}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground data-glow">{k.value}</p>
                <div className="text-[9px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Clique para detalhes →
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Pie */}
            <Card className="p-5 glass-card">
              <h3 className="section-title text-sm mb-4"><Shield className="w-4 h-4 text-primary" /> Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={crossData.statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    onClick={(_, i) => {
                      const status = crossData.statusData[i]?.name;
                      if (status) openDrilldown(`Status: ${status}`, analysisData.filter(c => c.status === status));
                    }}
                    className="cursor-pointer">
                    {crossData.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, "Clientes"]} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* LTV Chart */}
            <Card className="p-5 glass-card">
              <h3 className="section-title text-sm mb-4"><Zap className="w-4 h-4 text-warning" /> Distribuição de LTV</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={crossData.ltvBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Clientes"
                    onClick={(data) => {
                      const active = analysisData.filter(c => c.totalTrips > 0);
                      const bucket = crossData.ltvBuckets.find(b => b.name === data.name);
                      if (bucket) openDrilldown(`LTV: ${bucket.name}`, active.filter(c => c.ltv >= bucket.min && c.ltv < bucket.max));
                    }}
                    className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Recurrence & Quick Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5 glass-card">
              <h3 className="section-title text-sm mb-4"><Activity className="w-4 h-4 text-info" /> Recorrência</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={crossData.tripBrackets}>
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Clientes"
                    onClick={(data) => {
                      const bucket = crossData.tripBrackets.find(b => b.name === data.name);
                      if (bucket) openDrilldown(`Viagens: ${bucket.name}`, analysisData.filter(c => c.totalTrips >= bucket.min && c.totalTrips <= bucket.max));
                    }}
                    className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" /> Top 5 Receita
              </h3>
              <div className="space-y-2">
                {rankings.byRevenue.slice(0, 5).map((c, i) => (
                  <div key={c.key} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 transition-colors"
                    onClick={() => goToClient(c)}>
                    <span className="text-xs font-mono text-muted-foreground w-5">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                    <span className="text-xs font-medium text-foreground flex-1 truncate">{c.name}</span>
                    <span className="text-xs font-mono text-success">{fmt(c.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 glass-card border-destructive/20">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Em Risco / Inativos
              </h3>
              <div className="space-y-2">
                {analysisData.filter(c => c.status === "Em Risco" || c.status === "Inativo")
                  .sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map(c => (
                    <div key={c.key} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 transition-colors"
                      onClick={() => goToClient(c)}>
                      <Badge variant="outline" className={`text-[9px] px-1 ${statusColors[c.status]}`}>{c.status}</Badge>
                      <span className="text-xs font-medium text-foreground flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.daysInactive}d</span>
                    </div>
                  ))}
                {analysisData.filter(c => c.status === "Em Risco" || c.status === "Inativo").length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum cliente em risco 🎉</p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ===== CHURN & LOST REVENUE ===== */}
        <TabsContent value="churn" className="space-y-5 mt-4">
          {/* Churn KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Inativos +6 meses", value: churnAnalysis.inactive6m.length.toString(), icon: UserX, color: "text-destructive", clients: churnAnalysis.inactive6m },
              { label: "Receita Anual Perdida", value: fmt(churnAnalysis.lostRevenue), icon: TrendingDown, color: "text-destructive", clients: churnAnalysis.inactive6m },
              { label: "LTV em Risco", value: fmt(churnAnalysis.inactive6m.reduce((a, c) => a + c.ltv, 0)), icon: HeartCrack, color: "text-warning", clients: [...churnAnalysis.inactive6m].sort((a, b) => b.ltv - a.ltv) },
              { label: "Ticket Médio Perdido", value: fmt(churnAnalysis.inactive6m.length > 0 ? churnAnalysis.inactive6m.reduce((a, c) => a + c.avgTicket, 0) / churnAnalysis.inactive6m.length : 0), icon: Ghost, color: "text-muted-foreground", clients: churnAnalysis.inactive6m },
            ].map(k => (
              <Card key={k.label}
                className="p-4 glass-card border-destructive/10 cursor-pointer hover:ring-1 hover:ring-destructive/30 transition-all group"
                onClick={() => openDrilldown(k.label, k.clients)}>
                <div className="flex items-center gap-1.5 mb-2">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{k.value}</p>
                <div className="text-[9px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Clique para ver clientes →
                </div>
              </Card>
            ))}
          </div>

          {/* Lost Revenue by Time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 glass-card">
              <h3 className="section-title text-sm mb-4"><CalendarX className="w-4 h-4 text-destructive" /> Receita Perdida por Período de Inatividade</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnAnalysis.monthBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number, name: string) => [name === "Clientes" ? v : fmt(v), name]} />
                  <Bar yAxisId="left" dataKey="receitaPerdida" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Receita Perdida/ano" fillOpacity={0.7} />
                  <Bar yAxisId="right" dataKey="clientes" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Clientes" fillOpacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 glass-card">
              <h3 className="section-title text-sm mb-4"><Timer className="w-4 h-4 text-warning" /> LTV em Risco por Período</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={churnAnalysis.monthBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => [fmt(v), "LTV"]} />
                  <Area type="monotone" dataKey="ltvPerdido" fill="hsl(var(--warning))" stroke="hsl(var(--warning))" fillOpacity={0.2} name="LTV Perdido" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Frequency x Inactivity Matrix */}
          <Card className="p-5 glass-card">
            <h3 className="section-title text-sm mb-4">
              <Sparkles className="w-4 h-4 text-primary" /> Matriz: Frequência de Viagem × Tempo Inativo
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Quanto mais frequente o cliente viajava e mais tempo ficou inativo, maior a receita que você está perdendo.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 text-left text-muted-foreground font-semibold">Frequência ↓ / Inatividade →</th>
                    {["6-9 meses", "9-12 meses", "12-18 meses", "18+ meses"].map(h => (
                      <th key={h} className="p-2 text-center text-muted-foreground font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["< 1/ano", "1-2/ano", "2-4/ano", "4+/ano"].map(freq => (
                    <tr key={freq} className="border-b border-border/50">
                      <td className="p-2 font-medium text-foreground">{freq}</td>
                      {["6-9 meses", "9-12 meses", "12-18 meses", "18+ meses"].map(inact => {
                        const cell = churnAnalysis.matrix.find(m => m.freq === freq && m.inact === inact);
                        const intensity = cell && cell.lostRev > 0 ? Math.min(1, cell.lostRev / 50000) : 0;
                        return (
                          <td key={inact}
                            className="p-2 text-center cursor-pointer hover:ring-1 hover:ring-primary/30 rounded transition-all"
                            style={{ backgroundColor: intensity > 0 ? `hsla(0, 72%, 51%, ${intensity * 0.3 + 0.05})` : undefined }}
                            onClick={() => {
                              if (cell && cell.clients.length > 0) openDrilldown(`${freq} × ${inact}`, cell.clients);
                            }}>
                            {cell && cell.count > 0 ? (
                              <div>
                                <div className="font-bold text-foreground">{cell.count}</div>
                                <div className="text-[10px] text-destructive">{fmt(cell.lostRev)}/ano</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Lost Clients */}
          <Card className="p-5 glass-card border-destructive/10">
            <h3 className="section-title text-sm mb-4">
              <UserX className="w-4 h-4 text-destructive" /> Top 15 Clientes Inativos — Receita que Você Está Perdendo
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs text-right">Receita Hist.</TableHead>
                    <TableHead className="text-xs text-right">Receita/Ano Est.</TableHead>
                    <TableHead className="text-xs text-right">LTV</TableHead>
                    <TableHead className="text-xs text-right">Viagens</TableHead>
                    <TableHead className="text-xs text-right">Freq.</TableHead>
                    <TableHead className="text-xs text-right">Dias Inativo</TableHead>
                    <TableHead className="text-xs">Destino Fav.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {churnAnalysis.topLost.map((c, i) => (
                    <TableRow key={c.key} className="cursor-pointer hover:bg-muted/50" onClick={() => goToClient(c)}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(c.totalRevenue)}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-destructive font-semibold">{fmt(c.estimatedAnnualRevenue)}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-warning">{fmt(c.ltv)}</TableCell>
                      <TableCell className="text-xs text-right">{c.totalTrips}</TableCell>
                      <TableCell className="text-xs text-right">{c.frequency.toFixed(1)}/ano</TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30">
                          {c.daysInactive}d
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{c.topDestination}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Insights */}
          <Card className="p-5 glass-card">
            <h3 className="section-title text-sm mb-4"><Brain className="w-4 h-4 text-primary" /> Insights de Churn</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const insights: { icon: any; text: string; color: string }[] = [];
                const { inactive6m, lostRevenue, topLost } = churnAnalysis;

                if (inactive6m.length > 0) {
                  insights.push({ icon: UserX, text: `${inactive6m.length} clientes não compram há mais de 6 meses. Receita anual estimada perdida: ${fmt(lostRevenue)}`, color: "text-destructive" });
                }
                const highValueLost = inactive6m.filter(c => c.totalRevenue > 20000);
                if (highValueLost.length > 0) {
                  insights.push({ icon: Crown, text: `${highValueLost.length} clientes de alto valor (>R$ 20k) estão inativos — prioridade máxima de reativação`, color: "text-warning" });
                }
                const frequentLost = inactive6m.filter(c => c.frequency >= 2);
                if (frequentLost.length > 0) {
                  insights.push({ icon: Activity, text: `${frequentLost.length} clientes que viajavam 2+ vezes/ano pararam — investigue as causas`, color: "text-info" });
                }
                if (topLost[0]) {
                  insights.push({ icon: Star, text: `"${topLost[0].name}" é o maior cliente perdido: ${fmt(topLost[0].estimatedAnnualRevenue)}/ano estimados não realizados`, color: "text-destructive" });
                }
                const vipsAtRisk = analysisData.filter(c => c.status === "VIP" && c.daysInactive > 120);
                if (vipsAtRisk.length > 0) {
                  insights.push({ icon: AlertTriangle, text: `⚠️ ${vipsAtRisk.length} VIPs com >120 dias sem atividade — risco iminente de perda`, color: "text-warning" });
                }
                const avgInactDays = inactive6m.length > 0 ? Math.round(inactive6m.reduce((a, c) => a + c.daysInactive, 0) / inactive6m.length) : 0;
                if (avgInactDays > 0) {
                  insights.push({ icon: Clock, text: `Média de inatividade dos clientes perdidos: ${avgInactDays} dias (~${Math.round(avgInactDays / 30)} meses)`, color: "text-muted-foreground" });
                }

                return insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <ins.icon className={`w-4 h-4 mt-0.5 shrink-0 ${ins.color}`} />
                    <span className="text-xs text-foreground leading-relaxed">{ins.text}</span>
                  </div>
                ));
              })()}
            </div>
          </Card>
        </TabsContent>

        {/* ===== RANKINGS ===== */}
        <TabsContent value="rankings" className="space-y-5 mt-4">
          {Object.entries(rankings).map(([key, data]) => {
            const meta: Record<string, { title: string; icon: any; field: keyof ClientAnalysis; format: (v: number) => string }> = {
              byRevenue: { title: "Top 10 por Receita", icon: DollarSign, field: "totalRevenue", format: fmt },
              byProfit: { title: "Top 10 por Lucro", icon: TrendingUp, field: "totalProfit", format: fmt },
              byMargin: { title: "Top 10 por Margem (≥2 viagens)", icon: Target, field: "avgMargin", format: pct },
              byFrequency: { title: "Top 10 por Frequência (≥2 viagens)", icon: Activity, field: "frequency", format: (v) => `${v.toFixed(1)}/ano` },
              byTicket: { title: "Top 10 por Ticket Médio", icon: Award, field: "avgTicket", format: fmt },
              byLtv: { title: "Top 10 por LTV (Lifetime Value)", icon: Zap, field: "ltv", format: fmt },
            };
            const t = meta[key];
            if (!t) return null;
            const Icon = t.icon;

            return (
              <Card key={key} className="p-5 glass-card">
                <h3 className="section-title text-sm mb-4"><Icon className="w-4 h-4 text-primary" /> {t.title}</h3>
                <div className="space-y-1.5">
                  {data.map((c, i) => {
                    const val = c[t.field] as number;
                    const maxVal = (data[0]?.[t.field] as number) || 1;
                    const pctW = Math.max(5, (val / maxVal) * 100);
                    return (
                      <div key={c.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => goToClient(c)}>
                        <span className={`text-sm font-mono w-6 text-center ${i < 3 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                            <Badge variant="outline" className={`text-[9px] ${statusColors[c.status]}`}>{c.status}</Badge>
                            <span className="text-[10px] text-muted-foreground">{c.totalTrips} viagens</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pctW}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-mono font-semibold text-foreground shrink-0">{t.format(val)}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </TabsContent>

        {/* ===== TABLE ===== */}
        <TabsContent value="table" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente, destino, cidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {["all", "VIP", "Ativo", "Inativo", "Em Risco", "Perdido"].map(s => (
                <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="h-8 text-xs"
                  onClick={() => setStatusFilter(s)}>
                  {s === "all" ? `Todos (${analysisData.length})` : `${s} (${analysisData.filter(c => c.status === s).length})`}
                </Button>
              ))}
            </div>
          </div>

          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {([
                      ["name", "Nome"], ["totalRevenue", "Receita"], ["totalProfit", "Lucro"],
                      ["avgMargin", "Margem"], ["totalTrips", "Viagens"], ["avgTicket", "Ticket"],
                      ["frequency", "Freq."], ["overallScore", "Score"], ["ltv", "LTV"],
                      ["daysInactive", "Dias Inativo"], ["topDestination", "Destino"], ["status", "Status"],
                    ] as [keyof ClientAnalysis, string][]).map(([k, label]) => (
                      <th key={k} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                        onClick={() => toggleSort(k)}>
                        <span className="flex items-center gap-1">
                          {label}
                          {sortBy === k && (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(0, 100).map(c => (
                    <tr key={c.key} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => goToClient(c)}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground truncate max-w-[200px]">{c.name}</div>
                        {c.originCity && <div className="text-[10px] text-muted-foreground">{c.originCity}</div>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-success whitespace-nowrap">{fmt(c.totalRevenue)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-primary whitespace-nowrap">{fmt(c.totalProfit)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{pct(c.avgMargin)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-center">{c.totalTrips}</td>
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{fmt(c.avgTicket)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{c.frequency.toFixed(1)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${c.overallScore > 70 ? "text-success" : c.overallScore > 40 ? "text-warning" : "text-destructive"}`}>
                            {c.overallScore}
                          </span>
                          <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${c.overallScore > 70 ? "bg-success" : c.overallScore > 40 ? "bg-warning" : "bg-destructive"}`}
                              style={{ width: `${c.overallScore}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{fmt(c.ltv)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-mono text-xs ${c.daysInactive > 180 ? "text-destructive font-semibold" : c.daysInactive > 90 ? "text-warning" : "text-muted-foreground"}`}>
                          {c.daysInactive < 9999 ? `${c.daysInactive}d` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs">{c.topDestination}</span></td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className={`text-[10px] ${statusColors[c.status]}`}>{c.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              Exibindo {Math.min(tableData.length, 100)} de {tableData.length} clientes
            </div>
          </Card>
        </TabsContent>

        {/* ===== CROSS ANALYSIS ===== */}
        <TabsContent value="cross" className="space-y-5 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Scatter */}
            <Card className="p-5 glass-card">
              <h3 className="section-title text-sm mb-4"><Sparkles className="w-4 h-4 text-primary" /> Ticket Médio vs Margem</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="ticket" name="Ticket" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="number" dataKey="margin" name="Margem" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [name === "Ticket" ? fmt(v) : `${v.toFixed(1)}%`, name]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""} />
                  <Scatter data={crossData.scatterData} fill="hsl(var(--primary))" fillOpacity={0.5} name="Clientes" />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            {/* Region x Margin */}
            <Card className="p-5 glass-card">
              <h3 className="section-title text-sm mb-4"><Plane className="w-4 h-4 text-info" /> Região vs Margem Média</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={crossData.regionMarginData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="region" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Margem"]} />
                  <Bar dataKey="margin" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]}
                    onClick={(data) => {
                      const region = data.region;
                      if (region) openDrilldown(`Região: ${region}`, analysisData.filter(c => c.topRegion === region));
                    }}
                    className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* VIP Radar + Insights */}
            <Card className="p-5 glass-card lg:col-span-2">
              <h3 className="section-title text-sm mb-4"><Crown className="w-4 h-4 text-primary" /> Análise VIP — Radar + Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%"
                    data={(() => {
                      const vips = analysisData.filter(c => c.status === "VIP");
                      const all = analysisData.filter(c => c.totalTrips > 0);
                      if (all.length === 0) return [];
                      const maxRev = Math.max(...all.map(c => c.totalRevenue), 1);
                      return [
                        { subject: "Receita", vip: vips.length ? (vips.reduce((a, c) => a + c.totalRevenue, 0) / vips.length / maxRev) * 100 : 0, geral: (all.reduce((a, c) => a + c.totalRevenue, 0) / all.length / maxRev) * 100 },
                        { subject: "Margem", vip: vips.length ? vips.reduce((a, c) => a + c.avgMargin, 0) / vips.length : 0, geral: all.reduce((a, c) => a + c.avgMargin, 0) / all.length },
                        { subject: "Frequência", vip: vips.length ? Math.min(100, (vips.reduce((a, c) => a + c.frequency, 0) / vips.length) * 25) : 0, geral: Math.min(100, (all.reduce((a, c) => a + c.frequency, 0) / all.length) * 25) },
                        { subject: "Ticket", vip: vips.length ? Math.min(100, (vips.reduce((a, c) => a + c.avgTicket, 0) / vips.length) / 200) : 0, geral: Math.min(100, (all.reduce((a, c) => a + c.avgTicket, 0) / all.length) / 200) },
                        { subject: "Fidelidade", vip: vips.length ? vips.reduce((a, c) => a + c.scoreLoyalty, 0) / vips.length : 0, geral: all.reduce((a, c) => a + c.scoreLoyalty, 0) / all.length },
                      ];
                    })()}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Radar name="VIP" dataKey="vip" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                    <Radar name="Geral" dataKey="geral" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">🧠 Insights Automáticos</h4>
                  {(() => {
                    const insights: { icon: any; text: string; color: string }[] = [];
                    const vips = analysisData.filter(c => c.status === "VIP");
                    const atRisk = analysisData.filter(c => c.status === "Em Risco");
                    const lost = analysisData.filter(c => c.status === "Perdido");
                    const top = rankings.byRevenue[0];
                    const active = analysisData.filter(c => c.totalTrips > 0);

                    if (vips.length > 0 && kpis.totalRevenue > 0) {
                      const vipRev = vips.reduce((a, c) => a + c.totalRevenue, 0);
                      insights.push({ icon: Crown, text: `${vips.length} clientes VIP geram ${((vipRev / kpis.totalRevenue) * 100).toFixed(0)}% da receita total`, color: "text-primary" });
                    }
                    if (top) insights.push({ icon: Star, text: `"${top.name}" é o mais valioso: ${fmt(top.totalRevenue)} em ${top.totalTrips} viagens`, color: "text-success" });
                    if (atRisk.length > 0) {
                      const atRiskRev = atRisk.reduce((a, c) => a + c.totalRevenue, 0);
                      insights.push({ icon: AlertTriangle, text: `${atRisk.length} clientes em risco com ${fmt(atRiskRev)} de receita histórica`, color: "text-destructive" });
                    }
                    if (lost.length > 0) insights.push({ icon: Shield, text: `${lost.length} clientes perdidos (>1 ano sem viagem) — considerar reativação`, color: "text-muted-foreground" });
                    const highTicketLowMargin = active.filter(c => c.avgTicket > kpis.avgTicket * 1.5 && c.avgMargin < 10);
                    if (highTicketLowMargin.length > 0) insights.push({ icon: Zap, text: `${highTicketLowMargin.length} clientes com ticket alto e margem < 10%`, color: "text-warning" });
                    const recurring = active.filter(c => c.totalTrips >= 3);
                    if (recurring.length > 0) insights.push({ icon: Activity, text: `${recurring.length} clientes recorrentes (3+ viagens) — fidelização`, color: "text-info" });

                    return insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                        <ins.icon className={`w-4 h-4 mt-0.5 shrink-0 ${ins.color}`} />
                        <span className="text-xs text-foreground leading-relaxed">{ins.text}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DRILL-DOWN DIALOG ===== */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.label} — {drilldown?.clients.length} clientes</DialogTitle>
          </DialogHeader>
          {drilldown && (
            <>
              <div className="flex gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                <span>Receita Total: <strong className="text-foreground">{fmt(drilldown.clients.reduce((a, c) => a + c.totalRevenue, 0))}</strong></span>
                <span>Lucro Total: <strong className="text-foreground">{fmt(drilldown.clients.reduce((a, c) => a + c.totalProfit, 0))}</strong></span>
                <span>LTV Total: <strong className="text-foreground">{fmt(drilldown.clients.reduce((a, c) => a + c.ltv, 0))}</strong></span>
                <span>Viagens: <strong className="text-foreground">{drilldown.clients.reduce((a, c) => a + c.totalTrips, 0)}</strong></span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Receita</TableHead>
                    <TableHead className="text-xs text-right">Lucro</TableHead>
                    <TableHead className="text-xs text-right">LTV</TableHead>
                    <TableHead className="text-xs text-right">Viagens</TableHead>
                    <TableHead className="text-xs text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldown.clients.slice(0, 100).map((c, i) => (
                    <TableRow key={c.key} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrilldown(null); goToClient(c); }}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[9px] ${statusColors[c.status]}`}>{c.status}</Badge></TableCell>
                      <TableCell className="text-xs text-right font-mono text-success">{fmt(c.totalRevenue)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(c.totalProfit)}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-warning">{fmt(c.ltv)}</TableCell>
                      <TableCell className="text-xs text-right">{c.totalTrips}</TableCell>
                      <TableCell className="text-xs text-right">
                        <span className={`font-bold ${c.overallScore > 70 ? "text-success" : c.overallScore > 40 ? "text-warning" : "text-destructive"}`}>
                          {c.overallScore}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
