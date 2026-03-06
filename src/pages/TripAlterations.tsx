import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDateBR } from "@/lib/dateFormat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertTriangle, Plus, Search, Eye, Clock, CheckCircle2, XCircle, RotateCcw,
  Ban, CreditCard, Plane, Hotel, Shield, FileText, ArrowRight, Loader2,
  TrendingDown, TrendingUp, DollarSign, Users, AlertCircle, Building2
} from "lucide-react";

/* ─── Constants ─── */
const ALTERATION_TYPES = [
  { value: "cancelamento_total", label: "Cancelamento total da viagem" },
  { value: "cancelamento_parcial", label: "Cancelamento parcial" },
  { value: "remarcacao_voo", label: "Remarcação de voo" },
  { value: "remarcacao_hotel", label: "Remarcação de hotel" },
  { value: "alteracao_datas", label: "Alteração de datas" },
  { value: "alteracao_passageiros", label: "Alteração de passageiros" },
  { value: "outro", label: "Outro" },
];

const PRODUCT_TYPES = [
  { value: "aereo", label: "Aéreo", icon: Plane },
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "transfer", label: "Transfer", icon: ArrowRight },
  { value: "seguro", label: "Seguro", icon: Shield },
  { value: "passeio", label: "Passeio", icon: Eye },
  { value: "outro", label: "Outro", icon: FileText },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  solicitado: { label: "Solicitação registrada", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Clock },
  aguardando_cia: { label: "Aguardando companhia", color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
  reembolso_aprovado: { label: "Reembolso aprovado", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  reembolso_realizado: { label: "Reembolso realizado", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CreditCard },
  concluido: { label: "Concluído", color: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

const REFUND_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "estorno_cartao", label: "Estorno no cartão" },
  { value: "credito_futuro", label: "Crédito para futura viagem" },
  { value: "voucher", label: "Voucher" },
];

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave aleatória" },
];

const SUPPLIER_ORIGINS = [
  { value: "fornecedor_emissor", label: "Fornecedor emissor" },
  { value: "companhia_aerea", label: "Companhia aérea" },
  { value: "operadora", label: "Operadora" },
  { value: "hotel", label: "Hotel" },
  { value: "estorno_cartao", label: "Estorno do cartão" },
  { value: "credito_milhas", label: "Crédito em milhas" },
  { value: "voucher", label: "Voucher" },
  { value: "outro", label: "Outro" },
];

const SUPPLIER_REFUND_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "credito_financeiro", label: "Crédito financeiro" },
  { value: "abatimento_fechamento", label: "Abatimento em fechamento" },
  { value: "voucher", label: "Voucher" },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ─── Form defaults ─── */
const EMPTY_FORM = {
  sale_id: "", alteration_type: "cancelamento_total", product_type: "aereo",
  cost_item_id: "", reason: "", description: "",
  original_value: 0, product_cost: 0, agency_profit: 0,
  penalty_value: 0, refund_value: 0, credit_value: 0, client_refund_value: 0,
  miles_program: "", miles_used: 0, miles_penalty: 0, miles_returned: 0,
  refund_method: "", refund_date: "", refund_status: "programado",
  pix_receiver_name: "", pix_key: "", pix_key_type: "", pix_bank: "",
  supplier_refund_origin: "", supplier_refund_method: "", supplier_refund_value: 0,
  supplier_refund_date: "", supplier_settlement_ref: "",
  affected_passengers: [] as string[],
  new_flight_date: "",
  refund_notes: "", notes: "",
};

export default function TripAlterations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saleSearch, setSaleSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });

  /* ─── Data queries ─── */
  const { data: alterations = [], isLoading } = useQuery({
    queryKey: ["trip-alterations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_alterations")
        .select("*, sales(id, name, display_id, origin_iata, destination_iata)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ["sales-for-alt-search"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, name, display_id, received_value, total_cost, origin_iata, destination_iata, client_id, clients(display_name, email)")
        .order("close_date", { ascending: false });
      return data || [];
    },
  });

  // Cost items for selected sale
  const { data: saleCostItems = [] } = useQuery({
    queryKey: ["cost-items-for-alt", form.sale_id],
    enabled: !!form.sale_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("cost_items")
        .select("id, category, description, total_item_cost, cash_value, miles_cost_brl, miles_quantity, miles_program, product_type, supplier_id, reservation_code, emission_source, taxes, suppliers(name)")
        .eq("sale_id", form.sale_id);
      return data || [];
    },
  });

  // Flight segments for selected sale
  const { data: saleFlightSegments = [] } = useQuery({
    queryKey: ["flight-segments-for-alt", form.sale_id],
    enabled: !!form.sale_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("flight_segments")
        .select("*")
        .eq("sale_id", form.sale_id)
        .order("segment_order");
      return data || [];
    },
  });

  // Sale payments
  const { data: salePayments = [] } = useQuery({
    queryKey: ["sale-payments-for-alt", form.sale_id],
    enabled: !!form.sale_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("sale_payments")
        .select("*")
        .eq("sale_id", form.sale_id);
      return data || [];
    },
  });

  // Passengers for selected sale
  const { data: salePassengers = [] } = useQuery({
    queryKey: ["passengers-for-alt", form.sale_id],
    enabled: !!form.sale_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("sale_passengers")
        .select("passenger_id, role, passengers(id, full_name)")
        .eq("sale_id", form.sale_id);
      return data || [];
    },
  });

  /* ─── Smart sale search ─── */
  const filteredSales = useMemo(() => {
    if (!saleSearch.trim()) return allSales.slice(0, 20);
    const q = saleSearch.toLowerCase();
    return allSales.filter((s: any) =>
      s.display_id?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.clients?.display_name?.toLowerCase().includes(q) ||
      s.clients?.email?.toLowerCase().includes(q) ||
      s.origin_iata?.toLowerCase().includes(q) ||
      s.destination_iata?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [allSales, saleSearch]);

  /* ─── When cost item selected, auto-fill profit ─── */
  const selectedCostItem = saleCostItems.find((c: any) => c.id === form.cost_item_id);
  const selectedSale = allSales.find((s: any) => s.id === form.sale_id);

  useEffect(() => {
    if (selectedCostItem) {
      const cost = selectedCostItem.total_item_cost || 0;
      // Estimate revenue proportionally from the sale's received value
      const totalCost = saleCostItems.reduce((s: number, c: any) => s + (c.total_item_cost || 0), 0);
      const saleRevenue = selectedSale?.received_value || 0;
      const proportion = totalCost > 0 ? (cost / totalCost) : 0;
      const productRevenue = saleRevenue * proportion;
      const profit = productRevenue - cost;

      setForm(f => ({
        ...f,
        product_cost: cost,
        original_value: Math.round(productRevenue * 100) / 100,
        agency_profit: Math.round(profit * 100) / 100,
        product_type: selectedCostItem.category === "aereo" ? "aereo" : selectedCostItem.category === "hotel" ? "hotel" : selectedCostItem.product_type || "outro",
        miles_program: selectedCostItem.miles_program || "",
        miles_used: selectedCostItem.miles_quantity || 0,
      }));
    }
  }, [form.cost_item_id, selectedCostItem, selectedSale, saleCostItems]);

  /* ─── Auto-calculate impact ─── */
  const profitImpact = form.client_refund_value > 0
    ? form.agency_profit - (form.client_refund_value - (form.supplier_refund_value || 0))
    : form.agency_profit;
  const isLoss = profitImpact < 0;
  const eliminatesProfit = form.client_refund_value > (form.original_value - form.agency_profit);

  /* ─── List filters ─── */
  const filtered = useMemo(() => {
    let result = alterations;
    if (filterStatus !== "all") result = result.filter((a: any) => a.status === filterStatus);
    if (filterType !== "all") result = result.filter((a: any) => a.alteration_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a: any) => {
        const sale = a.sales;
        return sale?.name?.toLowerCase().includes(q) || sale?.display_id?.toLowerCase().includes(q) || a.reason?.toLowerCase().includes(q);
      });
    }
    return result;
  }, [alterations, filterStatus, filterType, search]);

  const pending = alterations.filter((a: any) => ["solicitado", "aguardando_cia"].includes(a.status)).length;
  const refundPending = alterations.filter((a: any) => a.status === "reembolso_aprovado").length;
  const totalRefundValue = alterations.reduce((s: number, a: any) => s + (a.client_refund_value || 0), 0);
  const totalSupplierPending = alterations.filter((a: any) => a.supplier_refund_status === "pendente").reduce((s: number, a: any) => s + (a.supplier_refund_value || 0), 0);

  const resetForm = () => setForm({ ...EMPTY_FORM, affected_passengers: [] });

  const handleSave = async () => {
    if (!form.sale_id) { toast({ title: "Selecione uma venda", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase.from("trip_alterations").insert({
        sale_id: form.sale_id,
        alteration_type: form.alteration_type,
        product_type: form.product_type,
        cost_item_id: form.cost_item_id || null,
        reason: form.reason || null,
        description: form.description || null,
        original_value: form.original_value,
        product_cost: form.product_cost,
        agency_profit: form.agency_profit,
        profit_impact: profitImpact,
        penalty_value: form.penalty_value,
        refund_value: form.refund_value,
        credit_value: form.credit_value,
        client_refund_value: form.client_refund_value,
        miles_program: form.miles_program || null,
        miles_used: form.miles_used,
        miles_penalty: form.miles_penalty,
        miles_returned: form.miles_returned,
        refund_method: form.refund_method || null,
        refund_date: form.refund_date || null,
        refund_status: form.refund_status,
        pix_receiver_name: form.pix_receiver_name || null,
        pix_key: form.pix_key || null,
        pix_key_type: form.pix_key_type || null,
        pix_bank: form.pix_bank || null,
        supplier_refund_origin: form.supplier_refund_origin || null,
        supplier_refund_method: form.supplier_refund_method || null,
        supplier_refund_value: form.supplier_refund_value,
        supplier_refund_date: form.supplier_refund_date || null,
        supplier_settlement_ref: form.supplier_settlement_ref || null,
        affected_passengers: form.affected_passengers,
        refund_notes: form.refund_notes || null,
        notes: form.notes || null,
        created_by: user?.id,
        status: "solicitado",
      }).select("id").single();
      if (error) throw error;

      // Financial: client refund → accounts_payable
      if (form.client_refund_value > 0) {
        await supabase.from("accounts_payable").insert({
          sale_id: form.sale_id,
          description: `Reembolso cliente - ${ALTERATION_TYPES.find(t => t.value === form.alteration_type)?.label}`,
          value: form.client_refund_value,
          status: "pendente",
          due_date: form.refund_date || null,
          payment_method: form.refund_method || null,
          created_by: user?.id,
        });
      }

      // Financial: supplier refund → accounts_receivable
      if (form.supplier_refund_value > 0) {
        await supabase.from("accounts_receivable").insert({
          sale_id: form.sale_id,
          description: `Reembolso fornecedor - ${SUPPLIER_ORIGINS.find(o => o.value === form.supplier_refund_origin)?.label || ""}`,
          gross_value: form.supplier_refund_value,
          net_value: form.supplier_refund_value,
          status: "pendente",
          due_date: form.supplier_refund_date || null,
          payment_method: form.supplier_refund_method || null,
        });
      }

      // History
      if (inserted?.id) {
        await supabase.from("trip_alteration_history").insert({
          alteration_id: inserted.id,
          action: "criacao",
          details: `Alteração registrada: ${ALTERATION_TYPES.find(t => t.value === form.alteration_type)?.label}. Lucro produto: ${fmt(form.agency_profit)}, Impacto: ${fmt(profitImpact)}`,
          user_id: user?.id,
        });
      }

      // Cancel tasks on total cancellation
      if (form.alteration_type === "cancelamento_total") {
        await supabase.from("checkin_tasks").update({ status: "CANCELADO" }).eq("sale_id", form.sale_id).neq("status", "CONCLUIDO");
        await supabase.from("lodging_confirmation_tasks").update({ status: "CANCELADO" }).eq("sale_id", form.sale_id).neq("status", "CONFIRMADO");
      }

      toast({ title: "Alteração registrada com sucesso!" });
      setShowForm(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["trip-alterations"] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "concluido") { updates.resolved_at = new Date().toISOString(); updates.resolved_by = user?.id; }
      await supabase.from("trip_alterations").update(updates).eq("id", id);
      await supabase.from("trip_alteration_history").insert({ alteration_id: id, action: "status_change", details: `Status → ${STATUS_CONFIG[newStatus]?.label}`, user_id: user?.id });
      toast({ title: "Status atualizado!" });
      qc.invalidateQueries({ queryKey: ["trip-alterations"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 md:w-6 md:h-6" /> Alterações de Viagem
          </h1>
          <p className="text-xs text-muted-foreground">Cancelamentos, remarcações e reembolsos com proteção de margem</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1">
          <Plus className="w-4 h-4" /> Registrar Alteração
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-muted-foreground" /><span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</span></div>
          <p className="text-2xl font-bold text-foreground">{alterations.length}</p>
        </Card>
        <Card className={`p-3 ${pending > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pendentes</span></div>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </Card>
        <Card className={`p-3 ${refundPending > 0 ? "border-primary/50 bg-primary/5" : ""}`}>
          <div className="flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4 text-primary" /><span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Reembolsos pendentes</span></div>
          <p className="text-2xl font-bold text-primary">{refundPending}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-muted-foreground" /><span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total reembolsos</span></div>
          <p className="text-lg font-bold text-foreground">{fmt(totalRefundValue)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1"><Building2 className="w-4 h-4 text-muted-foreground" /><span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Aguardando fornecedor</span></div>
          <p className="text-lg font-bold text-foreground">{fmt(totalSupplierPending)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar venda, motivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {ALTERATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <RotateCcw className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma alteração registrada</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alt: any) => {
            const statusCfg = STATUS_CONFIG[alt.status] || STATUS_CONFIG.solicitado;
            const StatusIcon = statusCfg.icon;
            const typeCfg = ALTERATION_TYPES.find(t => t.value === alt.alteration_type);
            const prodCfg = PRODUCT_TYPES.find(p => p.value === alt.product_type);
            const ProdIcon = prodCfg?.icon || FileText;
            const sale = alt.sales;
            const impact = alt.profit_impact ?? 0;

            return (
              <Card key={alt.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    {alt.alteration_type.includes("cancelamento") ? <Ban className="w-5 h-5 text-destructive" /> : <RotateCcw className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{typeCfg?.label || alt.alteration_type}</span>
                      <Badge variant="outline" className={`text-[10px] gap-1 ${statusCfg.color}`}><StatusIcon className="w-3 h-3" /> {statusCfg.label}</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1"><ProdIcon className="w-3 h-3" /> {prodCfg?.label}</Badge>
                    </div>
                    {sale && (
                      <p className="text-xs text-muted-foreground">
                        Venda: <button onClick={() => navigate(`/sales/${sale.id}`)} className="font-mono font-bold text-primary hover:underline">{sale.display_id}</button> — {sale.name}
                        {sale.origin_iata && sale.destination_iata && <span className="ml-2">{sale.origin_iata} → {sale.destination_iata}</span>}
                      </p>
                    )}
                    {alt.reason && <p className="text-xs text-muted-foreground">{alt.reason}</p>}
                    <div className="flex flex-wrap gap-4 text-xs">
                      {alt.original_value > 0 && <span className="text-muted-foreground">Cliente pagou: <span className="font-bold text-foreground">{fmt(alt.original_value)}</span></span>}
                      {alt.agency_profit > 0 && <span className="text-muted-foreground">Lucro produto: <span className="font-bold text-emerald-600">{fmt(alt.agency_profit)}</span></span>}
                      {alt.penalty_value > 0 && <span className="text-muted-foreground">Multa: <span className="font-bold text-destructive">{fmt(alt.penalty_value)}</span></span>}
                      {alt.client_refund_value > 0 && <span className="text-muted-foreground">Reembolso cliente: <span className="font-bold text-primary">{fmt(alt.client_refund_value)}</span></span>}
                      {alt.supplier_refund_value > 0 && <span className="text-muted-foreground">Fornecedor: <span className="font-bold text-foreground">{fmt(alt.supplier_refund_value)}</span></span>}
                      {impact !== 0 && (
                        <span className={`font-bold flex items-center gap-1 ${impact >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {impact >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {fmt(impact)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{formatDateBR(alt.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {alt.status === "solicitado" && <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => updateStatus(alt.id, "aguardando_cia")}>Aguardando Cia</Button>}
                    {alt.status === "aguardando_cia" && <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => updateStatus(alt.id, "reembolso_aprovado")}>Aprovar</Button>}
                    {alt.status === "reembolso_aprovado" && <Button size="sm" variant="default" className="text-[10px] h-7" onClick={() => updateStatus(alt.id, "reembolso_realizado")}>Reembolso Feito</Button>}
                    {!["concluido", "cancelado"].includes(alt.status) && <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => updateStatus(alt.id, "concluido")}>Concluir</Button>}
                    {sale && <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => navigate(`/sales/${sale.id}`)}><Eye className="w-3 h-3" /></Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── CREATE DIALOG ─── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Registrar Alteração de Viagem</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* ── STEP 1: Sale search ── */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Localizar Venda</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por cliente, venda, destino, email..." value={saleSearch} onChange={e => setSaleSearch(e.target.value)} className="pl-9 h-10" />
              </div>
              {!form.sale_id && (
                <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                  {filteredSales.map((s: any) => (
                    <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-muted/50 flex justify-between items-center text-xs" onClick={() => {
                      setForm(f => ({ ...f, sale_id: s.id }));
                      setSaleSearch(s.display_id + " — " + s.name);
                    }}>
                      <div>
                        <span className="font-mono font-bold text-primary">{s.display_id}</span>
                        <span className="ml-2 text-foreground">{s.name}</span>
                        {s.clients?.display_name && <span className="ml-2 text-muted-foreground">({s.clients.display_name})</span>}
                      </div>
                      <span className="text-muted-foreground">{s.origin_iata && s.destination_iata ? `${s.origin_iata} → ${s.destination_iata}` : ""}</span>
                    </button>
                  ))}
                  {filteredSales.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma venda encontrada</p>}
                </div>
              )}
              {form.sale_id && selectedSale && (
                <Card className="p-3 bg-primary/5 border-primary/20 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-mono font-bold text-primary">{selectedSale.display_id}</span>
                    <span className="ml-2 font-semibold text-foreground">{selectedSale.name}</span>
                    {selectedSale.clients?.display_name && <span className="ml-2 text-muted-foreground">({selectedSale.clients.display_name})</span>}
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => { setForm(f => ({ ...f, sale_id: "", cost_item_id: "", affected_passengers: [] })); setSaleSearch(""); }}>Trocar</Button>
                </Card>
              )}
            </div>

            {form.sale_id && (
              <>
                {/* ── STEP 2: Product selection ── */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Produto Afetado</Label>
                  {saleCostItems.length > 0 ? (
                    <div className="grid gap-2">
                      {saleCostItems.map((ci: any) => {
                        const isSelected = form.cost_item_id === ci.id;
                        const PIcon = PRODUCT_TYPES.find(p => p.value === ci.category)?.icon || FileText;
                        return (
                          <button key={ci.id} onClick={() => setForm(f => ({ ...f, cost_item_id: ci.id }))}
                            className={`text-left border rounded-lg p-3 transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}>
                            <div className="flex items-center gap-2">
                              <PIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs font-semibold text-foreground">{ci.category} — {ci.description || "Sem descrição"}</span>
                              <span className="ml-auto text-xs font-bold text-foreground">{fmt(ci.total_item_cost || 0)}</span>
                            </div>
                            {(ci as any).suppliers?.name && <p className="text-[10px] text-muted-foreground mt-1">Fornecedor: {(ci as any).suppliers.name}</p>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Select value={form.product_type} onValueChange={v => setForm(f => ({ ...f, product_type: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* ── STEP 3: Profit display (margin protection) ── */}
                {(form.cost_item_id || form.original_value > 0) && (
                  <Card className="p-4 border-2 border-emerald-500/30 bg-emerald-500/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> Resumo Financeiro do Produto
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Valor pago pelo cliente</p>
                        <p className="text-lg font-bold text-foreground">{fmt(form.original_value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Custo real</p>
                        <p className="text-lg font-bold text-foreground">{fmt(form.product_cost)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Lucro NatLeva</p>
                        <p className={`text-lg font-bold ${form.agency_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(form.agency_profit)}</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* ── Passengers ── */}
                {salePassengers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Passageiros Afetados</Label>
                    <div className="grid gap-1.5">
                      {salePassengers.map((sp: any) => {
                        const p = sp.passengers;
                        if (!p) return null;
                        const isChecked = form.affected_passengers.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center gap-2 text-xs p-2 border rounded hover:bg-muted/50 cursor-pointer">
                            <Checkbox checked={isChecked} onCheckedChange={(checked) => {
                              setForm(f => ({
                                ...f,
                                affected_passengers: checked ? [...f.affected_passengers, p.id] : f.affected_passengers.filter(id => id !== p.id),
                              }));
                            }} />
                            <span className="font-medium text-foreground">{p.full_name}</span>
                            {sp.role && <Badge variant="outline" className="text-[10px]">{sp.role}</Badge>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Type + Reason ── */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo de alteração</Label>
                    <Select value={form.alteration_type} onValueChange={v => setForm(f => ({ ...f, alteration_type: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{ALTERATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Motivo</Label>
                    <Input className="h-9" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex: Motivos pessoais" />
                  </div>
                </div>
                {(form.alteration_type === "remarcacao_voo" || form.alteration_type === "alteracao_datas") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nova data do voo</Label>
                    <Input type="date" className="h-9" value={form.new_flight_date} onChange={e => setForm(f => ({ ...f, new_flight_date: e.target.value }))} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Descrição detalhada</Label>
                  <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                {/* ── Financial: Penalties & Refund from supplier ── */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condições do Fornecedor</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Multa aplicada</Label>
                      <Input type="number" step="0.01" className="h-9" value={form.penalty_value || ""} onChange={e => setForm(f => ({ ...f, penalty_value: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor reembolsado pela cia</Label>
                      <Input type="number" step="0.01" className="h-9" value={form.refund_value || ""} onChange={e => setForm(f => ({ ...f, refund_value: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Crédito (voucher/futuro)</Label>
                      <Input type="number" step="0.01" className="h-9" value={form.credit_value || ""} onChange={e => setForm(f => ({ ...f, credit_value: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Valor a devolver ao cliente</Label>
                      <Input type="number" step="0.01" className="h-9 border-primary" value={form.client_refund_value || ""} onChange={e => setForm(f => ({ ...f, client_refund_value: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                    const calc = Math.max(0, form.refund_value - form.penalty_value);
                    setForm(f => ({ ...f, client_refund_value: calc }));
                  }}>Calcular reembolso automático</Button>
                </div>

                {/* ── Margin protection alert ── */}
                {form.client_refund_value > 0 && (
                  <Card className={`p-4 border-2 ${eliminatesProfit ? "border-destructive/50 bg-destructive/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                    {eliminatesProfit && (
                      <div className="flex items-center gap-2 mb-3 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-xs font-bold">
                          {isLoss ? `Atenção: este reembolso gera prejuízo de ${fmt(Math.abs(profitImpact))}` : "Atenção: este reembolso elimina o lucro da NatLeva nesta operação."}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Cliente receberá</p>
                        <p className="text-lg font-bold text-primary">{fmt(form.client_refund_value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Fornecedor devolverá</p>
                        <p className="text-lg font-bold text-foreground">{fmt(form.supplier_refund_value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Impacto no lucro</p>
                        <p className={`text-lg font-bold flex items-center justify-center gap-1 ${profitImpact >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {profitImpact >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {fmt(profitImpact)}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* ── Miles ── */}
                {(form.product_type === "aereo" || form.miles_used > 0 || selectedCostItem?.miles_quantity > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Milhas</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">Programa</Label><Input className="h-9" value={form.miles_program} onChange={e => setForm(f => ({ ...f, miles_program: e.target.value }))} placeholder="Ex: Smiles" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Milhas utilizadas</Label><Input type="number" className="h-9" value={form.miles_used || ""} onChange={e => setForm(f => ({ ...f, miles_used: parseInt(e.target.value) || 0 }))} /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Multa em milhas</Label><Input type="number" className="h-9" value={form.miles_penalty || ""} onChange={e => setForm(f => ({ ...f, miles_penalty: parseInt(e.target.value) || 0 }))} /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Milhas devolvidas</Label><Input type="number" className="h-9" value={form.miles_returned || ""} onChange={e => setForm(f => ({ ...f, miles_returned: parseInt(e.target.value) || 0 }))} /></div>
                    </div>
                  </div>
                )}

                {/* ── Client refund details ── */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reembolso ao Cliente</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Forma de reembolso</Label>
                      <Select value={form.refund_method} onValueChange={v => setForm(f => ({ ...f, refund_method: v }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>{REFUND_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data prevista do reembolso</Label>
                      <Input type="date" className="h-9" value={form.refund_date} onChange={e => setForm(f => ({ ...f, refund_date: e.target.value }))} />
                    </div>
                  </div>
                  {/* PIX fields */}
                  {form.refund_method === "pix" && (
                    <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
                      <div className="space-y-1.5"><Label className="text-xs">Nome do recebedor</Label><Input className="h-9" value={form.pix_receiver_name} onChange={e => setForm(f => ({ ...f, pix_receiver_name: e.target.value }))} /></div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo de chave</Label>
                        <Select value={form.pix_key_type} onValueChange={v => setForm(f => ({ ...f, pix_key_type: v }))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                          <SelectContent>{PIX_KEY_TYPES.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs">Chave PIX</Label><Input className="h-9" value={form.pix_key} onChange={e => setForm(f => ({ ...f, pix_key: e.target.value }))} /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Banco (opcional)</Label><Input className="h-9" value={form.pix_bank} onChange={e => setForm(f => ({ ...f, pix_bank: e.target.value }))} /></div>
                    </div>
                  )}
                </div>

                {/* ── Supplier refund origin ── */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Origem do Reembolso para NatLeva</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Origem do reembolso</Label>
                      <Select value={form.supplier_refund_origin} onValueChange={v => setForm(f => ({ ...f, supplier_refund_origin: v }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>{SUPPLIER_ORIGINS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Forma de reembolso do fornecedor</Label>
                      <Select value={form.supplier_refund_method} onValueChange={v => setForm(f => ({ ...f, supplier_refund_method: v }))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>{SUPPLIER_REFUND_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor esperado do fornecedor</Label>
                      <Input type="number" step="0.01" className="h-9" value={form.supplier_refund_value || ""} onChange={e => setForm(f => ({ ...f, supplier_refund_value: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data prevista recebimento</Label>
                      <Input type="date" className="h-9" value={form.supplier_refund_date} onChange={e => setForm(f => ({ ...f, supplier_refund_date: e.target.value }))} />
                    </div>
                  </div>
                  {form.supplier_refund_method === "abatimento_fechamento" && (
                    <div className="space-y-1.5 p-3 border rounded-lg bg-muted/30">
                      <Label className="text-xs">Referência do fechamento</Label>
                      <Input className="h-9" value={form.supplier_settlement_ref} onChange={e => setForm(f => ({ ...f, supplier_settlement_ref: e.target.value }))} placeholder="Ex: Fechamento quinzenal junho" />
                    </div>
                  )}
                </div>

                {/* ── Notes ── */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas internas..." />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.sale_id} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Registrar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
