import { useState, useEffect, useMemo } from "react";
import { fetchAllRows } from "@/lib/fetchAll";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertTriangle, CheckCircle, Search, Loader2, Sparkles, Users,
  ShoppingCart, FileWarning, RefreshCw, TrendingUp, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PendingItem {
  id: string;
  name: string;
  type: "passenger" | "sale";
  missingFields: string[];
  score: number;
}

function calcScore(obj: any, requiredFields: string[]): number {
  let filled = 0;
  for (const f of requiredFields) {
    const v = obj[f];
    if (v && v !== "atualizar campo" && v !== "" && v !== null) filled++;
  }
  return Math.round((filled / requiredFields.length) * 100);
}

const PAX_REQUIRED = ["full_name", "phone", "cpf", "birth_date", "address_city"];
const PAX_LABELS: Record<string, string> = {
  full_name: "Nome",
  phone: "Telefone",
  cpf: "CPF",
  birth_date: "Data Nasc.",
  passport_number: "Passaporte",
  address_city: "Cidade",
};

const SALE_REQUIRED = ["name", "payment_method", "close_date", "received_value", "departure_date", "return_date", "origin_city", "destination_city", "origin_iata", "destination_iata"];
const SALE_LABELS: Record<string, string> = {
  name: "Nome Cliente",
  payment_method: "Pagamento",
  close_date: "Data Fechamento",
  received_value: "Valor",
  departure_date: "Data Ida",
  return_date: "Data Volta",
  origin_city: "Origem",
  destination_city: "Destino",
  origin_iata: "IATA Origem",
  destination_iata: "IATA Destino",
};

export default function Pendencias() {
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pax, sal] = await Promise.all([
        fetchAllRows("passengers", "*"),
        fetchAllRows("sales", "*"),
      ]);
      setPassengers(pax);
      setSales(sal);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke("data-cleanup");
      if (error) throw error;
      toast({
        title: "Limpeza concluída!",
        description: `${data.paxDuplicatesMerged} duplicados mesclados, ${data.salesStatusFixed} status corrigidos, ${data.linksFixed} vínculos corrigidos`,
      });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro na limpeza", description: err.message, variant: "destructive" });
    }
    setCleaning(false);
  };

  const pendingItems = useMemo(() => {
    const items: PendingItem[] = [];

    for (const p of passengers) {
      const missing: string[] = [];
      for (const f of PAX_REQUIRED) {
        const v = p[f];
        if (!v || v === "atualizar campo" || v === "") {
          missing.push(PAX_LABELS[f] || f);
        }
      }
      // Also check passport or birth_date
      if (!p.birth_date && !p.passport_number) {
        if (!missing.includes("Data Nasc.")) missing.push("Data Nasc. ou Passaporte");
      }
      const score = calcScore(p, PAX_REQUIRED);
      if (missing.length > 0 || score < 100) {
        items.push({ id: p.id, name: p.full_name, type: "passenger", missingFields: missing, score });
      }
    }

    for (const s of sales) {
      const missing: string[] = [];
      for (const f of SALE_REQUIRED) {
        const v = s[f];
        if (!v || v === "atualizar campo" || v === "" || v === 0) {
          // Don't flag if alternative exists
          if (f === "origin_city" && s.origin_iata) continue;
          if (f === "destination_city" && s.destination_iata) continue;
          if (f === "origin_iata" && s.origin_city) continue;
          if (f === "destination_iata" && s.destination_city) continue;
          missing.push(SALE_LABELS[f] || f);
        }
      }
      const score = calcScore(s, SALE_REQUIRED);
      if (missing.length > 0 || score < 100) {
        items.push({ id: s.id, name: `${s.display_id} - ${s.name}`, type: "sale", missingFields: missing, score });
      }
    }

    return items.sort((a, b) => a.score - b.score);
  }, [passengers, sales]);

  const filtered = useMemo(() => {
    let result = pendingItems;
    if (tab === "passengers") result = result.filter(i => i.type === "passenger");
    if (tab === "sales") result = result.filter(i => i.type === "sale");
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }
    if (scoreFilter === "critical") result = result.filter(i => i.score < 40);
    if (scoreFilter === "low") result = result.filter(i => i.score < 70);
    if (scoreFilter === "medium") result = result.filter(i => i.score >= 70 && i.score < 100);
    return result;
  }, [pendingItems, tab, search, scoreFilter]);

  // Stats
  const totalPax = passengers.length;
  const totalSales = sales.length;
  const paxPending = pendingItems.filter(i => i.type === "passenger").length;
  const salesPending = pendingItems.filter(i => i.type === "sale").length;
  const avgPaxScore = totalPax > 0 ? Math.round(passengers.reduce((sum, p) => sum + calcScore(p, PAX_REQUIRED), 0) / totalPax) : 0;
  const avgSaleScore = totalSales > 0 ? Math.round(sales.reduce((sum, s) => sum + calcScore(s, SALE_REQUIRED), 0) / totalSales) : 0;
  const criticalCount = pendingItems.filter(i => i.score < 40).length;

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning-foreground";
    return "text-destructive";
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return "bg-success/20";
    if (score >= 50) return "bg-warning/20";
    return "bg-destructive/20";
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Central de Pendências</h1>
          <p className="text-sm text-muted-foreground">Monitore a qualidade dos dados e campos pendentes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={handleCleanup} disabled={cleaning} className="bg-primary">
            {cleaning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Limpar e Padronizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Passageiros</span>
          </div>
          <p className="text-xl font-bold text-foreground">{totalPax}</p>
          <p className="text-[10px] text-muted-foreground">{paxPending} com pendências</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Vendas</span>
          </div>
          <p className="text-xl font-bold text-foreground">{totalSales}</p>
          <p className="text-[10px] text-muted-foreground">{salesPending} com pendências</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Score Pax</span>
          </div>
          <p className={`text-xl font-bold ${scoreColor(avgPaxScore)}`}>{avgPaxScore}%</p>
          <Progress value={avgPaxScore} className="h-1.5 mt-1" />
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Score Vendas</span>
          </div>
          <p className={`text-xl font-bold ${scoreColor(avgSaleScore)}`}>{avgSaleScore}%</p>
          <Progress value={avgSaleScore} className="h-1.5 mt-1" />
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Críticos</span>
          </div>
          <p className="text-xl font-bold text-destructive">{criticalCount}</p>
          <p className="text-[10px] text-muted-foreground">Score &lt; 40%</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Completos</span>
          </div>
          <p className="text-xl font-bold text-success">
            {totalPax + totalSales - pendingItems.length}
          </p>
          <p className="text-[10px] text-muted-foreground">100% preenchidos</p>
        </Card>
      </div>

      <div className="glow-line" />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos scores</SelectItem>
            <SelectItem value="critical">Críticos (&lt;40%)</SelectItem>
            <SelectItem value="low">Baixos (&lt;70%)</SelectItem>
            <SelectItem value="medium">Médios (70-99%)</SelectItem>
          </SelectContent>
        </Select>
        {(search || scoreFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setScoreFilter("all"); }}>
            <X className="w-3.5 h-3.5 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Tabs + List */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            Todos <Badge variant="secondary" className="ml-1.5 text-[10px]">{pendingItems.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="passengers">
            Passageiros <Badge variant="secondary" className="ml-1.5 text-[10px]">{paxPending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sales">
            Vendas <Badge variant="secondary" className="ml-1.5 text-[10px]">{salesPending}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Analisando dados...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle className="w-10 h-10 text-success mx-auto" />
              <p className="text-muted-foreground font-medium">Tudo limpo!</p>
              <p className="text-sm text-muted-foreground">Nenhuma pendência encontrada com os filtros aplicados.</p>
            </div>
          ) : (
            <Card className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Score</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nome</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Campos Pendentes</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 200).map((item) => (
                      <tr key={`${item.type}-${item.id}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${scoreBg(item.score)} ${scoreColor(item.score)}`}>
                              {item.score}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {item.type === "passenger" ? (
                              <><Users className="w-3 h-3 mr-1" /> Pax</>
                            ) : (
                              <><ShoppingCart className="w-3 h-3 mr-1" /> Venda</>
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[250px] truncate">
                          {item.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.missingFields.slice(0, 4).map((f) => (
                              <Badge key={f} variant="destructive" className="text-[10px] font-normal">
                                <FileWarning className="w-2.5 h-2.5 mr-0.5" /> {f}
                              </Badge>
                            ))}
                            {item.missingFields.length > 4 && (
                              <Badge variant="secondary" className="text-[10px]">
                                +{item.missingFields.length - 4}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (item.type === "sale") navigate(`/sales/${item.id}`);
                            }}
                          >
                            {item.type === "sale" ? "Abrir" : ""}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > 200 && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
                  Mostrando 200 de {filtered.length} itens. Use os filtros para refinar.
                </div>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
