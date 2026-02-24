import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { AlertTriangle, FileWarning, ShieldAlert, Lightbulb, TrendingDown, TrendingUp, Users, Globe, DollarSign } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; display_id: string; name: string; status: string;
  margin: number; received_value: number; total_cost: number;
  locators: string[]; is_international: boolean | null;
  hotel_name: string | null; products: string[];
  destination_iata: string | null; created_at: string;
  seller_id: string | null; client_id: string | null;
}

interface Client { id: string; display_name: string; created_at: string; }

interface Props {
  filtered: Sale[];
  sellerNames: Record<string, string>;
  clients: Client[];
}

export default function AlertsSection({ filtered, sellerNames, clients }: Props) {
  const navigate = useNavigate();

  const alerts = useMemo(() => {
    const a: { icon: any; msg: string; saleId: string; type: string }[] = [];
    filtered.forEach(s => {
      if ((s.margin || 0) < 0 && s.received_value > 0)
        a.push({ type: "error", icon: AlertTriangle, msg: `${s.display_id} — Prejuízo: margem ${(s.margin || 0).toFixed(1)}%`, saleId: s.id });
      else if ((s.margin || 0) < 10 && s.received_value > 0 && (s.margin || 0) > 0)
        a.push({ type: "warning", icon: AlertTriangle, msg: `${s.display_id} — Margem baixa: ${(s.margin || 0).toFixed(1)}%`, saleId: s.id });
      if (s.status === "Emitido" && (!s.locators || s.locators.length === 0 || s.locators.every(l => !l)))
        a.push({ type: "error", icon: FileWarning, msg: `${s.display_id} — Localizador vazio (Emitido)`, saleId: s.id });
      if (s.is_international && !s.hotel_name && s.products?.includes("Hotel"))
        a.push({ type: "info", icon: ShieldAlert, msg: `${s.display_id} — Internacional sem hotel`, saleId: s.id });
    });
    return a.slice(0, 15);
  }, [filtered]);

  // Enhanced insights
  const insights = useMemo(() => {
    const msgs: { icon: any; msg: string; type: string }[] = [];
    if (filtered.length === 0) return msgs;
    const totalRev = filtered.reduce((s, v) => s + (v.received_value || 0), 0);
    const avgMargin = filtered.reduce((s, v) => s + (v.margin || 0), 0) / filtered.length;

    // Best destination
    const destRevenue: Record<string, number> = {};
    filtered.forEach(s => {
      if (s.destination_iata) destRevenue[s.destination_iata] = (destRevenue[s.destination_iata] || 0) + (s.received_value || 0);
    });
    const topDest = Object.entries(destRevenue).sort((a, b) => b[1] - a[1])[0];
    if (topDest) {
      const pct = ((topDest[1] / totalRev) * 100).toFixed(0);
      msgs.push({ icon: Globe, msg: `${topDest[0]} representa ${pct}% do faturamento.`, type: "info" });
    }

    // Best seller
    const sellerRevenue: Record<string, { name: string; ticket: number; count: number }> = {};
    filtered.forEach(s => {
      const sid = s.seller_id || "sem";
      const name = sellerNames[sid] || "Sem vendedor";
      if (!sellerRevenue[sid]) sellerRevenue[sid] = { name, ticket: 0, count: 0 };
      sellerRevenue[sid].ticket += s.received_value || 0;
      sellerRevenue[sid].count++;
    });
    const topSeller = Object.values(sellerRevenue)
      .filter(v => v.count > 1)
      .map(v => ({ ...v, avg: v.ticket / v.count }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (topSeller) msgs.push({ icon: TrendingUp, msg: `${topSeller.name} tem o maior ticket médio: ${fmt(topSeller.avg)}.`, type: "success" });

    // Margin insight
    if (avgMargin < 12)
      msgs.push({ icon: TrendingDown, msg: `Margem média geral está em ${avgMargin.toFixed(1)}% — abaixo do ideal.`, type: "warning" });
    else
      msgs.push({ icon: DollarSign, msg: `Margem média saudável: ${avgMargin.toFixed(1)}%.`, type: "success" });

    // International %
    const intl = filtered.filter(s => s.is_international).length;
    if (intl > 0)
      msgs.push({ icon: Globe, msg: `${((intl / filtered.length) * 100).toFixed(0)}% das vendas são internacionais.`, type: "info" });

    // Inactive clients
    const now = Date.now();
    const clientLastSale: Record<string, number> = {};
    filtered.forEach(s => {
      if (s.client_id) {
        const d = new Date(s.created_at).getTime();
        if (!clientLastSale[s.client_id] || d > clientLastSale[s.client_id]) clientLastSale[s.client_id] = d;
      }
    });
    const inactive90 = Object.values(clientLastSale).filter(d => (now - d) > 90 * 86400000).length;
    if (inactive90 > 0)
      msgs.push({ icon: Users, msg: `${inactive90} cliente(s) sem compra há mais de 90 dias.`, type: "warning" });

    return msgs.slice(0, 6);
  }, [filtered, sellerNames]);

  return (
    <div className="space-y-4">
      <h2 className="section-title">🧠 Inteligência & Alertas</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Alertas de Risco
          </h3>
          {alerts.length > 0 ? (
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-sm"
                  onClick={() => navigate(`/sales/${a.saleId}`)}
                >
                  <a.icon className={`w-4 h-4 shrink-0 ${a.type === "error" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-info"}`} />
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
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <ins.icon className={`w-4 h-4 shrink-0 mt-0.5 ${ins.type === "success" ? "text-success" : ins.type === "warning" ? "text-warning" : "text-info"}`} />
                  <span className="text-foreground">{ins.msg}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes</p>
          )}
        </Card>
      </div>
    </div>
  );
}
