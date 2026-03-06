import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Building2, Calendar, FileText, Download, Plus, CheckCircle2, AlertTriangle,
  Eye, DollarSign, CreditCard, Search, RefreshCw, Printer, ArrowUpDown
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  aberto: { label: "Aberto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  conferindo: { label: "Conferindo", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  aguardando_pagamento: { label: "Aguardando Pgto", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  pago: { label: "Pago", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
};

function getSettlementPeriod(date: Date) {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();
  if (day <= 15) {
    return {
      period_start: new Date(year, month, 1),
      period_end: new Date(year, month, 15),
      payment_due: new Date(year, month, 20),
    };
  } else {
    const lastDay = endOfMonth(date).getDate();
    const nextMonth = addMonths(new Date(year, month, 1), 1);
    return {
      period_start: new Date(year, month, 16),
      period_end: new Date(year, month, lastDay),
      payment_due: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5),
    };
  }
}

export default function FechamentoFornecedores() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<string | null>(null);
  const [invoiceDialog, setInvoiceDialog] = useState<string | null>(null);
  const [generateDialog, setGenerateDialog] = useState(false);
  const [genForm, setGenForm] = useState({ supplier_id: "", period: "current_first" });
  const [payForm, setPayForm] = useState({ payment_date: format(new Date(), "yyyy-MM-dd"), payment_method: "pix", payment_account: "" });
  const [invoiceValue, setInvoiceValue] = useState("");

  // Queries
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: settlements = [], refetch: refetchSettlements } = useQuery({
    queryKey: ["supplier-settlements"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("supplier_settlements")
        .select("*, suppliers(name)")
        .order("period_start", { ascending: false });
      return data || [];
    },
  });

  const { data: settlementItems = [] } = useQuery({
    queryKey: ["supplier-settlement-items", detailId],
    enabled: !!detailId,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("supplier_settlement_items")
        .select("*, sales(name, display_id, clients(display_name)), credit_cards(nickname, last_digits)")
        .eq("settlement_id", detailId)
        .order("emission_date");
      return data || [];
    },
  });

  const { data: allSettlementItemCostIds = [] } = useQuery({
    queryKey: ["settlement-item-cost-ids"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("supplier_settlement_items")
        .select("cost_item_id")
        .not("cost_item_id", "is", null);
      return (data || []).map((d: any) => d.cost_item_id);
    },
  });

  const { data: costItemsUnlinked = [] } = useQuery({
    queryKey: ["unlinked-emissions", allSettlementItemCostIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("cost_items")
        .select("id, sale_id, category, description, total_item_cost, miles_program, miles_quantity, miles_price_per_thousand, emission_source, supplier_id, created_at, suppliers(name), sales(name, display_id, clients(display_name))")
        .not("supplier_id", "is", null)
        .order("created_at", { ascending: false });
      // Filter out items already in a settlement
      const settled = new Set(allSettlementItemCostIds);
      return (data || []).filter((ci: any) => !settled.has(ci.id));
    },
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ["credit-cards-list"],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("id, nickname, last_digits, bank").eq("is_active", true);
      return data || [];
    },
  });

  const selectedSettlement = settlements.find((s: any) => s.id === detailId);

  // Filtered list
  const filtered = useMemo(() => {
    return settlements.filter((s: any) => {
      if (filterSupplier !== "all" && s.supplier_id !== filterSupplier) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const supplierName = s.suppliers?.name?.toLowerCase() || "";
        if (!supplierName.includes(q)) return false;
      }
      return true;
    });
  }, [settlements, filterSupplier, filterStatus, search]);

  // Generate settlement
  async function handleGenerate() {
    if (!genForm.supplier_id) { toast.error("Selecione um fornecedor"); return; }

    const now = new Date();
    let period: ReturnType<typeof getSettlementPeriod>;
    switch (genForm.period) {
      case "current_first":
        period = getSettlementPeriod(new Date(now.getFullYear(), now.getMonth(), 1));
        break;
      case "current_second":
        period = getSettlementPeriod(new Date(now.getFullYear(), now.getMonth(), 16));
        break;
      case "prev_first":
        const prev = addMonths(now, -1);
        period = getSettlementPeriod(new Date(prev.getFullYear(), prev.getMonth(), 1));
        break;
      case "prev_second":
        const prev2 = addMonths(now, -1);
        period = getSettlementPeriod(new Date(prev2.getFullYear(), prev2.getMonth(), 16));
        break;
      default:
        period = getSettlementPeriod(now);
    }

    // Find matching cost_items
    const matchingItems = costItemsUnlinked.filter((ci: any) => {
      if (ci.supplier_id !== genForm.supplier_id) return false;
      const ciDate = new Date(ci.created_at);
      return ciDate >= period.period_start && ciDate <= new Date(period.period_end.getTime() + 86400000);
    });

    const totalValue = matchingItems.reduce((sum: number, ci: any) => sum + (ci.total_item_cost || 0), 0);

    // Create settlement
    const { data: settlement, error } = await (supabase.from as any)("supplier_settlements").insert({
      supplier_id: genForm.supplier_id,
      period_start: format(period.period_start, "yyyy-MM-dd"),
      period_end: format(period.period_end, "yyyy-MM-dd"),
      payment_due_date: format(period.payment_due, "yyyy-MM-dd"),
      total_value: totalValue,
      emission_count: matchingItems.length,
      status: "aberto",
      created_by: user?.id,
    }).select().single();

    if (error) { toast.error("Erro ao criar fechamento: " + error.message); return; }

    // Create settlement items
    if (matchingItems.length > 0) {
      const items = matchingItems.map((ci: any) => ({
        settlement_id: settlement.id,
        cost_item_id: ci.id,
        sale_id: ci.sale_id,
        emission_date: format(new Date(ci.created_at), "yyyy-MM-dd"),
        client_name: ci.sales?.clients?.display_name || "",
        product_description: `${ci.category} — ${ci.description || ""}`,
        miles_program: ci.miles_program || null,
        miles_quantity: ci.miles_quantity || 0,
        miles_price_per_thousand: ci.miles_price_per_thousand || 0,
        emission_value: ci.total_item_cost || 0,
        emission_source: ci.emission_source || null,
      }));
      await (supabase.from as any)("supplier_settlement_items").insert(items);
    }

    toast.success(`Fechamento criado com ${matchingItems.length} emissões`);
    setGenerateDialog(false);
    qc.invalidateQueries({ queryKey: ["supplier-settlements"] });
    qc.invalidateQueries({ queryKey: ["unlinked-emissions"] });
  }

  // Pay settlement
  async function handlePay() {
    if (!payDialog) return;
    const { error } = await (supabase.from as any)("supplier_settlements").update({
      status: "pago",
      payment_date: payForm.payment_date,
      payment_method: payForm.payment_method,
      payment_account: payForm.payment_account,
    }).eq("id", payDialog);
    if (error) { toast.error(error.message); return; }

    // Create accounts_payable entry
    const s = settlements.find((s: any) => s.id === payDialog);
    if (s) {
      await supabase.from("accounts_payable").insert({
        description: `Fechamento fornecedor ${s.suppliers?.name} — ${format(parseISO(s.period_start), "dd/MM")} a ${format(parseISO(s.period_end), "dd/MM/yyyy")}`,
        value: s.total_value,
        status: "pago",
        paid_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        supplier_id: s.supplier_id,
        created_by: user?.id,
      });
    }

    toast.success("Pagamento registrado e lançado no financeiro");
    setPayDialog(null);
    qc.invalidateQueries({ queryKey: ["supplier-settlements"] });
  }

  // Submit invoice value
  async function handleInvoice() {
    if (!invoiceDialog) return;
    const val = parseFloat(invoiceValue.replace(",", "."));
    if (isNaN(val)) { toast.error("Valor inválido"); return; }
    const { error } = await (supabase.from as any)("supplier_settlements").update({
      supplier_invoice_value: val,
      status: "conferindo",
    }).eq("id", invoiceDialog);
    if (error) { toast.error(error.message); return; }
    toast.success("Valor do fornecedor registrado");
    setInvoiceDialog(null);
    setInvoiceValue("");
    qc.invalidateQueries({ queryKey: ["supplier-settlements"] });
  }

  // Update status
  async function updateStatus(id: string, status: string) {
    await (supabase.from as any)("supplier_settlements").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["supplier-settlements"] });
  }

  // Export Excel
  function exportExcel(settlement: any, items: any[]) {
    const rows = items.map((i: any) => ({
      "Data Emissão": i.emission_date,
      "Venda": i.sales?.display_id || "",
      "Nome Venda": i.sales?.name || "",
      "Cliente": i.client_name || i.sales?.clients?.display_name || "",
      "Produto": i.product_description || "",
      "Programa Milhas": i.miles_program || "",
      "Milhas": i.miles_quantity || 0,
      "Valor Milheiro": i.miles_price_per_thousand || 0,
      "Valor Emissão": i.emission_value || 0,
      "Fonte": i.emission_source || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fechamento");
    const supplierName = settlement.suppliers?.name || "Fornecedor";
    XLSX.writeFile(wb, `Fechamento_${supplierName}_${settlement.period_start}_${settlement.period_end}.xlsx`);
  }

  // Export PDF
  function exportPDF(settlement: any, items: any[]) {
    const doc = new jsPDF({ orientation: "landscape" });
    const supplierName = settlement.suppliers?.name || "Fornecedor";
    const periodStr = `${format(parseISO(settlement.period_start), "dd/MM/yyyy")} a ${format(parseISO(settlement.period_end), "dd/MM/yyyy")}`;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(34, 87, 64);
    doc.text("NatLeva Viagens", 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Fechamento de Fornecedor — ${supplierName}`, 14, 28);
    doc.text(`Período: ${periodStr}`, 14, 35);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 42);

    // Table
    const headers = ["Data", "Venda", "Cliente", "Produto", "Programa", "Milhas", "Vlr Milheiro", "Vlr Emissão"];
    const colWidths = [22, 28, 40, 50, 28, 22, 24, 28];
    let y = 52;

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(34, 87, 64);
    doc.rect(14, y - 5, 270, 8, "F");
    headers.forEach((h, i) => {
      const x = 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(h, x + 1, y);
    });
    y += 7;

    doc.setTextColor(40, 40, 40);
    items.forEach((item: any, idx: number) => {
      if (y > 185) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(14, y - 4, 270, 7, "F"); }
      const row = [
        item.emission_date ? format(parseISO(item.emission_date), "dd/MM/yy") : "",
        item.sales?.display_id || "",
        (item.client_name || "").substring(0, 25),
        (item.product_description || "").substring(0, 32),
        item.miles_program || "",
        item.miles_quantity?.toLocaleString("pt-BR") || "0",
        item.miles_price_per_thousand ? `R$ ${item.miles_price_per_thousand}` : "",
        fmt(item.emission_value || 0),
      ];
      row.forEach((cell, i) => {
        const x = 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(String(cell), x + 1, y);
      });
      y += 7;
    });

    // Total
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(34, 87, 64);
    doc.text(`Total: ${fmt(settlement.total_value)}`, 14, y);
    if (settlement.supplier_invoice_value != null) {
      doc.text(`Valor Fornecedor: ${fmt(settlement.supplier_invoice_value)}`, 120, y);
      const diff = settlement.supplier_invoice_value - settlement.total_value;
      doc.setTextColor(diff === 0 ? 34 : 200, diff === 0 ? 87 : 40, diff === 0 ? 64 : 40);
      doc.text(`Diferença: ${fmt(diff)}`, 210, y);
    }

    doc.save(`Fechamento_${supplierName}_${settlement.period_start}.pdf`);
  }

  // Alerts
  const alerts = useMemo(() => {
    const list: { type: string; msg: string; id: string }[] = [];
    settlements.forEach((s: any) => {
      if (s.status === "aberto" || s.status === "conferindo") {
        const due = new Date(s.payment_due_date);
        const diff = (due.getTime() - Date.now()) / 86400000;
        if (diff <= 3 && diff > 0) list.push({ type: "warn", msg: `Fechamento ${s.suppliers?.name} vence em ${Math.ceil(diff)} dias`, id: s.id });
        if (diff <= 0) list.push({ type: "error", msg: `Fechamento ${s.suppliers?.name} VENCIDO!`, id: s.id });
      }
      if (s.difference_value && Math.abs(s.difference_value) > 0.01) {
        list.push({ type: "warn", msg: `Divergência de ${fmt(s.difference_value)} no fechamento ${s.suppliers?.name}`, id: s.id });
      }
      if (s.status === "aberto" && s.supplier_invoice_value == null) {
        list.push({ type: "info", msg: `Fechamento ${s.suppliers?.name} aguardando conferência`, id: s.id });
      }
    });
    return list;
  }, [settlements]);

  return (
    <div className="space-y-6 p-2 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Fechamento de Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de emissões e fechamentos quinzenais</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setGenerateDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Gerar Fechamento
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Alertas</span>
            </div>
            <div className="space-y-1">
              {alerts.map((a, i) => (
                <button key={i} onClick={() => setDetailId(a.id)} className="block text-xs text-yellow-700 dark:text-yellow-300 hover:underline">
                  • {a.msg}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fechamentos Abertos</p>
          <p className="text-xl font-bold text-foreground">{settlements.filter((s: any) => s.status !== "pago").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Valor Pendente</p>
          <p className="text-xl font-bold text-foreground">{fmt(settlements.filter((s: any) => s.status !== "pago").reduce((s: number, x: any) => s + (x.total_value || 0), 0))}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pagos este mês</p>
          <p className="text-xl font-bold text-emerald-600">{settlements.filter((s: any) => s.status === "pago" && s.payment_date && new Date(s.payment_date).getMonth() === new Date().getMonth()).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Emissões sem fechamento</p>
          <p className="text-xl font-bold text-orange-600">{costItemsUnlinked.length}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Fornecedor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="w-[200px]">
            <Label className="text-xs">Fornecedor</Label>
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-center">Emissões</TableHead>
              <TableHead className="text-right">Valor Sistema</TableHead>
              <TableHead className="text-right">Valor Fornecedor</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="text-center">Pgto até</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum fechamento encontrado</TableCell></TableRow>
            )}
            {filtered.map((s: any) => {
              const statusInfo = STATUS_MAP[s.status] || STATUS_MAP.aberto;
              const hasDiff = s.difference_value && Math.abs(s.difference_value) > 0.01;
              return (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(s.id)}>
                  <TableCell className="font-semibold text-foreground">{s.suppliers?.name || "—"}</TableCell>
                  <TableCell className="text-xs">{format(parseISO(s.period_start), "dd/MM")} a {format(parseISO(s.period_end), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-center">{s.emission_count}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(s.total_value)}</TableCell>
                  <TableCell className="text-right font-mono">{s.supplier_invoice_value != null ? fmt(s.supplier_invoice_value) : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  <TableCell className={`text-right font-mono ${hasDiff ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    {s.difference_value != null ? fmt(s.difference_value) : "—"}
                  </TableCell>
                  <TableCell className="text-center text-xs">{format(parseISO(s.payment_due_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-center"><Badge className={statusInfo.color}>{statusInfo.label}</Badge></TableCell>
                  <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailId(s.id)}><Eye className="w-3.5 h-3.5" /></Button>
                      {s.status !== "pago" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInvoiceDialog(s.id)} title="Conferir fatura">
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPayDialog(s.id); setPayForm({ payment_date: format(new Date(), "yyyy-MM-dd"), payment_method: "pix", payment_account: "" }); }} title="Registrar pgto">
                            <DollarSign className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={o => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedSettlement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Fechamento — {selectedSettlement.suppliers?.name}
                </DialogTitle>
              </DialogHeader>

              {/* Settlement summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground">Período</p>
                  <p className="text-sm font-bold">{format(parseISO(selectedSettlement.period_start), "dd/MM")} a {format(parseISO(selectedSettlement.period_end), "dd/MM/yyyy")}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground">Valor Total Sistema</p>
                  <p className="text-sm font-bold text-foreground">{fmt(selectedSettlement.total_value)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground">Valor Fornecedor</p>
                  <p className="text-sm font-bold">{selectedSettlement.supplier_invoice_value != null ? fmt(selectedSettlement.supplier_invoice_value) : "Não informado"}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground">Diferença</p>
                  <p className={`text-sm font-bold ${selectedSettlement.difference_value && Math.abs(selectedSettlement.difference_value) > 0.01 ? "text-destructive" : "text-emerald-600"}`}>
                    {selectedSettlement.difference_value != null ? fmt(selectedSettlement.difference_value) : "—"}
                  </p>
                </Card>
              </div>

              {/* Status and actions */}
              <div className="flex items-center gap-3 mt-3">
                <Badge className={STATUS_MAP[selectedSettlement.status]?.color}>{STATUS_MAP[selectedSettlement.status]?.label}</Badge>
                {selectedSettlement.status !== "pago" && (
                  <Select value={selectedSettlement.status} onValueChange={v => updateStatus(selectedSettlement.id, v)}>
                    <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportExcel(selectedSettlement, settlementItems)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportPDF(selectedSettlement, settlementItems)}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>

              {/* Items table */}
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2">Emissões ({settlementItems.length})</h3>
                <div className="border rounded-lg overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Venda</TableHead>
                        <TableHead className="text-xs">Cliente</TableHead>
                        <TableHead className="text-xs">Produto</TableHead>
                        <TableHead className="text-xs">Programa</TableHead>
                        <TableHead className="text-xs text-right">Milhas</TableHead>
                        <TableHead className="text-xs text-right">Vlr Milheiro</TableHead>
                        <TableHead className="text-xs text-right">Valor</TableHead>
                        <TableHead className="text-xs">Fonte</TableHead>
                        <TableHead className="text-xs">Cartão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlementItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">{item.emission_date ? format(parseISO(item.emission_date), "dd/MM/yy") : ""}</TableCell>
                          <TableCell className="text-xs font-mono">{item.sales?.display_id || ""}</TableCell>
                          <TableCell className="text-xs">{item.client_name || item.sales?.clients?.display_name || ""}</TableCell>
                          <TableCell className="text-xs">{item.product_description || ""}</TableCell>
                          <TableCell className="text-xs">{item.miles_program || "—"}</TableCell>
                          <TableCell className="text-xs text-right">{item.miles_quantity?.toLocaleString("pt-BR") || "0"}</TableCell>
                          <TableCell className="text-xs text-right">{item.miles_price_per_thousand ? `R$ ${item.miles_price_per_thousand}` : "—"}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-semibold">{fmt(item.emission_value || 0)}</TableCell>
                          <TableCell className="text-xs">{item.emission_source || "—"}</TableCell>
                          <TableCell className="text-xs">{item.credit_cards ? `${item.credit_cards.nickname} ••${item.credit_cards.last_digits}` : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-2">
                  <span className="text-sm font-bold text-foreground">Total: {fmt(settlementItems.reduce((s: number, i: any) => s + (i.emission_value || 0), 0))}</span>
                </div>
              </div>

              {/* Payment info */}
              {selectedSettlement.status === "pago" && selectedSettlement.payment_date && (
                <Card className="p-3 mt-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Pagamento Realizado</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Data: <strong className="text-foreground">{format(parseISO(selectedSettlement.payment_date), "dd/MM/yyyy")}</strong></span>
                    <span>Forma: <strong className="text-foreground">{selectedSettlement.payment_method}</strong></span>
                    {selectedSettlement.payment_account && <span>Conta: <strong className="text-foreground">{selectedSettlement.payment_account}</strong></span>}
                  </div>
                </Card>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar Fechamento</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold">Fornecedor</Label>
              <Select value={genForm.supplier_id} onValueChange={v => setGenForm(f => ({ ...f, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Período</Label>
              <Select value={genForm.period} onValueChange={v => setGenForm(f => ({ ...f, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_first">Mês atual — 1ª quinzena (01 a 15)</SelectItem>
                  <SelectItem value="current_second">Mês atual — 2ª quinzena (16 a fim)</SelectItem>
                  <SelectItem value="prev_first">Mês anterior — 1ª quinzena</SelectItem>
                  <SelectItem value="prev_second">Mês anterior — 2ª quinzena</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleGenerate}>
              <Plus className="w-4 h-4 mr-1" /> Gerar Fechamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={!!invoiceDialog} onOpenChange={o => { if (!o) setInvoiceDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Conferir Fatura do Fornecedor</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold">Valor informado pelo fornecedor</Label>
              <Input placeholder="Ex: 4500.00" value={invoiceValue} onChange={e => setInvoiceValue(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              O sistema comparará automaticamente com o valor registrado e mostrará a diferença.
            </p>
            <Button className="w-full" onClick={handleInvoice}>Registrar e Conferir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={!!payDialog} onOpenChange={o => { if (!o) setPayDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold">Data do Pagamento</Label>
              <Input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Forma de Pagamento</Label>
              <Select value={payForm.payment_method} onValueChange={v => setPayForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="ted">TED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Conta Utilizada</Label>
              <Input placeholder="Ex: Itaú, Nubank..." value={payForm.payment_account} onChange={e => setPayForm(f => ({ ...f, payment_account: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handlePay}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
