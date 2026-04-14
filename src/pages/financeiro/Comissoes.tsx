import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2, UserCheck, Users, TrendingUp, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { fetchAllRows } from "@/lib/fetchAll";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COMMISSION_AGENCIA = 0.15;
const COMMISSION_ORGANICO = 0.30;

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

  const { data: allSales = [] } = useQuery({
    queryKey: ["com-sales-v2"],
    queryFn: async () => {
      const data = await fetchAllRows("sales", "id, display_id, name, seller_id, received_value, total_cost, profit, lead_type, close_date, status");
      return data || [];
    },
  });

  // Filter by period
  const sales = useMemo(() => {
    return allSales.filter((s: any) => {
      const d = s.close_date;
      if (!d) return false;
      return d >= periodFrom && d <= periodTo;
    });
  }, [allSales, periodFrom, periodTo]);

  // Calculate commissions per seller
  const sellerData = useMemo(() => {
    const map: Record<string, {
      name: string;
      salesAgencia: any[];
      salesOrganico: any[];
      lucroAgencia: number;
      lucroOrganico: number;
      comissaoAgencia: number;
      comissaoOrganico: number;
    }> = {};

    sales.forEach((s: any) => {
      const sid = s.seller_id;
      if (!sid) return;
      const profile = profiles.find((p: any) => p.id === sid);
      if (!map[sid]) map[sid] = {
        name: profile?.full_name || "Sem nome",
        salesAgencia: [], salesOrganico: [],
        lucroAgencia: 0, lucroOrganico: 0,
        comissaoAgencia: 0, comissaoOrganico: 0,
      };

      const lucro = Math.max(0, s.profit || 0);
      const isOrganico = s.lead_type === "organico";

      if (isOrganico) {
        map[sid].salesOrganico.push(s);
        map[sid].lucroOrganico += lucro;
        map[sid].comissaoOrganico += lucro * COMMISSION_ORGANICO;
      } else {
        map[sid].salesAgencia.push(s);
        map[sid].lucroAgencia += lucro;
        map[sid].comissaoAgencia += lucro * COMMISSION_AGENCIA;
      }
    });

    return Object.entries(map)
      .map(([id, d]) => ({ id, ...d, totalComissao: d.comissaoAgencia + d.comissaoOrganico, totalVendas: d.salesAgencia.length + d.salesOrganico.length }))
      .sort((a, b) => b.totalComissao - a.totalComissao);
  }, [sales, profiles]);

  const totals = useMemo(() => ({
    comissao: sellerData.reduce((s, d) => s + d.totalComissao, 0),
    comissaoAgencia: sellerData.reduce((s, d) => s + d.comissaoAgencia, 0),
    comissaoOrganico: sellerData.reduce((s, d) => s + d.comissaoOrganico, 0),
    vendas: sellerData.reduce((s, d) => s + d.totalVendas, 0),
  }), [sellerData]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Comissões</h1>
          <p className="text-sm text-muted-foreground">Cálculo automático: Agência 15% · Orgânico 30% sobre o lucro</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="w-36 text-xs" />
          <span className="text-muted-foreground text-xs">até</span>
          <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="w-36 text-xs" />
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
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Comissão Agência</span>
          </div>
          <p className="text-lg font-bold text-foreground">{fmt(totals.comissaoAgencia)}</p>
          <p className="text-[10px] text-muted-foreground">15% sobre o lucro</p>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5 text-success" />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Comissão Orgânico</span>
          </div>
          <p className="text-lg font-bold text-foreground">{fmt(totals.comissaoOrganico)}</p>
          <p className="text-[10px] text-muted-foreground">30% sobre o lucro</p>
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
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">Comissões por Vendedor</h3></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-8"></TableHead>
              <TableHead className="text-xs">Vendedor</TableHead>
              <TableHead className="text-xs text-center">Vendas Agência</TableHead>
              <TableHead className="text-xs text-center">Vendas Orgânico</TableHead>
              <TableHead className="text-xs text-right">Lucro Agência</TableHead>
              <TableHead className="text-xs text-right">Lucro Orgânico</TableHead>
              <TableHead className="text-xs text-right">Comissão Agência</TableHead>
              <TableHead className="text-xs text-right">Comissão Orgânico</TableHead>
              <TableHead className="text-xs text-right font-bold">Total Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellerData.map(d => (
              <>
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setExpandedSeller(expandedSeller === d.id ? null : d.id)}>
                  <TableCell className="text-xs w-8">
                    {expandedSeller === d.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </TableCell>
                  <TableCell className="text-xs font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" /> {d.name}
                  </TableCell>
                  <TableCell className="text-xs text-center">{d.salesAgencia.length}</TableCell>
                  <TableCell className="text-xs text-center">{d.salesOrganico.length}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(d.lucroAgencia)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(d.lucroOrganico)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(d.comissaoAgencia)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(d.comissaoOrganico)}</TableCell>
                  <TableCell className="text-xs text-right font-bold text-success font-mono">{fmt(d.totalComissao)}</TableCell>
                </TableRow>
                {expandedSeller === d.id && (
                  [...d.salesAgencia.map((s: any) => ({ ...s, _tipo: "agencia" })), ...d.salesOrganico.map((s: any) => ({ ...s, _tipo: "organico" }))].map((s: any) => {
                    const lucro = Math.max(0, s.profit || 0);
                    const pct = s._tipo === "organico" ? COMMISSION_ORGANICO : COMMISSION_AGENCIA;
                    return (
                      <TableRow key={s.id} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell className="text-[11px] text-muted-foreground pl-10" colSpan={2}>
                          {s.display_id} — {s.name}
                        </TableCell>
                        <TableCell className="text-[11px] text-center">
                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                            s._tipo === "organico" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                          )}>
                            {s._tipo === "organico" ? <UserCheck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                            {s._tipo === "organico" ? "Orgânico" : "Agência"}
                          </span>
                        </TableCell>
                        <TableCell className="text-[11px] text-right font-mono" colSpan={2}>{fmt(lucro)}</TableCell>
                        <TableCell className="text-[11px] text-right text-muted-foreground" colSpan={2}>{(pct * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-[11px] text-right font-mono text-success">{fmt(lucro * pct)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </>
            ))}
            {sellerData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8 text-sm">
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
