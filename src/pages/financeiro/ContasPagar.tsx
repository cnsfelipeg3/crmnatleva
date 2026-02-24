import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, Search, Download } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "-";

export default function ContasPagar() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const { data: payables = [] } = useQuery({
    queryKey: ["accounts-payable"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_payable").select("*").order("due_date", { ascending: true });
      return data || [];
    },
  });

  const { data: costItems = [] } = useQuery({
    queryKey: ["ap-cost-items"],
    queryFn: async () => {
      const { data } = await supabase.from("cost_items").select("id, sale_id, category, description, total_item_cost");
      return data || [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["ap-sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("id, display_id, name, total_cost");
      return data || [];
    },
  });

  const allItems = useMemo(() => {
    const existingCostIds = new Set(payables.map((p: any) => p.cost_item_id).filter(Boolean));
    const fromCosts = costItems
      .filter((c: any) => !existingCostIds.has(c.id) && (c.total_item_cost || 0) > 0)
      .map((c: any) => {
        const sale = sales.find((s: any) => s.id === c.sale_id);
        return {
          id: `virtual-${c.id}`,
          sale_id: c.sale_id,
          cost_item_id: c.id,
          description: `${c.category} - ${c.description || sale?.name || ''}`,
          display_id: sale?.display_id,
          value: c.total_item_cost || 0,
          due_date: null,
          status: 'pendente',
          payment_method: null,
          installment_number: 1,
          installment_total: 1,
          _virtual: true,
        };
      });

    const fromDb = payables.map((p: any) => {
      const sale = sales.find((s: any) => s.id === p.sale_id);
      return { ...p, display_id: sale?.display_id, _virtual: false };
    });

    return [...fromDb, ...fromCosts];
  }, [payables, costItems, sales]);

  const filtered = useMemo(() => {
    let items = allItems;
    if (statusFilter !== "all") items = items.filter((r: any) => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r: any) => (r.description || "").toLowerCase().includes(q) || (r.display_id || "").toLowerCase().includes(q));
    }
    return items;
  }, [allItems, statusFilter, search]);

  const totals = useMemo(() => ({
    pendente: allItems.filter((r: any) => r.status === 'pendente').reduce((s: number, r: any) => s + (r.value || 0), 0),
    pago: allItems.filter((r: any) => r.status === 'pago').reduce((s: number, r: any) => s + (r.value || 0), 0),
    atrasado: allItems.filter((r: any) => r.status === 'pendente' && r.due_date && r.due_date < new Date().toISOString().slice(0, 10)).reduce((s: number, r: any) => s + (r.value || 0), 0),
  }), [allItems]);

  const handlePay = async (item: any) => {
    if (item._virtual) {
      const { error } = await supabase.from("accounts_payable").insert({
        sale_id: item.sale_id,
        cost_item_id: item.cost_item_id,
        description: item.description,
        value: item.value,
        status: "pago",
        paid_date: new Date().toISOString().slice(0, 10),
      });
      if (error) { toast.error("Erro"); return; }
    } else {
      const { error } = await supabase.from("accounts_payable").update({
        status: "pago",
        paid_date: new Date().toISOString().slice(0, 10),
      }).eq("id", item.id);
      if (error) { toast.error("Erro"); return; }
    }
    toast.success("Pagamento registrado!");
    qc.invalidateQueries({ queryKey: ["accounts-payable"] });
    setSelected(null);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Fornecedores e custos</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const headers = "ID,Descrição,Valor,Vencimento,Status\n";
          const rows = filtered.map((r: any) => `${r.display_id || ''},${r.description || ''},${r.value},${r.due_date || ''},${r.status}`).join("\n");
          const blob = new Blob([headers + rows], { type: "text/csv" }); const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "contas-pagar.csv"; a.click();
        }}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 glass-card cursor-pointer" onClick={() => setStatusFilter("all")}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Pendente</p>
          <p className="text-xl font-bold text-amber-400 font-display">{fmt(totals.pendente)}</p>
        </Card>
        <Card className="p-4 glass-card cursor-pointer" onClick={() => setStatusFilter("pago")}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Pago</p>
          <p className="text-xl font-bold text-emerald-500 font-display">{fmt(totals.pago)}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Atrasado</p>
          <p className="text-xl font-bold text-red-500 font-display">{fmt(totals.atrasado)}</p>
        </Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Venda</TableHead>
                <TableHead className="text-xs">Descrição</TableHead>
                <TableHead className="text-xs">Vencimento</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                  <TableCell>
                    {r.status === 'pago' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                      r.due_date && r.due_date < new Date().toISOString().slice(0, 10) ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                        <Clock className="w-4 h-4 text-amber-500" />}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{r.display_id || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[250px] truncate">{r.description || '-'}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.due_date)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold">{fmt(r.value || 0)}</TableCell>
                  <TableCell>
                    {r.status !== 'pago' && r.status !== 'cancelado' && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handlePay(r); }}>
                        Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Descrição:</span> {selected.description}</div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
                <div><span className="text-muted-foreground">Valor:</span> <strong>{fmt(selected.value || 0)}</strong></div>
                <div><span className="text-muted-foreground">Vencimento:</span> {fmtDate(selected.due_date)}</div>
              </div>
              <div className="flex gap-2 pt-2">
                {selected.status !== 'pago' && selected.status !== 'cancelado' && (
                  <Button size="sm" onClick={() => handlePay(selected)}>
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
