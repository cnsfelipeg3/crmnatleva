import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { fetchAllRows } from "@/lib/fetchAll";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeClients, getSegmento, type ClientAnalysis, type ClientSale } from "@/lib/clientScoring";
import { generateRecommendations, type Recommendation } from "@/lib/clientRecommendations";
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
  AreaChart, Area,
} from "recharts";
import {
  Users, DollarSign, TrendingUp, Target, Crown, AlertTriangle,
  Search, Download, ChevronRight, Star, Zap, Shield,
  BarChart3, Layers, Activity, Clock, Plane, Brain, Sparkles, Send,
  ArrowUp, ArrowDown, Award, HeartCrack, Timer,
  TrendingDown, UserX, CalendarX, Lightbulb, Gem, Eye, Loader2, RefreshCw, Wand2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v.toFixed(1)}%`;

const COLORS = [
  "hsl(160, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)",
  "hsl(280, 60%, 50%)", "hsl(0, 72%, 51%)", "hsl(158, 60%, 38%)",
  "hsl(30, 80%, 55%)", "hsl(190, 70%, 45%)",
];

const SEGMENTO_COLORS: Record<string, string> = {
  "VIP Elite": "bg-primary/20 text-primary border-primary/40",
  "VIP Premium": "bg-accent/20 text-accent-foreground border-accent/40",
  "Cliente Estratégico": "bg-info/20 text-info border-info/40",
  "Cliente Recorrente": "bg-success/20 text-success border-success/40",
  "Cliente Potencial": "bg-warning/20 text-warning border-warning/40",
  "Cliente em Risco": "bg-destructive/20 text-destructive border-destructive/40",
};

export default function ClientIntelligence() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [sales, setSales] = useState<ClientSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof ClientAnalysis>("scoreNatLeva");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [segmentoFilter, setSegmentoFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [drilldown, setDrilldown] = useState<{ label: string; clients: ClientAnalysis[] } | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientAnalysis | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) setClientSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    fetchAllRows("sales", "*", { order: { column: "created_at", ascending: false } })
      .then((data) => {
        setSales(data as ClientSale[]);
        setLoading(false);
      })
      .catch((err) => {
        console.error("ClientIntelligence fetch error:", err);
        setLoading(false);
      });
  }, [user, authLoading]);

  const analysisData = useMemo(() => analyzeClients(sales), [sales]);

  const clientSearchResults = useMemo(() => {
    if (clientSearch.length < 2) return [];
    const q = clientSearch.toLowerCase();
    return analysisData
      .filter(c => c.name.toLowerCase().includes(q) || c.originCity?.toLowerCase().includes(q) || c.topDestination.toLowerCase().includes(q))
      .slice(0, 10);
  }, [clientSearch, analysisData]);

  // Global KPIs
  const kpis = useMemo(() => {
    const active = analysisData.filter(c => c.totalTrips > 0);
    const totalRevenue = active.reduce((a, c) => a + c.totalRevenue, 0);
    const totalProfit = active.reduce((a, c) => a + c.totalProfit, 0);
    const totalTrips = active.reduce((a, c) => a + c.totalTrips, 0);
    const avgTicket = totalTrips > 0 ? totalRevenue / totalTrips : 0;
    const avgMargin = active.length > 0 ? active.reduce((a, c) => a + c.avgMargin, 0) / active.length : 0;
    const avgFreq = active.length > 0 ? active.reduce((a, c) => a + c.frequency, 0) / active.length : 0;
    const vipElite = analysisData.filter(c => c.segmento === "VIP Elite");
    const vipPremium = analysisData.filter(c => c.segmento === "VIP Premium");
    const emRisco = analysisData.filter(c => c.segmento === "Cliente em Risco");
    const rev12m = active.reduce((a, c) => a + c.revenue12m, 0);
    const totalLtv = active.reduce((a, c) => a + c.ltv, 0);
    const avgScore = active.length > 0 ? Math.round(active.reduce((a, c) => a + c.scoreNatLeva, 0) / active.length) : 0;
    return { totalClients: active.length, totalRevenue, totalProfit, avgTicket, avgMargin, avgFreq,
      vipElite, vipPremium, emRisco, rev12m, totalLtv, active, avgScore };
  }, [analysisData]);

  // Churn analysis
  const churnAnalysis = useMemo(() => {
    const inactive6m = analysisData.filter(c => c.daysInactive >= 180 && c.daysInactive < 9999 && c.totalTrips > 0);
    const lostRevenue = inactive6m.reduce((a, c) => a + c.estimatedAnnualRevenue, 0);
    const freqBuckets = ["< 1/ano", "1-2/ano", "2-4/ano", "4+/ano"];
    const inactBuckets = ["6-9m", "9-12m", "12-18m", "18+m"];
    const matrix: { freq: string; inact: string; count: number; lostRev: number; clients: ClientAnalysis[] }[] = [];
    freqBuckets.forEach(fb => {
      inactBuckets.forEach(ib => {
        const matching = inactive6m.filter(c => {
          const f = c.frequency;
          const fMatch = fb === "< 1/ano" ? f < 1 : fb === "1-2/ano" ? f >= 1 && f < 2 : fb === "2-4/ano" ? f >= 2 && f < 4 : f >= 4;
          const d = c.daysInactive;
          const iMatch = ib === "6-9m" ? d >= 180 && d < 270 : ib === "9-12m" ? d >= 270 && d < 365 : ib === "12-18m" ? d >= 365 && d < 540 : d >= 540;
          return fMatch && iMatch;
        });
        matrix.push({ freq: fb, inact: ib, count: matching.length, lostRev: matching.reduce((a, c) => a + c.estimatedAnnualRevenue, 0), clients: matching });
      });
    });
    const topLost = [...inactive6m].sort((a, b) => b.estimatedAnnualRevenue - a.estimatedAnnualRevenue).slice(0, 15);
    const monthBuckets = [
      { label: "6-9m", min: 180, max: 270 }, { label: "9-12m", min: 270, max: 365 },
      { label: "12-18m", min: 365, max: 540 }, { label: "18-24m", min: 540, max: 730 },
      { label: "24m+", min: 730, max: 99999 },
    ].map(b => {
      const cls = inactive6m.filter(c => c.daysInactive >= b.min && c.daysInactive < b.max);
      return { name: b.label, clientes: cls.length, receitaPerdida: cls.reduce((a, c) => a + c.estimatedAnnualRevenue, 0), ltvPerdido: cls.reduce((a, c) => a + c.ltv, 0) };
    });
    return { inactive6m, lostRevenue, matrix, topLost, monthBuckets };
  }, [analysisData]);

  // Rankings
  const rankings = useMemo(() => ({
    byScore: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.scoreNatLeva - a.scoreNatLeva).slice(0, 10),
    byRevenue: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
    byProfit: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 10),
    byMargin: [...analysisData].filter(c => c.totalTrips >= 2).sort((a, b) => b.avgMargin - a.avgMargin).slice(0, 10),
    byFrequency: [...analysisData].filter(c => c.totalTrips >= 2).sort((a, b) => b.frequency - a.frequency).slice(0, 10),
    byTicket: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.avgTicket - a.avgTicket).slice(0, 10),
    byLtv: [...analysisData].filter(c => c.totalTrips > 0).sort((a, b) => b.ltv - a.ltv).slice(0, 10),
  }), [analysisData]);

  // Cross analysis data
  const crossData = useMemo(() => {
    const active = analysisData.filter(c => c.totalTrips > 0);
    const regionMargin: Record<string, { total: number; count: number; rev: number }> = {};
    active.forEach(c => {
      const r = c.topRegion;
      if (!regionMargin[r]) regionMargin[r] = { total: 0, count: 0, rev: 0 };
      regionMargin[r].total += c.avgMargin; regionMargin[r].count++; regionMargin[r].rev += c.totalRevenue;
    });
    const regionMarginData = Object.entries(regionMargin).map(([r, d]) => ({ region: r, margin: d.total / d.count, receita: d.rev, clientes: d.count })).sort((a, b) => b.margin - a.margin);
    const scatterData = active.filter(c => c.avgTicket > 0).map(c => ({ name: c.name, ticket: c.avgTicket, margin: c.avgMargin, trips: c.totalTrips, score: c.scoreNatLeva }));

    // Segmento distribution
    const segDist: Record<string, number> = {};
    analysisData.forEach(c => { segDist[c.segmento] = (segDist[c.segmento] || 0) + 1; });
    const segData = Object.entries(segDist).map(([s, v]) => ({ name: s, value: v }));

    // Cluster distribution
    const clusterDist: Record<string, { count: number; rev: number; color: string }> = {};
    active.forEach(c => {
      if (!clusterDist[c.cluster]) clusterDist[c.cluster] = { count: 0, rev: 0, color: c.clusterColor };
      clusterDist[c.cluster].count++; clusterDist[c.cluster].rev += c.totalRevenue;
    });
    const clusterData = Object.entries(clusterDist).map(([k, v]) => ({ name: k, clientes: v.count, receita: v.rev, color: v.color })).sort((a, b) => b.receita - a.receita);

    const ltvBuckets = [
      { name: "< 10k", min: 0, max: 10000, count: 0 }, { name: "10k-50k", min: 10000, max: 50000, count: 0 },
      { name: "50k-100k", min: 50000, max: 100000, count: 0 }, { name: "100k-500k", min: 100000, max: 500000, count: 0 },
      { name: "> 500k", min: 500000, max: Infinity, count: 0 },
    ];
    active.forEach(c => { const b = ltvBuckets.find(b => c.ltv >= b.min && c.ltv < b.max); if (b) b.count++; });

    // Score distribution
    const scoreBuckets = [
      { name: "0-24", min: 0, max: 25, count: 0 }, { name: "25-39", min: 25, max: 40, count: 0 },
      { name: "40-54", min: 40, max: 55, count: 0 }, { name: "55-69", min: 55, max: 70, count: 0 },
      { name: "70-84", min: 70, max: 85, count: 0 }, { name: "85-100", min: 85, max: 101, count: 0 },
    ];
    active.forEach(c => { const b = scoreBuckets.find(b => c.scoreNatLeva >= b.min && c.scoreNatLeva < b.max); if (b) b.count++; });

    return { regionMarginData, scatterData, segData, clusterData, ltvBuckets, scoreBuckets };
  }, [analysisData]);

  // Filtered & sorted table
  const tableData = useMemo(() => {
    let data = [...analysisData];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.topDestination.toLowerCase().includes(q) || c.cluster.toLowerCase().includes(q) || c.originCity?.toLowerCase().includes(q));
    }
    if (segmentoFilter !== "all") data = data.filter(c => c.segmento === segmentoFilter);
    if (clusterFilter !== "all") data = data.filter(c => c.cluster === clusterFilter);
    data.sort((a, b) => {
      const av = a[sortBy] ?? 0; const bv = b[sortBy] ?? 0;
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return data;
  }, [analysisData, search, sortBy, sortDir, segmentoFilter, clusterFilter]);

  const toggleSort = (col: keyof ClientAnalysis) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const goToClient = (c: ClientAnalysis) => {
    if (c.saleIds.length > 0) navigate(`/sales/${c.saleIds[0]}`);
  };

  const openDrilldown = (label: string, clients: ClientAnalysis[]) => setDrilldown({ label, clients });

  // Unique clusters for filter
  const allClusters = useMemo(() => [...new Set(analysisData.map(c => c.cluster))].sort(), [analysisData]);
  const allSegmentos = useMemo(() => [...new Set(analysisData.map(c => c.segmento))].sort(), [analysisData]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const buildMetricsContext = useCallback(() => {
    const active = analysisData.filter(c => c.totalTrips > 0);
    const segDist: Record<string, number> = {};
    analysisData.forEach(c => { segDist[c.segmento] = (segDist[c.segmento] || 0) + 1; });
    const clusterDist: Record<string, { count: number; rev: number }> = {};
    active.forEach(c => {
      if (!clusterDist[c.cluster]) clusterDist[c.cluster] = { count: 0, rev: 0 };
      clusterDist[c.cluster].count++; clusterDist[c.cluster].rev += c.totalRevenue;
    });
    const inactive6m = analysisData.filter(c => c.daysInactive >= 180 && c.daysInactive < 9999 && c.totalTrips > 0);
    const inactiveBuckets = [
      { name: "6-9m", min: 180, max: 270 }, { name: "9-12m", min: 270, max: 365 },
      { name: "12-18m", min: 365, max: 540 }, { name: "18m+", min: 540, max: 99999 },
    ].map(b => ({ name: b.name, count: inactive6m.filter(c => c.daysInactive >= b.min && c.daysInactive < b.max).length }));
    const regionMargin: Record<string, { total: number; count: number; rev: number }> = {};
    active.forEach(c => {
      const r = c.topRegion;
      if (!regionMargin[r]) regionMargin[r] = { total: 0, count: 0, rev: 0 };
      regionMargin[r].total += c.avgMargin; regionMargin[r].count++; regionMargin[r].rev += c.totalRevenue;
    });
    const topRegions = Object.entries(regionMargin).map(([r, d]) => ({ region: r, margin: d.total / d.count, rev: d.rev })).sort((a, b) => b.rev - a.rev).slice(0, 8);
    const topRisk = [...inactive6m].sort((a, b) => b.ltv - a.ltv).slice(0, 5).map(c => ({
      name: c.name, ltv: c.ltv, daysInactive: c.daysInactive, freq: c.frequency, ticket: c.avgTicket,
    }));
    return {
      totalClients: kpis.totalClients, totalRevenue: kpis.totalRevenue, totalProfit: kpis.totalProfit,
      avgTicket: kpis.avgTicket, avgMargin: kpis.avgMargin, avgFreq: kpis.avgFreq,
      avgScore: kpis.avgScore, totalLtv: kpis.totalLtv, rev12m: kpis.rev12m,
      segments: Object.entries(segDist).map(([name, count]) => ({ name, count, pct: ((count / analysisData.length) * 100).toFixed(1) })),
      clusters: Object.entries(clusterDist).map(([name, d]) => ({ name, count: d.count, rev: d.rev })),
      inactive6m: inactive6m.length,
      lostRevenue: inactive6m.reduce((a, c) => a + c.estimatedAnnualRevenue, 0),
      inactiveBuckets,
      topClients: rankings.byRevenue.map(c => ({ name: c.name, revenue: c.totalRevenue, margin: c.avgMargin, score: c.scoreNatLeva, segment: c.segmento, cluster: c.cluster, daysInactive: c.daysInactive, ltv: c.ltv })),
      topRisk,
      topRegions,
    };
  }, [analysisData, kpis, rankings]);

  const sendChatMessage = useCallback(async (input: string) => {
    if (!input.trim() || chatLoading) return;
    const userMsg = { role: "user" as const, content: input.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    let assistantContent = "";
    const metrics = buildMetricsContext();

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-intelligence-ai`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, metrics }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast.error(err.error || "Erro ao conectar com IA");
        setChatLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setChatMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão com a IA");
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [chatMessages, chatLoading, buildMetricsContext]);

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
            <Brain className="w-6 h-6 text-primary" /> Inteligência de Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {analysisData.length} clientes · {sales.length} vendas · Score médio: <strong className="text-foreground">{kpis.avgScore}</strong>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const csv = ["Nome,Score NatLeva,Segmento,Cluster,Receita,Lucro,Margem,Viagens,Ticket,LTV,Freq,Dias Inativo,Destino,Região"]
            .concat(tableData.map(c => `"${c.name}",${c.scoreNatLeva},"${c.segmento}","${c.cluster}",${c.totalRevenue.toFixed(2)},${c.totalProfit.toFixed(2)},${c.avgMargin.toFixed(1)},${c.totalTrips},${c.avgTicket.toFixed(2)},${c.ltv.toFixed(2)},${c.frequency.toFixed(2)},${c.daysInactive},${c.topDestination},"${c.topRegion}"`))
            .join("\n");
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "inteligencia-clientes.csv"; a.click();
        }}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
      </div>

      {/* Client Search Bar */}
      <div ref={clientSearchRef} className="relative max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              setClientSearchOpen(true);
            }}
            onFocus={() => clientSearch.length >= 2 && setClientSearchOpen(true)}
            placeholder="🔍 Buscar cliente por nome, cidade ou destino..."
            className="pl-9 h-11 text-sm bg-muted/30 border-border/50 focus:bg-background"
          />
        </div>
        {clientSearchOpen && clientSearch.length >= 2 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-[360px] overflow-y-auto">
            {clientSearchResults.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">Nenhum cliente encontrado para "{clientSearch}"</div>
            )}
            {clientSearchResults.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setSelectedClient(c);
                  setClientSearchOpen(false);
                  setClientSearch("");
                }}
                className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {c.scoreNatLeva}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                    <span className="text-[10px]">{c.segmentoEmoji}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{c.segmento}</span>
                    <span>·</span>
                    <span>{fmt(c.totalRevenue)}</span>
                    <span>·</span>
                    <span>{c.totalTrips} viagens</span>
                    {c.originCity && <><span>·</span><span>📍 {c.originCity}</span></>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="dashboard"><BarChart3 className="w-3.5 h-3.5 mr-1" /> Dashboard</TabsTrigger>
          <TabsTrigger value="segmentos"><Crown className="w-3.5 h-3.5 mr-1" /> Segmentos</TabsTrigger>
          <TabsTrigger value="clusters"><Layers className="w-3.5 h-3.5 mr-1" /> Clusters</TabsTrigger>
          <TabsTrigger value="churn"><HeartCrack className="w-3.5 h-3.5 mr-1" /> Churn</TabsTrigger>
          <TabsTrigger value="rankings"><Award className="w-3.5 h-3.5 mr-1" /> Rankings</TabsTrigger>
          <TabsTrigger value="table"><Layers className="w-3.5 h-3.5 mr-1" /> Tabela</TabsTrigger>
          <TabsTrigger value="cross"><Sparkles className="w-3.5 h-3.5 mr-1" /> Cruzamentos</TabsTrigger>
          <TabsTrigger value="ai" className="bg-gradient-to-r from-primary/10 to-accent/10 data-[state=active]:from-primary/20 data-[state=active]:to-accent/20"><Wand2 className="w-3.5 h-3.5 mr-1" /> IA Estratégica</TabsTrigger>
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
              { label: "VIP Elite", value: kpis.vipElite.length.toString(), icon: Crown, color: "text-primary", clients: kpis.vipElite },
              { label: "VIP Premium", value: kpis.vipPremium.length.toString(), icon: Gem, color: "text-accent", clients: kpis.vipPremium },
              { label: "Em Risco", value: kpis.emRisco.length.toString(), icon: AlertTriangle, color: "text-destructive", clients: kpis.emRisco },
              { label: "LTV Total", value: fmt(kpis.totalLtv), icon: Zap, color: "text-warning", clients: [...kpis.active].sort((a, b) => b.ltv - a.ltv) },
            ].map(k => (
              <Card key={k.label}
                className="p-3.5 glass-card cursor-pointer hover:ring-1 hover:ring-accent/30 transition-all group"
                onClick={() => openDrilldown(k.label, k.clients)}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{k.value}</p>
                <div className="text-[9px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Clique →</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Segmento Distribution */}
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Distribuição por Segmento</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={crossData.segData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    onClick={(_, i) => {
                      const seg = crossData.segData[i]?.name;
                      if (seg) openDrilldown(`Segmento: ${seg}`, analysisData.filter(c => c.segmento === seg));
                    }}
                    className="cursor-pointer">
                    {crossData.segData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, "Clientes"]} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Score Distribution */}
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-info" /> Distribuição de Score NatLeva</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={crossData.scoreBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Clientes"
                    onClick={(data) => {
                      const bucket = crossData.scoreBuckets.find(b => b.name === data.name);
                      if (bucket) openDrilldown(`Score: ${bucket.name}`, analysisData.filter(c => c.scoreNatLeva >= bucket.min && c.scoreNatLeva < bucket.max));
                    }}
                    className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Quick Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 glass-card">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Top 5 Score NatLeva</h3>
              <div className="space-y-2">
                {rankings.byScore.slice(0, 5).map((c, i) => (
                  <div key={c.key} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 transition-colors"
                    onClick={() => setSelectedClient(c)}>
                    <span className="text-xs font-mono text-muted-foreground w-5">{i === 0 ? "🏆" : i === 1 ? "💎" : i === 2 ? "⭐" : `${i + 1}.`}</span>
                    <span className="text-xs font-medium text-foreground flex-1 truncate">{c.name}</span>
                    <span className={`text-xs font-bold ${c.scoreNatLeva >= 70 ? "text-success" : c.scoreNatLeva >= 40 ? "text-warning" : "text-destructive"}`}>{c.scoreNatLeva}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 glass-card">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-success" /> Top 5 Receita</h3>
              <div className="space-y-2">
                {rankings.byRevenue.slice(0, 5).map((c, i) => (
                  <div key={c.key} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 transition-colors"
                    onClick={() => setSelectedClient(c)}>
                    <span className="text-xs font-mono text-muted-foreground w-5">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                    <span className="text-xs font-medium text-foreground flex-1 truncate">{c.name}</span>
                    <span className="text-xs font-mono text-success">{fmt(c.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 glass-card border-destructive/20">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Em Risco (Alto Valor)</h3>
              <div className="space-y-2">
                {analysisData.filter(c => c.segmento === "Cliente em Risco" && c.totalRevenue > 0)
                  .sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map(c => (
                    <div key={c.key} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 transition-colors"
                      onClick={() => setSelectedClient(c)}>
                      <span className="text-[10px]">{c.segmentoEmoji}</span>
                      <span className="text-xs font-medium text-foreground flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.daysInactive}d</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ===== SEGMENTOS ===== */}
        <TabsContent value="segmentos" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {["VIP Elite", "VIP Premium", "Cliente Estratégico", "Cliente Recorrente", "Cliente Potencial", "Cliente em Risco"].map(seg => {
              const s = getSegmento(seg === "VIP Elite" ? 90 : seg === "VIP Premium" ? 75 : seg === "Cliente Estratégico" ? 60 : seg === "Cliente Recorrente" ? 45 : seg === "Cliente Potencial" ? 30 : 10);
              const clients = analysisData.filter(c => c.segmento === seg);
              const rev = clients.reduce((a, c) => a + c.totalRevenue, 0);
              return (
                <Card key={seg} className={`p-4 glass-card cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all`}
                  onClick={() => openDrilldown(`${s.emoji} ${seg}`, clients)}>
                  <div className="text-2xl mb-2">{s.emoji}</div>
                  <h4 className="text-xs font-semibold text-foreground">{seg}</h4>
                  <p className="text-lg font-bold text-foreground mt-1">{clients.length}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt(rev)}</p>
                </Card>
              );
            })}
          </div>

          {/* Segmento comparison radar */}
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold mb-4">Comparação por Segmento</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={(() => {
                const segs = ["VIP Elite", "VIP Premium", "Cliente Estratégico"];
                const all = analysisData.filter(c => c.totalTrips > 0);
                const maxRev = Math.max(...all.map(c => c.totalRevenue), 1);
                const maxFreq = Math.max(...all.map(c => c.frequency), 1);
                const subjects = ["Receita", "Margem", "Frequência", "Ticket", "LTV"];
                return subjects.map(sub => {
                  const row: any = { subject: sub };
                  segs.forEach(seg => {
                    const cls = analysisData.filter(c => c.segmento === seg);
                    if (cls.length === 0) { row[seg] = 0; return; }
                    const avg = (field: (c: ClientAnalysis) => number) => cls.reduce((a, c) => a + field(c), 0) / cls.length;
                    if (sub === "Receita") row[seg] = Math.min(100, (avg(c => c.totalRevenue) / maxRev) * 100);
                    else if (sub === "Margem") row[seg] = avg(c => c.avgMargin);
                    else if (sub === "Frequência") row[seg] = Math.min(100, (avg(c => c.frequency) / maxFreq) * 100);
                    else if (sub === "Ticket") row[seg] = Math.min(100, avg(c => c.avgTicket) / 200);
                    else row[seg] = Math.min(100, avg(c => c.ltv) / 5000);
                  });
                  return row;
                });
              })()}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name="VIP Elite" dataKey="VIP Elite" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                <Radar name="VIP Premium" dataKey="VIP Premium" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} />
                <Radar name="Estratégico" dataKey="Cliente Estratégico" stroke="hsl(var(--info))" fill="hsl(var(--info))" fillOpacity={0.1} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Score formula explanation */}
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Fórmula Score NatLeva</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              {[
                { pillar: "Valor", weight: "25%", desc: "Receita histórica vs maior da base" },
                { pillar: "Lucratividade", weight: "25%", desc: "Margem média: ≥30%→100, ≥20%→80, ≥15%→60" },
                { pillar: "Frequência", weight: "20%", desc: "Viagens/ano vs maior frequência" },
                { pillar: "Recência", weight: "15%", desc: "<90d→100, <180d→70, <365d→40" },
                { pillar: "Potencial", weight: "15%", desc: "12m vs 12m anteriores: ↑=100, →=70, ↓=40" },
              ].map(p => (
                <div key={p.pillar} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground">{p.pillar}</span>
                    <Badge variant="outline" className="text-[10px]">{p.weight}</Badge>
                  </div>
                  <p className="text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ===== CLUSTERS ===== */}
        <TabsContent value="clusters" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {crossData.clusterData.map(cl => (
              <Card key={cl.name} className="p-4 glass-card cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                onClick={() => openDrilldown(`Cluster: ${cl.name}`, analysisData.filter(c => c.cluster === cl.name))}>
                <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: cl.color }} />
                <h4 className="text-xs font-semibold text-foreground">{cl.name}</h4>
                <p className="text-lg font-bold text-foreground mt-1">{cl.clientes}</p>
                <p className="text-[10px] text-muted-foreground">{fmt(cl.receita)}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold mb-4">Receita por Cluster</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={crossData.clusterData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={140} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => [fmt(v), "Receita"]} />
                <Bar dataKey="receita" radius={[0, 4, 4, 0]} name="Receita"
                  onClick={(data) => openDrilldown(`Cluster: ${data.name}`, analysisData.filter(c => c.cluster === data.name))}
                  className="cursor-pointer">
                  {crossData.clusterData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Cluster insights */}
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-warning" /> Insights por Cluster</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {crossData.clusterData.slice(0, 6).map(cl => {
                const clients = analysisData.filter(c => c.cluster === cl.name);
                const avgScore = clients.length > 0 ? Math.round(clients.reduce((a, c) => a + c.scoreNatLeva, 0) / clients.length) : 0;
                const avgTicket = clients.length > 0 ? clients.reduce((a, c) => a + c.avgTicket, 0) / clients.length : 0;
                return (
                  <div key={cl.name} className="p-3 rounded-lg bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50"
                    onClick={() => openDrilldown(`Cluster: ${cl.name}`, clients)}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cl.color }} />
                      <span className="text-xs font-semibold text-foreground">{cl.name}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">{cl.clientes} clientes</Badge>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>Score médio: <strong className="text-foreground">{avgScore}</strong></span>
                      <span>Ticket médio: <strong className="text-foreground">{fmt(avgTicket)}</strong></span>
                      <span>Receita: <strong className="text-foreground">{fmt(cl.receita)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* ===== CHURN ===== */}
        <TabsContent value="churn" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Inativos +6m", value: churnAnalysis.inactive6m.length.toString(), icon: UserX, color: "text-destructive", clients: churnAnalysis.inactive6m },
              { label: "Receita Anual Perdida", value: fmt(churnAnalysis.lostRevenue), icon: TrendingDown, color: "text-destructive", clients: churnAnalysis.inactive6m },
              { label: "LTV em Risco", value: fmt(churnAnalysis.inactive6m.reduce((a, c) => a + c.ltv, 0)), icon: HeartCrack, color: "text-warning", clients: [...churnAnalysis.inactive6m].sort((a, b) => b.ltv - a.ltv) },
              { label: "Ticket Médio Perdido", value: fmt(churnAnalysis.inactive6m.length > 0 ? churnAnalysis.inactive6m.reduce((a, c) => a + c.avgTicket, 0) / churnAnalysis.inactive6m.length : 0), icon: Target, color: "text-muted-foreground", clients: churnAnalysis.inactive6m },
            ].map(k => (
              <Card key={k.label} className="p-4 glass-card border-destructive/10 cursor-pointer hover:ring-1 hover:ring-destructive/30 transition-all group"
                onClick={() => openDrilldown(k.label, k.clients)}>
                <div className="flex items-center gap-1.5 mb-2"><k.icon className={`w-4 h-4 ${k.color}`} /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</span></div>
                <p className="text-xl font-bold text-foreground">{k.value}</p>
                <div className="text-[9px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Clique →</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><CalendarX className="w-4 h-4 text-destructive" /> Receita Perdida por Período</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={churnAnalysis.monthBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number, name: string) => [name === "Clientes" ? v : fmt(v), name]} />
                  <Bar yAxisId="left" dataKey="receitaPerdida" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Receita Perdida" fillOpacity={0.7} />
                  <Bar yAxisId="right" dataKey="clientes" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Clientes" fillOpacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Timer className="w-4 h-4 text-warning" /> LTV em Risco</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={churnAnalysis.monthBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [fmt(v), "LTV"]} />
                  <Area type="monotone" dataKey="ltvPerdido" fill="hsl(var(--warning))" stroke="hsl(var(--warning))" fillOpacity={0.2} name="LTV Perdido" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Matrix */}
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Matriz: Frequência × Inatividade</h3>
            <p className="text-xs text-muted-foreground mb-4">Quanto mais frequente e mais inativo, maior a perda de receita.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 text-left text-muted-foreground font-semibold">Freq ↓ / Inatividade →</th>
                    {["6-9m", "9-12m", "12-18m", "18+m"].map(h => <th key={h} className="p-2 text-center text-muted-foreground font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {["< 1/ano", "1-2/ano", "2-4/ano", "4+/ano"].map(freq => (
                    <tr key={freq} className="border-b border-border/50">
                      <td className="p-2 font-medium text-foreground">{freq}</td>
                      {["6-9m", "9-12m", "12-18m", "18+m"].map(inact => {
                        const cell = churnAnalysis.matrix.find(m => m.freq === freq && m.inact === inact);
                        const intensity = cell && cell.lostRev > 0 ? Math.min(1, cell.lostRev / 50000) : 0;
                        return (
                          <td key={inact} className="p-2 text-center cursor-pointer hover:ring-1 hover:ring-primary/30 rounded transition-all"
                            style={{ backgroundColor: intensity > 0 ? `hsla(0, 72%, 51%, ${intensity * 0.3 + 0.05})` : undefined }}
                            onClick={() => cell && cell.clients.length > 0 && openDrilldown(`${freq} × ${inact}`, cell.clients)}>
                            {cell && cell.count > 0 ? (
                              <div><div className="font-semibold text-foreground">{cell.count}</div><div className="text-[9px] text-muted-foreground">{fmt(cell.lostRev)}</div></div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Lost + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserX className="w-4 h-4 text-destructive" /> Top Clientes Perdidos</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">#</TableHead><TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs text-right">Receita/ano</TableHead><TableHead className="text-xs text-right">Dias</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {churnAnalysis.topLost.slice(0, 10).map((c, i) => (
                      <TableRow key={c.key} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedClient(c)}>
                        <TableCell className="text-xs font-mono">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{c.name}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-destructive">{fmt(c.estimatedAnnualRevenue)}</TableCell>
                        <TableCell className="text-xs text-right"><Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive">{c.daysInactive}d</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Insights de Churn</h3>
              <div className="space-y-2">
                {(() => {
                  const insights: { text: string; color: string }[] = [];
                  const { inactive6m, lostRevenue } = churnAnalysis;
                  if (inactive6m.length > 0) insights.push({ text: `${inactive6m.length} clientes inativos há +6 meses. Receita perdida estimada: ${fmt(lostRevenue)}/ano`, color: "text-destructive" });
                  const highValue = inactive6m.filter(c => c.totalRevenue > 20000);
                  if (highValue.length > 0) insights.push({ text: `${highValue.length} clientes de alto valor (>R$ 20k) inativos — prioridade máxima`, color: "text-warning" });
                  const frequent = inactive6m.filter(c => c.frequency >= 2);
                  if (frequent.length > 0) insights.push({ text: `${frequent.length} viajantes frequentes (2+/ano) pararam — investigar causas`, color: "text-info" });
                  const vipsAtRisk = analysisData.filter(c => (c.segmento === "VIP Elite" || c.segmento === "VIP Premium") && c.daysInactive > 120);
                  if (vipsAtRisk.length > 0) insights.push({ text: `⚠️ ${vipsAtRisk.length} VIPs com >120d sem atividade — risco iminente`, color: "text-warning" });
                  return insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                      <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${ins.color}`} />
                      <span className="text-xs text-foreground leading-relaxed">{ins.text}</span>
                    </div>
                  ));
                })()}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ===== RANKINGS ===== */}
        <TabsContent value="rankings" className="space-y-5 mt-4">
          {Object.entries(rankings).map(([key, data]) => {
            const meta: Record<string, { title: string; icon: any; field: keyof ClientAnalysis; format: (v: number) => string }> = {
              byScore: { title: "Top 10 por Score NatLeva", icon: Brain, field: "scoreNatLeva", format: (v) => `${v}` },
              byRevenue: { title: "Top 10 por Receita", icon: DollarSign, field: "totalRevenue", format: fmt },
              byProfit: { title: "Top 10 por Lucro", icon: TrendingUp, field: "totalProfit", format: fmt },
              byMargin: { title: "Top 10 por Margem (≥2 viagens)", icon: Target, field: "avgMargin", format: pct },
              byFrequency: { title: "Top 10 por Frequência (≥2 viagens)", icon: Activity, field: "frequency", format: (v) => `${v.toFixed(1)}/ano` },
              byTicket: { title: "Top 10 por Ticket Médio", icon: Award, field: "avgTicket", format: fmt },
              byLtv: { title: "Top 10 por LTV", icon: Zap, field: "ltv", format: fmt },
            };
            const t = meta[key]; if (!t) return null;
            const Icon = t.icon;
            return (
              <Card key={key} className="p-5 glass-card">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Icon className="w-4 h-4 text-primary" /> {t.title}</h3>
                <div className="space-y-1.5">
                  {data.map((c, i) => {
                    const val = c[t.field] as number;
                    const maxVal = (data[0]?.[t.field] as number) || 1;
                    const pctW = Math.max(5, (val / maxVal) * 100);
                    return (
                      <div key={c.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedClient(c)}>
                        <span className={`text-sm font-mono w-6 text-center ${i < 3 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                            <Badge variant="outline" className={`text-[9px] ${SEGMENTO_COLORS[c.segmento] || ""}`}>{c.segmentoEmoji} {c.segmento}</Badge>
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
              <Input placeholder="Buscar cliente, destino, cluster..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <select value={segmentoFilter} onChange={e => setSegmentoFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground">
              <option value="all">Todos Segmentos</option>
              {allSegmentos.map(s => <option key={s} value={s}>{s} ({analysisData.filter(c => c.segmento === s).length})</option>)}
            </select>
            <select value={clusterFilter} onChange={e => setClusterFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground">
              <option value="all">Todos Clusters</option>
              {allClusters.map(s => <option key={s} value={s}>{s} ({analysisData.filter(c => c.cluster === s).length})</option>)}
            </select>
          </div>

          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {([
                      ["name", "Nome"], ["scoreNatLeva", "Score"], ["segmento", "Segmento"], ["cluster", "Cluster"],
                      ["totalRevenue", "Receita"], ["totalProfit", "Lucro"], ["avgMargin", "Margem"],
                      ["totalTrips", "Viagens"], ["avgTicket", "Ticket"], ["ltv", "LTV"],
                      ["daysInactive", "Inativo"], ["topDestination", "Destino"],
                    ] as [keyof ClientAnalysis, string][]).map(([k, label]) => (
                      <th key={k} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                        onClick={() => toggleSort(k)}>
                        <span className="flex items-center gap-1">{label}{sortBy === k && (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(0, 100).map(c => (
                    <tr key={c.key} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedClient(c)}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground truncate max-w-[180px]">{c.name}</div>
                        {c.originCity && <div className="text-[10px] text-muted-foreground">{c.originCity}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${c.scoreNatLeva >= 70 ? "text-success" : c.scoreNatLeva >= 40 ? "text-warning" : "text-destructive"}`}>{c.scoreNatLeva}</span>
                          <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${c.scoreNatLeva >= 70 ? "bg-success" : c.scoreNatLeva >= 40 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${c.scoreNatLeva}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className={`text-[9px] ${SEGMENTO_COLORS[c.segmento] || ""}`}>{c.segmentoEmoji} {c.segmento}</Badge></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.clusterColor }} />
                          <span className="text-[10px] text-foreground truncate max-w-[100px]">{c.cluster}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-success whitespace-nowrap">{fmt(c.totalRevenue)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-primary whitespace-nowrap">{fmt(c.totalProfit)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{pct(c.avgMargin)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-center">{c.totalTrips}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{fmt(c.avgTicket)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-warning">{fmt(c.ltv)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-mono text-xs ${c.daysInactive > 180 ? "text-destructive font-semibold" : c.daysInactive > 90 ? "text-warning" : "text-muted-foreground"}`}>
                          {c.daysInactive < 9999 ? `${c.daysInactive}d` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs">{c.topDestination}</span></td>
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
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Ticket vs Margem (por Score)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="ticket" name="Ticket" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="number" dataKey="margin" name="Margem" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [name === "Ticket" ? fmt(v) : name === "Score" ? v : `${v.toFixed(1)}%`, name]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""} />
                  <Scatter data={crossData.scatterData} fill="hsl(var(--primary))" fillOpacity={0.5} name="Clientes" />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plane className="w-4 h-4 text-info" /> Região vs Margem</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={crossData.regionMarginData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="region" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Margem"]} />
                  <Bar dataKey="margin" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]}
                    onClick={(data) => openDrilldown(`Região: ${data.region}`, analysisData.filter(c => c.topRegion === data.region))}
                    className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-warning" /> LTV por Faixa</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={crossData.ltvBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Clientes"
                    onClick={(data) => {
                      const bucket = crossData.ltvBuckets.find(b => b.name === data.name);
                      if (bucket) openDrilldown(`LTV: ${bucket.name}`, analysisData.filter(c => c.ltv >= bucket.min && c.ltv < bucket.max && c.totalTrips > 0));
                    }} className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Insights Automáticos</h3>
              <div className="space-y-2">
                {(() => {
                  const insights: { text: string; color: string }[] = [];
                  const vips = analysisData.filter(c => c.segmento === "VIP Elite" || c.segmento === "VIP Premium");
                  if (vips.length > 0 && kpis.totalRevenue > 0) {
                    const vipRev = vips.reduce((a, c) => a + c.totalRevenue, 0);
                    insights.push({ text: `${vips.length} VIPs geram ${((vipRev / kpis.totalRevenue) * 100).toFixed(0)}% da receita`, color: "text-primary" });
                  }
                  const top = rankings.byScore[0];
                  if (top) insights.push({ text: `"${top.name}" é o #1 com Score ${top.scoreNatLeva}: ${fmt(top.totalRevenue)} em ${top.totalTrips} viagens`, color: "text-success" });
                  const lowMarginHighTicket = analysisData.filter(c => c.avgTicket > kpis.avgTicket * 1.5 && c.avgMargin < 10);
                  if (lowMarginHighTicket.length > 0) insights.push({ text: `${lowMarginHighTicket.length} clientes com ticket alto e margem <10% — oportunidade de otimização`, color: "text-warning" });
                  const growing = analysisData.filter(c => c.scorePotencial === 100 && c.totalTrips >= 2);
                  if (growing.length > 0) insights.push({ text: `${growing.length} clientes em tendência de crescimento — momento ideal para upsell`, color: "text-info" });
                  return insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                      <Star className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${ins.color}`} />
                      <span className="text-xs text-foreground leading-relaxed">{ins.text}</span>
                    </div>
                  ));
                })()}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ===== IA ESTRATÉGICA ===== */}
        <TabsContent value="ai" className="space-y-5 mt-4">
          <Card className="glass-card p-0 flex flex-col" style={{ height: "calc(100vh - 260px)", minHeight: 500 }}>
            {/* Header */}
            <div className="p-4 border-b border-border/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">IA Estratégica NatLeva</h3>
                <p className="text-xs text-muted-foreground">Consultor de gestão com acesso à sua carteira de {kpis.totalClients} clientes</p>
              </div>
              {chatMessages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setChatMessages([])}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Nova conversa
                </Button>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && !chatLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground mb-1">Converse com sua IA estratégica</h4>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    Pergunte qualquer coisa sobre sua carteira de clientes. A IA tem acesso a todos os dados de vendas, segmentação, churn e métricas.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                    {[
                      "Monte um plano estratégico completo de 90 dias para minha carteira",
                      "Quais clientes estão em risco de churn e o que fazer?",
                      "Crie um programa de fidelidade com níveis e presentes por LTV",
                      "Quais estratégias para criar senso de comunidade entre meus clientes VIP?",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendChatMessage(suggestion)}
                        className="text-left text-xs p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Lightbulb className="w-3 h-3 inline mr-1.5 text-warning" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 mt-1">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : "bg-muted/50 border border-border/30 rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none
                        prose-headings:text-foreground prose-h2:text-base prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-2 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-1
                        prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1
                        prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-sm
                        prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:text-sm
                        prose-strong:text-foreground
                        prose-ul:my-1 prose-ol:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted/50 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analisando dados...
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-border/40">
              <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pergunte sobre sua carteira, peça planos, estratégias..."
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={chatLoading || !chatInput.trim()} size="icon"
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </Card>
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
                <span>Receita: <strong className="text-foreground">{fmt(drilldown.clients.reduce((a, c) => a + c.totalRevenue, 0))}</strong></span>
                <span>LTV: <strong className="text-foreground">{fmt(drilldown.clients.reduce((a, c) => a + c.ltv, 0))}</strong></span>
                <span>Score médio: <strong className="text-foreground">{drilldown.clients.length > 0 ? Math.round(drilldown.clients.reduce((a, c) => a + c.scoreNatLeva, 0) / drilldown.clients.length) : 0}</strong></span>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">#</TableHead><TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Segmento</TableHead><TableHead className="text-xs text-right">Receita</TableHead>
                  <TableHead className="text-xs text-right">Score</TableHead><TableHead className="text-xs text-right">LTV</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {drilldown.clients.slice(0, 100).map((c, i) => (
                    <TableRow key={c.key} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrilldown(null); setSelectedClient(c); }}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{c.name}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[9px] ${SEGMENTO_COLORS[c.segmento] || ""}`}>{c.segmentoEmoji} {c.segmento}</Badge></TableCell>
                      <TableCell className="text-xs text-right font-mono text-success">{fmt(c.totalRevenue)}</TableCell>
                      <TableCell className="text-xs text-right"><span className={`font-bold ${c.scoreNatLeva >= 70 ? "text-success" : c.scoreNatLeva >= 40 ? "text-warning" : "text-destructive"}`}>{c.scoreNatLeva}</span></TableCell>
                      <TableCell className="text-xs text-right font-mono text-warning">{fmt(c.ltv)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== CLIENT 360° PROFILE DIALOG ===== */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedClient && <ClientProfile360 client={selectedClient} onNavigate={(id) => { setSelectedClient(null); navigate(`/sales/${id}`); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Client 360° Profile Component ───

function ClientProfile360({ client, onNavigate }: { client: ClientAnalysis; onNavigate: (saleId: string) => void }) {
  const recommendations = useMemo(() => generateRecommendations(client), [client]);

  const scoreBreakdown = [
    { label: "Valor", value: client.scoreValor, weight: "25%" },
    { label: "Lucratividade", value: client.scoreLucratividade, weight: "25%" },
    { label: "Frequência", value: client.scoreFrequencia, weight: "20%" },
    { label: "Recência", value: client.scoreRecencia, weight: "15%" },
    { label: "Potencial", value: client.scorePotencial, weight: "15%" },
  ];

  const radarData = scoreBreakdown.map(s => ({ subject: s.label, score: s.value }));

  // Revenue by year
  const revenueByYear: Record<string, number> = {};
  client.sales.forEach(s => {
    const d = s.close_date || s.created_at;
    if (d) { const y = new Date(d).getFullYear().toString(); revenueByYear[y] = (revenueByYear[y] || 0) + (s.received_value || 0); }
  });
  const yearData = Object.entries(revenueByYear).sort((a, b) => a[0].localeCompare(b[0])).map(([y, v]) => ({ year: y, receita: v }));

  // Region distribution
  const regionData = Object.entries(client.regionMap).map(([r, v]) => ({ name: r, value: v })).sort((a, b) => b.value - a.value);

  const probColors = { alta: "text-success", média: "text-warning", baixa: "text-destructive" };
  const probBg = { alta: "bg-success/10", média: "bg-warning/10", baixa: "bg-destructive/10" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span>{client.segmentoEmoji}</span> {client.name}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${SEGMENTO_COLORS[client.segmento] || ""}`}>{client.segmento}</Badge>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: client.clusterColor }} />
              <span className="text-[10px] text-muted-foreground">{client.cluster}</span>
            </div>
            {client.originCity && <span className="text-[10px] text-muted-foreground">📍 {client.originCity}</span>}
          </div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold ${client.scoreNatLeva >= 70 ? "text-success" : client.scoreNatLeva >= 40 ? "text-warning" : "text-destructive"}`}>
            {client.scoreNatLeva}
          </div>
          <div className="text-[10px] text-muted-foreground">Score NatLeva</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
        {[
          { label: "Receita Total", value: fmt(client.totalRevenue) },
          { label: "Lucro Total", value: fmt(client.totalProfit) },
          { label: "Margem Média", value: pct(client.avgMargin) },
          { label: "Ticket Médio", value: fmt(client.avgTicket) },
          { label: "Viagens", value: client.totalTrips.toString() },
          { label: "Frequência", value: `${client.frequency.toFixed(1)}/ano` },
          { label: "LTV", value: fmt(client.ltv) },
          { label: "Primeira Viagem", value: client.firstTrip || "—" },
          { label: "Última Viagem", value: client.lastTrip || "—" },
          { label: "Próxima", value: client.nextTrip || "—" },
          { label: "Mais Cara", value: fmt(client.mostExpensiveTrip) },
          { label: "Mais Barata", value: fmt(client.cheapestTrip) },
          { label: "Destino Fav.", value: client.topDestination },
          { label: "Região Fav.", value: client.topRegion },
        ].map(k => (
          <div key={k.label} className="p-2 rounded-lg bg-muted/30 border border-border/30">
            <div className="text-[9px] text-muted-foreground uppercase">{k.label}</div>
            <div className="text-xs font-semibold text-foreground mt-0.5 truncate">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Score Breakdown + Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-primary" /> Breakdown Score NatLeva</h4>
          <div className="space-y-2">
            {scoreBreakdown.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-20">{s.label} ({s.weight})</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${s.value >= 70 ? "bg-success" : s.value >= 40 ? "bg-warning" : "bg-destructive"}`}
                    style={{ width: `${s.value}%` }} />
                </div>
                <span className="text-xs font-bold text-foreground w-8 text-right">{Math.round(s.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="text-xs font-semibold mb-2">Radar de Performance</h4>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {yearData.length > 1 && (
          <Card className="p-4">
            <h4 className="text-xs font-semibold mb-2">Evolução de Receita Anual</h4>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={yearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [fmt(v), "Receita"]} />
                <Area type="monotone" dataKey="receita" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {regionData.length > 0 && (
          <Card className="p-4">
            <h4 className="text-xs font-semibold mb-2">Distribuição por Região</h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={regionData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="p-4 border-primary/20">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-warning" /> Recomendações Estratégicas</h4>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className={`p-3 rounded-lg border border-border/30 ${probBg[rec.probability]}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground">{rec.title}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px]">{rec.type}</Badge>
                    <span className={`text-[10px] font-semibold ${probColors[rec.probability]}`}>{rec.probability.toUpperCase()}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{rec.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sales History */}
      <Card className="p-4">
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-info" /> Histórico de Viagens ({client.totalTrips})</h4>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {client.sales.sort((a, b) => (b.departure_date || b.created_at).localeCompare(a.departure_date || a.created_at)).map(s => (
            <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-xs"
              onClick={() => onNavigate(s.id)}>
              <Plane className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="font-mono text-muted-foreground">{s.origin_iata || "?"} → {s.destination_iata || "?"}</span>
              <span className="text-muted-foreground">{s.departure_date || "—"}</span>
              <span className="ml-auto font-mono text-success">{fmt(s.received_value || 0)}</span>
              <span className="font-mono text-primary">{pct(s.margin || 0)}</span>
              <Eye className="w-3 h-3 text-muted-foreground" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
