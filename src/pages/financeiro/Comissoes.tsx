import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2, UserCheck, Users, DollarSign, ChevronDown, ChevronRight, Layers, Settings2 } from "lucide-react";
import { fetchAllRows } from "@/lib/fetchAll";
import { cn } from "@/lib/utils";
import {
  parseCommissionRules,
  computeProgressiveCommission,
  computeDefaultCommission,
  DEFAULT_COMMISSION_AGENCIA,
  DEFAULT_COMMISSION_ORGANICO,
  type CommissionRules,
} from "@/lib/commissionRules";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Comissoes() {
  const [periodFrom, setPeriodFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [periodTo, setPeriodTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["com-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    },
  });

  // Carrega regras de comissão da tabela employees (vinculada via user_id -> profiles.id)
  const { data: employees = [] } = useQuery({
    queryKey: ["com-employees-rules"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("employees")
        .select("id, user_id, full_name, commission_rules");
      return data || [];
    },
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ["com-sales-v2"],
    queryFn: async () => {
      const data = await fetchAllRows(
        "sales",
        "id, display_id, name, seller_id, received_value, total_cost, profit, lead_type, close_date, status"
      );
      return data || [];
    },
  });

  const sales = useMemo(() => {
    return allSales.filter((s: any) => {
      const d = s.close_date;
      if (!d) return false;
      return d >= periodFrom && d <= periodTo;
    });
  }, [allSales, periodFrom, periodTo]);

  // Lucro consolidado da empresa no período (usado em regras com base="company")
  const companyTotalProfit = useMemo(
    () => sales.reduce((acc: number, s: any) => acc + Math.max(0, Number(s.profit) || 0), 0),
    [sales]
  );

  // Mapeia user_id -> commission_rules
  const rulesByUser = useMemo(() => {
    const m = new Map<string, CommissionRules>();
    employees.forEach((e: any) => {
      if (e.user_id) m.set(e.user_id, parseCommissionRules(e.commission_rules));
    });
    return m;
  }, [employees]);

  // Calcula comissão por vendedor com regra individual
  const sellerData = useMemo(() => {
    type SellerRow = {
      id: string;
      name: string;
      rules: CommissionRules;
      sales: any[];
      lucroIndividual: number;
      comissao: number;
      breakdown: string;
    };
    const map: Record<string, SellerRow> = {};

    sales.forEach((s: any) => {
      const sid = s.seller_id;
      if (!sid) return;
      if (!map[sid]) {
        const profile = profiles.find((p: any) => p.id === sid);
        map[sid] = {
          id: sid,
          name: profile?.full_name || "Sem nome",
          rules: rulesByUser.get(sid) || { mode: "default", base: "individual", tiers: [] },
          sales: [],
          lucroIndividual: 0,
          comissao: 0,
          breakdown: "",
        };
      }
      map[sid].sales.push(s);
      map[sid].lucroIndividual += Math.max(0, Number(s.profit) || 0);
    });

    Object.values(map).forEach((row) => {
      if (row.rules.mode === "tiers" && row.rules.tiers.length > 0) {
        const base = row.rules.base === "company" ? companyTotalProfit : row.lucroIndividual;
        row.comissao = computeProgressiveCommission(base, row.rules.tiers);
        row.breakdown = `Faixas (${row.rules.base === "company" ? "empresa" : "individual"}) sobre ${fmt(base)}`;
      } else {
        const r = computeDefaultCommission(row.sales);
        row.comissao = r.total;
        row.breakdown = `${(DEFAULT_COMMISSION_AGENCIA * 100).toFixed(0)}% agência + ${(DEFAULT_COMMISSION_ORGANICO * 100).toFixed(0)}% orgânico`;
      }
    });

    return Object.values(map).sort((a, b) => b.comissao - a.comissao);
  }, [sales, profiles, rulesByUser, companyTotalProfit]);

  const totals = useMemo(
    () => ({
      comissao: sellerData.reduce((s, d) => s + d.comissao, 0),
      vendas: sellerData.reduce((s, d) => s + d.sales.length, 0),
      lucroEmpresa: companyTotalProfit,
    }),
    [sellerData, companyTotalProfit]
  );

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Padrão: {(DEFAULT_COMMISSION_AGENCIA * 100).toFixed(0)}% agência · {(DEFAULT_COMMISSION_ORGANICO * 100).toFixed(0)}% orgânico ·
            colaboradores com faixas progressivas usam regra própria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="w-36 text-xs" />
          <span className="text-muted-foreground text-xs">até</span>
          <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="w-36 text-xs" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Comissão Total</span>
          </div>
          <p className="text-lg font-bold text-foreground">{fmt(totals.comissao)}</p>
          <p className="text-[10px] text-muted-foreground">{totals.vendas} vendas no período</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Lucro da Empresa</span>
          </div>
          <p className="text-lg font-bold text-foreground">{fmt(totals.lucroEmpresa)}</p>
          <p className="text-[10px] text-muted-foreground">base p/ regras "empresa"</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-success" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Com Faixas</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {sellerData.filter((d) => d.rules.mode === "tiers").length}
          </p>
          <p className="text-[10px] text-muted-foreground">colaboradores com regra customizada</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendedores</span>
          </div>
          <p className="text-lg font-bold text-foreground">{sellerData.length}</p>
          <p className="text-[10px] text-muted-foreground">com vendas no período</p>
        </Card>
      </div>

      {/* Table per seller */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Comissões por Vendedor</h3>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Settings2 className="w-3 h-3" /> Configurável em RH → Colaboradores → Remuneração
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-8"></TableHead>
              <TableHead className="text-xs">Vendedor</TableHead>
              <TableHead className="text-xs">Regra</TableHead>
              <TableHead className="text-xs text-center">Vendas</TableHead>
              <TableHead className="text-xs text-right">Lucro Individual</TableHead>
              <TableHead className="text-xs text-right font-bold">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellerData.map((d) => (
              <>
                <TableRow
                  key={d.id}
                  className="cursor-pointer"
                  onClick={() => setExpandedSeller(expandedSeller === d.id ? null : d.id)}
                >
                  <TableCell className="text-xs w-8">
                    {expandedSeller === d.id ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" /> {d.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {d.rules.mode === "tiers" ? (
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1">
                        <Layers className="w-3 h-3" /> {d.rules.tiers.length} faixa(s) ·{" "}
                        {d.rules.base === "company" ? "empresa" : "individual"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Padrão {(DEFAULT_COMMISSION_AGENCIA * 100).toFixed(0)}/{(DEFAULT_COMMISSION_ORGANICO * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-center">{d.sales.length}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(d.lucroIndividual)}</TableCell>
                  <TableCell className="text-xs text-right font-bold text-success font-mono">
                    {fmt(d.comissao)}
                  </TableCell>
                </TableRow>
                {expandedSeller === d.id && (
                  <TableRow className="bg-muted/20">
                    <TableCell></TableCell>
                    <TableCell colSpan={5} className="text-[11px] text-muted-foreground py-2">
                      <span className="font-medium">Cálculo:</span> {d.breakdown}
                      {d.rules.mode === "tiers" && d.rules.tiers.length > 0 && (
                        <span className="ml-2">
                          ({d.rules.tiers
                            .map(
                              (t, i) =>
                                `até ${t.up_to === null ? "∞" : fmt(t.up_to)} = ${t.percent}%`
                            )
                            .join(" · ")})
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )}
                {expandedSeller === d.id &&
                  d.sales.map((s: any) => {
                    const lucro = Math.max(0, s.profit || 0);
                    return (
                      <TableRow key={s.id} className="bg-muted/10">
                        <TableCell></TableCell>
                        <TableCell className="text-[11px] text-muted-foreground pl-10" colSpan={2}>
                          {s.display_id} — {s.name}
                        </TableCell>
                        <TableCell className="text-[11px] text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                              s.lead_type === "organico"
                                ? "bg-success/10 text-success"
                                : "bg-accent/10 text-accent"
                            )}
                          >
                            {s.lead_type === "organico" ? (
                              <UserCheck className="w-3 h-3" />
                            ) : (
                              <Building2 className="w-3 h-3" />
                            )}
                            {s.lead_type === "organico" ? "Orgânico" : "Agência"}
                          </span>
                        </TableCell>
                        <TableCell className="text-[11px] text-right font-mono" colSpan={2}>
                          {fmt(lucro)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </>
            ))}
            {sellerData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                  Nenhuma venda com lucro positivo no período selecionado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
