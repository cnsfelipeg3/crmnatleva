import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Repeat, Crown } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Client {
  id: string;
  display_name: string;
  created_at: string;
}

interface Sale {
  id: string;
  client_id: string | null;
  received_value: number;
  created_at: string;
}

interface Props {
  clients: Client[];
  filtered: Sale[];
  periodStart: Date | null;
}

export default function ClientsSection({ clients, filtered, periodStart }: Props) {
  const navigate = useNavigate();

  const activeClients = useMemo(() => {
    const ids = new Set(filtered.filter(s => s.client_id).map(s => s.client_id!));
    return ids.size;
  }, [filtered]);

  const newClients = useMemo(() => {
    if (!periodStart) return clients.length;
    return clients.filter(c => new Date(c.created_at) >= periodStart).length;
  }, [clients, periodStart]);

  const recurrentPct = useMemo(() => {
    const clientSales: Record<string, number> = {};
    filtered.forEach(s => {
      if (s.client_id) clientSales[s.client_id] = (clientSales[s.client_id] || 0) + 1;
    });
    const total = Object.keys(clientSales).length;
    if (total === 0) return 0;
    const recurrent = Object.values(clientSales).filter(c => c > 1).length;
    return (recurrent / total) * 100;
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
    { label: "Clientes Ativos", value: activeClients, icon: Users, color: "text-primary" },
    { label: "Novos no Período", value: newClients, icon: UserPlus, color: "text-success" },
    { label: "Recorrentes", value: `${recurrentPct.toFixed(0)}%`, icon: Repeat, color: "text-info" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-foreground">Clientes</h2>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="p-3.5 glass-card">
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
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
    </div>
  );
}
