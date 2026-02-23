import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { AlertTriangle, FileWarning, ShieldAlert, Clock, Lightbulb } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string;
  display_id: string;
  name: string;
  status: string;
  margin: number;
  received_value: number;
  total_cost: number;
  locators: string[];
  is_international: boolean | null;
  hotel_name: string | null;
  products: string[];
  destination_iata: string | null;
  created_at: string;
  seller_id: string | null;
}

interface Props {
  filtered: Sale[];
  sellerNames: Record<string, string>;
}

export default function AlertsSection({ filtered, sellerNames }: Props) {
  const navigate = useNavigate();

  const alerts = useMemo(() => {
    const a: { icon: any; msg: string; saleId: string; type: string }[] = [];
    filtered.forEach(s => {
      if ((s.margin || 0) < 0 && s.received_value > 0)
        a.push({ type: "error", icon: AlertTriangle, msg: `${s.display_id} — Prejuízo: margem ${(s.margin || 0).toFixed(1)}%`, saleId: s.id });
      else if ((s.margin || 0) < 10 && s.received_value > 0)
        a.push({ type: "warning", icon: AlertTriangle, msg: `${s.display_id} — Margem baixa: ${(s.margin || 0).toFixed(1)}%`, saleId: s.id });
      if (s.status === "Emitido" && (!s.locators || s.locators.length === 0 || s.locators.every(l => !l)))
        a.push({ type: "error", icon: FileWarning, msg: `${s.display_id} — Localizador vazio (Emitido)`, saleId: s.id });
      if (s.is_international && !s.hotel_name && s.products?.includes("Hotel"))
        a.push({ type: "info", icon: ShieldAlert, msg: `${s.display_id} — Internacional sem hotel`, saleId: s.id });
    });
    return a.slice(0, 12);
  }, [filtered]);

  // Auto insights
  const insights = useMemo(() => {
    const msgs: string[] = [];
    if (filtered.length === 0) return msgs;

    // Best destination by revenue
    const destRevenue: Record<string, number> = {};
    filtered.forEach(s => {
      if (s.destination_iata) destRevenue[s.destination_iata] = (destRevenue[s.destination_iata] || 0) + (s.received_value || 0);
    });
    const topDest = Object.entries(destRevenue).sort((a, b) => b[1] - a[1])[0];
    if (topDest) {
      const pct = ((topDest[1] / filtered.reduce((s, v) => s + (v.received_value || 0), 0)) * 100).toFixed(0);
      msgs.push(`${topDest[0]} representa ${pct}% do seu faturamento.`);
    }

    // Best month
    const monthRevenue: Record<string, number> = {};
    filtered.forEach(s => {
      const m = new Date(s.created_at).toLocaleDateString("pt-BR", { month: "long" });
      monthRevenue[m] = (monthRevenue[m] || 0) + (s.received_value || 0) - (s.total_cost || 0);
    });
    const topMonth = Object.entries(monthRevenue).sort((a, b) => b[1] - a[1])[0];
    if (topMonth) msgs.push(`${topMonth[0].charAt(0).toUpperCase() + topMonth[0].slice(1)} é seu mês mais lucrativo.`);

    // Best seller
    const sellerRevenue: Record<string, { name: string; margin: number; count: number }> = {};
    filtered.forEach(s => {
      const sid = s.seller_id || "sem";
      const name = sellerNames[sid] || "Sem vendedor";
      if (!sellerRevenue[sid]) sellerRevenue[sid] = { name, margin: 0, count: 0 };
      sellerRevenue[sid].margin += s.margin || 0;
      sellerRevenue[sid].count++;
    });
    const topSeller = Object.values(sellerRevenue).map(v => ({
      ...v, avg: v.count > 0 ? v.margin / v.count : 0,
    })).sort((a, b) => b.avg - a.avg)[0];
    if (topSeller && topSeller.count > 1) msgs.push(`Melhor margem média: ${topSeller.name} com ${topSeller.avg.toFixed(1)}%.`);

    // International %
    const intl = filtered.filter(s => s.is_international).length;
    if (intl > 0) msgs.push(`${((intl / filtered.length) * 100).toFixed(0)}% das vendas são internacionais.`);

    return msgs.slice(0, 5);
  }, [filtered, sellerNames]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Alertas e Riscos
          </h3>
          {alerts.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-sm"
                  onClick={() => navigate(`/sales/${a.saleId}`)}
                >
                  <a.icon className={`w-4 h-4 shrink-0 ${a.type === "error" ? "text-destructive" : "text-warning"}`} />
                  <span className="text-foreground truncate">{a.msg}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta ativo 🎉</p>
          )}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" /> Insights Automáticos
          </h3>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-warning font-bold shrink-0">💡</span>
                  <span className="text-foreground">{msg}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes para insights</p>
          )}
        </Card>
      </div>
    </div>
  );
}
