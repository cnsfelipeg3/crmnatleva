import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Repeat, Crown } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Client {
  id: string;
  display_name: string;
  created_at: string;
  customer_since?: string | null;
}

interface Sale {
  id: string;
  display_id: string;
  name: string;
  client_id: string | null;
  received_value: number;
  created_at: string;
  status: string;
  margin: number;
}

interface Props {
  clients: Client[];
  filtered: Sale[];
  periodStart: Date | null;
}

export default function ClientsSection({ clients, filtered, periodStart }: Props) {
  const navigate = useNavigate();
  const [drilldown, setDrilldown] = useState<{ label: string; sales: Sale[] } | null>(null);

  const totalClients = clients.length;

  const newClients = useMemo(() => {
    if (!periodStart) return clients.length;
    return clients.filter(c => new Date(c.created_at) >= periodStart).length;
  }, [clients, periodStart]);

  const recurrentData = useMemo(() => {
    const clientSales: Record<string, Sale[]> = {};
    filtered.forEach(s => {
      if (s.client_id) {
        if (!clientSales[s.client_id]) clientSales[s.client_id] = [];
        clientSales[s.client_id].push(s);
      }
    });
    const total = Object.keys(clientSales).length;
    const recurrentSales = Object.values(clientSales).filter(c => c.length > 1).flat();
    const recurrent = Object.values(clientSales).filter(c => c.length > 1).length;
    const pct = total > 0 ? (recurrent / total) * 100 : 0;
    return { pct, recurrentSales };
  }, [filtered]);

  const topClients = useMemo(() => {
    const map: Record<string, { name: string; id: string; receita: number; vendas: number }> = {};
    filtered.forEach(s => {
      if (!s.client_id) return;
      const client = clients.find(c => c.id === s.client_id);
      if (!client) return;
      if (!map[s.client_id]) map[s.client_id] = { name: client.display_name, id: client.id, receita: 0, vendas: 0 };
      map[s.client_id].receita += s.received_value || 0;
      map[s.client_id].vendas++;
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, 10);
  }, [filtered, clients]);

  const stats = [
    { label: "Clientes", value: totalClients, icon: Users, color: "text-primary", sales: filtered },
    { label: "Novos no Período", value: newClients, icon: UserPlus, color: "text-success", sales: filtered },
    { label: "Recorrentes", value: `${recurrentData.pct.toFixed(0)}%`, icon: Repeat, color: "text-info", sales: recurrentData.recurrentSales },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-foreground">Clientes</h2>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="p-3.5 glass-card cursor-pointer hover:ring-1 hover:ring-accent/30 transition-all group"
            onClick={() => setDrilldown({ label: s.label, sales: s.sales })}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <div className="text-[9px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Clique para detalhes →
            </div>
          </Card>
        ))}
      </div>

      {topClients.length > 0 && (
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-warning" /> Top 10 Clientes por Receita
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs text-right">Vendas</TableHead>
                  <TableHead className="text-xs text-right">Receita</TableHead>
                  <TableHead className="text-xs text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((c, i) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/clients/${c.id}`)}
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-right">{c.vendas}</TableCell>
                    <TableCell className="text-xs text-right font-medium text-success">{fmt(c.receita)}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(c.vendas > 0 ? c.receita / c.vendas : 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Drill-down dialog */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.label} — {drilldown?.sales.length} vendas</DialogTitle>
          </DialogHeader>
          {drilldown && (
            <>
              <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                <span>Receita: <strong className="text-foreground">{fmt(drilldown.sales.reduce((s, v) => s + (v.received_value || 0), 0))}</strong></span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldown.sales.slice(0, 100).map(s => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrilldown(null); navigate(`/sales/${s.id}`); }}>
                      <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                      <TableCell className="text-xs">{s.name}</TableCell>
                      <TableCell className="text-xs">{s.status}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(s.received_value || 0)}</TableCell>
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
