import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchAllRows } from "@/lib/fetchAll";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v.toFixed(1)}%`;

export default function DREReport() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("current");
  const [drilldown, setDrilldown] = useState<{ label: string; items: any[] } | null>(null);

  const { data: sales = [] } = useQuery({
    queryKey: ["dre-sales"],
    queryFn: async () => {
      const data = await fetchAllRows("sales", "*", { order: { column: "created_at", ascending: false } });
      return data || [];
    },
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["dre-payables"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_payable").select("*");
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const now = new Date();
    return sales.filter((s: any) => {
      const d = new Date(s.created_at);
      if (period === "current") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === "last") {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      }
      if (period === "quarter") {
        const q = Math.floor(now.getMonth() / 3);
        return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
      }
      if (period === "year") return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [sales, period]);

  const receitaBruta = filtered.reduce((s: number, v: any) => s + (v.received_value || 0), 0);
  const custosDiretos = filtered.reduce((s: number, v: any) => s + (v.total_cost || 0), 0);
  const lucroBruto = receitaBruta - custosDiretos;
  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;

  const despesasOp = payables
    .filter((p: any) => !p.sale_id)
    .reduce((s: number, p: any) => s + (p.value || 0), 0);
  const lucroOperacional = lucroBruto - despesasOp;
  const margemOp = receitaBruta > 0 ? (lucroOperacional / receitaBruta) * 100 : 0;

  // Audit section
  const semCusto = filtered.filter((s: any) => !s.total_cost || s.total_cost === 0);
  const semRecebimento = filtered.filter((s: any) => !s.received_value || s.received_value === 0);
  const margemBaixa = filtered.filter((s: any) => s.received_value > 0 && ((s.received_value - (s.total_cost || 0)) / s.received_value) * 100 < 10);

  const dreLines = [
    { label: "Receita Bruta", value: receitaBruta, pct: 100, items: filtered, bold: true, color: "text-emerald-500" },
    { label: "(-) Custos Diretos", value: -custosDiretos, pct: receitaBruta > 0 ? (custosDiretos / receitaBruta) * 100 : 0, items: filtered, color: "text-red-400" },
    { label: "(=) Lucro Bruto", value: lucroBruto, pct: margemBruta, items: filtered, bold: true, color: lucroBruto >= 0 ? "text-emerald-500" : "text-red-500", separator: true },
    { label: "(-) Despesas Operacionais", value: -despesasOp, pct: receitaBruta > 0 ? (despesasOp / receitaBruta) * 100 : 0, items: payables.filter((p: any) => !p.sale_id), color: "text-red-400" },
    { label: "(=) Lucro Operacional", value: lucroOperacional, pct: margemOp, items: filtered, bold: true, color: lucroOperacional >= 0 ? "text-emerald-500" : "text-red-500", separator: true },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">DRE — Demonstrativo de Resultado</h1>
          <p className="text-sm text-muted-foreground">Análise de rentabilidade</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês Atual</SelectItem>
            <SelectItem value="last">Mês Anterior</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
            <SelectItem value="year">Ano</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DRE Table */}
      <Card className="glass-card overflow-hidden">
        <div className="p-5">
          <div className="space-y-1">
            {dreLines.map((line, i) => (
              <div key={i}>
                {line.separator && <div className="border-t border-border my-2" />}
                <button
                  onClick={() => setDrilldown({ label: line.label, items: line.items })}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors ${line.bold ? 'bg-muted/30' : ''}`}
                >
                  <span className={`text-sm ${line.bold ? 'font-bold' : ''}`}>{line.label}</span>
                  <div className="flex items-center gap-6">
                    <span className={`text-sm font-mono ${line.color} ${line.bold ? 'font-bold text-base' : ''}`}>
                      {fmt(Math.abs(line.value))}
                    </span>
                    <span className="text-xs text-muted-foreground w-16 text-right font-mono">
                      {pct(line.pct)}
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Audit */}
      <Card className="p-5 glass-card">
        <h3 className="text-sm font-semibold mb-4">Auditoria</h3>
        <div className="space-y-2">
          {[
            { label: "Vendas sem custo", count: semCusto.length, items: semCusto, type: semCusto.length > 0 ? "warn" : "ok" },
            { label: "Vendas sem recebimento", count: semRecebimento.length, items: semRecebimento, type: semRecebimento.length > 0 ? "warn" : "ok" },
            { label: "Vendas com margem < 10%", count: margemBaixa.length, items: margemBaixa, type: margemBaixa.length > 0 ? "warn" : "ok" },
          ].map((a, i) => (
            <button
              key={i}
              onClick={() => a.count > 0 && setDrilldown({ label: a.label, items: a.items })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${a.type === 'warn' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400'}`}
            >
              <span>{a.label}</span>
              <span className="font-mono font-bold">{a.count}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Drill-down */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.label} — {drilldown?.items.length} itens</DialogTitle>
          </DialogHeader>
          {drilldown && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">Custo</TableHead>
                  <TableHead className="text-xs text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drilldown.items.slice(0, 100).map((item: any, i: number) => (
                  <TableRow key={item.id || i} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => { setDrilldown(null); navigate(`/sales/${item.id || item.sale_id}`); }}>
                    <TableCell className="text-xs font-mono">{item.display_id || item.id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{item.name || item.description || '-'}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(item.received_value || item.value || 0)}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(item.total_cost || 0)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {item.received_value > 0 ? pct(((item.received_value - (item.total_cost || 0)) / item.received_value) * 100) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
