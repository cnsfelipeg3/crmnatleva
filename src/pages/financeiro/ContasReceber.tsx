import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, Search, Plus, Download } from "lucide-react";
import { useSalesScope } from "@/hooks/useSalesScope";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "-";

export default function ContasReceber() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canViewAll, sellerId } = useSalesScope();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["accounts-receivable", canViewAll, sellerId],
    queryFn: async () => {
      let q = supabase.from("accounts_receivable").select("*, sale:sales(seller_id)").order("due_date", { ascending: true });
      const { data } = await q;
      const all = data || [];
      if (canViewAll) return all;
      return all.filter((r: any) => !r.sale || r.sale.seller_id === sellerId);
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["ar-sales", canViewAll, sellerId],
    queryFn: async () => {
      let q = supabase.from("sales").select("id, display_id, name, received_value, status, payment_method, created_at, seller_id");
      if (!canViewAll && sellerId) q = q.eq("seller_id", sellerId);
      const { data } = await q;
      return data || [];
    },
  });

  // Auto-generate receivables from sales that don't have one
  const allItems = useMemo(() => {
    const existingSaleIds = new Set(receivables.map((r: any) => r.sale_id));
    const fromSales = sales.filter((s: any) => !existingSaleIds.has(s.id) && (s.received_value || 0) > 0).map((s: any) => ({
      id: `virtual-${s.id}`,
      sale_id: s.id,
      display_id: s.display_id,
      description: s.name,
      gross_value: s.received_value || 0,
      fee_percent: 0,
      fee_value: 0,
      net_value: s.received_value || 0,
      due_date: s.created_at?.slice(0, 10),
      status: s.status === 'Cancelada' ? 'cancelado' : 'pendente',
      payment_method: s.payment_method || 'Não informado',
      installment_number: 1,
      installment_total: 1,
      notes: '',
      _virtual: true,
    }));

    const fromDb = receivables.map((r: any) => {
      const sale = sales.find((s: any) => s.id === r.sale_id);
      return { ...r, display_id: sale?.display_id, _virtual: false };
    });

    return [...fromDb, ...fromSales];
  }, [receivables, sales]);

  const filtered = useMemo(() => {
    let items = allItems;
    if (statusFilter !== "all") items = items.filter((r: any) => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r: any) =>
        (r.description || "").toLowerCase().includes(q) ||
        (r.display_id || "").toLowerCase().includes(q) ||
        (r.payment_method || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [allItems, statusFilter, search]);

  const totals = useMemo(() => ({
    pendente: allItems.filter((r: any) => r.status === 'pendente').reduce((s: number, r: any) => s + (r.net_value || 0), 0),
    recebido: allItems.filter((r: any) => r.status === 'recebido').reduce((s: number, r: any) => s + (r.net_value || 0), 0),
    atrasado: allItems.filter((r: any) => {
      if (r.status !== 'pendente') return false;
      return r.due_date && r.due_date < new Date().toISOString().slice(0, 10);
    }).reduce((s: number, r: any) => s + (r.net_value || 0), 0),
  }), [allItems]);

  const handleReceive = async (item: any) => {
    if (item._virtual) {
      // Create receivable record first
      const { error } = await supabase.from("accounts_receivable").insert({
        sale_id: item.sale_id,
        description: item.description,
        gross_value: item.gross_value,
        net_value: item.net_value,
        due_date: item.due_date,
        status: "recebido",
        received_date: new Date().toISOString().slice(0, 10),
        payment_method: item.payment_method,
      });
      if (error) { toast.error("Erro ao registrar"); return; }
    } else {
      const { error } = await supabase.from("accounts_receivable").update({
        status: "recebido",
        received_date: new Date().toISOString().slice(0, 10),
      }).eq("id", item.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
    }
    toast.success("Recebimento registrado!");
    qc.invalidateQueries({ queryKey: ["accounts-receivable"] });
    setSelected(null);
  };

  const statusIcon = (s: string, due: string | null) => {
    const isLate = s === 'pendente' && due && due < new Date().toISOString().slice(0, 10);
    if (s === 'recebido') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (isLate) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const exportCSV = () => {
    const headers = "ID,Descrição,Valor Bruto,Taxa,Valor Líquido,Vencimento,Status,Pagamento\n";
    const rows = filtered.map((r: any) =>
      `${r.display_id || ''},${r.description || ''},${r.gross_value},${r.fee_value || 0},${r.net_value},${r.due_date || ''},${r.status},${r.payment_method || ''}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "contas-receber.csv"; a.click();
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Integrado com vendas</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 glass-card cursor-pointer" onClick={() => setStatusFilter("all")}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Pendente</p>
          <p className="text-xl font-bold text-amber-400 font-display">{fmt(totals.pendente)}</p>
        </Card>
        <Card className="p-4 glass-card cursor-pointer" onClick={() => setStatusFilter("recebido")}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Recebido</p>
          <p className="text-xl font-bold text-emerald-500 font-display">{fmt(totals.recebido)}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Atrasado</p>
          <p className="text-xl font-bold text-red-500 font-display">{fmt(totals.atrasado)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, ID, pagamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Descrição</TableHead>
                <TableHead className="text-xs">Pagamento</TableHead>
                <TableHead className="text-xs">Vencimento</TableHead>
                <TableHead className="text-xs text-right">Bruto</TableHead>
                <TableHead className="text-xs text-right">Líquido</TableHead>
                <TableHead className="text-xs">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                  <TableCell>{statusIcon(r.status, r.due_date)}</TableCell>
                  <TableCell className="text-xs font-mono">{r.display_id || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{r.description || '-'}</TableCell>
                  <TableCell className="text-xs">{r.payment_method || '-'}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.due_date)}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(r.gross_value || 0)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold">{fmt(r.net_value || 0)}</TableCell>
                  <TableCell>
                    {r.status !== 'recebido' && r.status !== 'cancelado' && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handleReceive(r); }}>
                        Receber
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes — {selected?.display_id || selected?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Descrição:</span> {selected.description}</div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
                <div><span className="text-muted-foreground">Bruto:</span> {fmt(selected.gross_value || 0)}</div>
                <div><span className="text-muted-foreground">Taxa:</span> {fmt(selected.fee_value || 0)} ({selected.fee_percent || 0}%)</div>
                <div><span className="text-muted-foreground">Líquido:</span> <strong>{fmt(selected.net_value || 0)}</strong></div>
                <div><span className="text-muted-foreground">Vencimento:</span> {fmtDate(selected.due_date)}</div>
                <div><span className="text-muted-foreground">Pagamento:</span> {selected.payment_method || '-'}</div>
                <div><span className="text-muted-foreground">Parcela:</span> {selected.installment_number}/{selected.installment_total}</div>
              </div>
              {selected.notes && <p className="text-xs text-muted-foreground border-t pt-2">{selected.notes}</p>}
              <div className="flex gap-2 pt-2">
                {selected.sale_id && (
                  <Button size="sm" variant="outline" onClick={() => { setSelected(null); navigate(`/sales/${selected.sale_id}`); }}>
                    Ver Venda
                  </Button>
                )}
                {selected.status !== 'recebido' && selected.status !== 'cancelado' && (
                  <Button size="sm" onClick={() => handleReceive(selected)}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Dar Baixa
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
