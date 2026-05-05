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
import TariffConditionsCard, { type TariffCondition, EMPTY_TARIFF } from "@/components/TariffConditionsCard";
import {
import { DatePartsInput } from "@/components/ui/date-parts-input";
  AlertTriangle, Plus, Search, Eye, Clock, CheckCircle2, XCircle, RotateCcw,
  Ban, CreditCard, Plane, Hotel, Shield, FileText, ArrowRight, Loader2,
  TrendingDown, TrendingUp, DollarSign, Users, AlertCircle, Building2, Car, Ticket,
} from "lucide-react";

/* ─── Constants ─── */
const ALTERATION_TYPES = [
  { value: "cancelamento", label: "Cancelamento" },
  { value: "remarcacao", label: "Remarcação" },
  { value: "alteracao_data", label: "Alteração de data" },
  { value: "alteracao_passageiro", label: "Alteração de passageiro" },
  { value: "alteracao_rota", label: "Alteração de rota" },
  { value: "upgrade_downgrade", label: "Upgrade / Downgrade" },
  { value: "reemissao", label: "Reemissão" },
  { value: "alteracao_parcial", label: "Alteração parcial" },
  { value: "outro", label: "Outro" },
];

const PRODUCT_TYPES = [
  { value: "aereo", label: "Aéreo", icon: Plane },
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "transfer", label: "Transfer", icon: Car },
  { value: "seguro", label: "Seguro", icon: Shield },
  { value: "passeio", label: "Passeio", icon: Ticket },
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
  { value: "hotel", label: "Hotel" },
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

/* ─── Per-item alteration form ─── */
interface ItemAlteration {
  cost_item_id: string;
  product_type: string;
  product_label: string;
  alteration_type: string;
  affected_passengers: string[];
  penalty_value: number;
  refund_value: number;
  credit_value: number;
  client_refund_value: number;
  new_flight_date: string;
  reason: string;
  description: string;
  original_value: number;
  product_cost: number;
  agency_profit: number;
  // tariff from DB
  tariff: TariffCondition | null;
}

const EMPTY_ITEM_ALT = (): ItemAlteration => ({
  cost_item_id: "", product_type: "aereo", product_label: "",
  alteration_type: "cancelamento", affected_passengers: [],
  penalty_value: 0, refund_value: 0, credit_value: 0, client_refund_value: 0,
  new_flight_date: "", reason: "", description: "",
  original_value: 0, product_cost: 0, agency_profit: 0, tariff: null,
});

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
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [step, setStep] = useState(1);

  // Multi-item selection
  const [selectedCostItemIds, setSelectedCostItemIds] = useState<string[]>([]);
  const [itemAlterations, setItemAlterations] = useState<ItemAlteration[]>([]);

  // Global refund fields
  const [refundMethod, setRefundMethod] = useState("");
  const [refundDate, setRefundDate] = useState("");
  const [pixReceiverName, setPixReceiverName] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [pixBank, setPixBank] = useState("");
  const [supplierRefundOrigin, setSupplierRefundOrigin] = useState("");
  const [supplierRefundMethod, setSupplierRefundMethod] = useState("");
  const [supplierRefundValue, setSupplierRefundValue] = useState(0);
  const [supplierRefundDate, setSupplierRefundDate] = useState("");
  const [supplierSettlementRef, setSupplierSettlementRef] = useState("");
  const [notes, setNotes] = useState("");

  // Miles
  const [milesProgram, setMilesProgram] = useState("");
  const [milesUsed, setMilesUsed] = useState(0);
  const [milesPenalty, setMilesPenalty] = useState(0);
  const [milesReturned, setMilesReturned] = useState(0);

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

  const { data: milesPrograms = [] } = useQuery({
    queryKey: ["all-miles-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("supplier_miles_programs").select("program_name").eq("is_active", true);
      return [...new Set((data || []).map((d: any) => d.program_name))].sort() as string[];
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

  const { data: saleCostItems = [] } = useQuery({
    queryKey: ["cost-items-for-alt", selectedSaleId],
    enabled: !!selectedSaleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cost_items")
        .select("id, category, description, total_item_cost, cash_value, miles_cost_brl, miles_quantity, miles_program, product_type, supplier_id, reservation_code, emission_source, taxes, suppliers(name)")
        .eq("sale_id", selectedSaleId);
      return data || [];
    },
  });

  const { data: saleFlightSegments = [] } = useQuery({
    queryKey: ["flight-segments-for-alt", selectedSaleId],
    enabled: !!selectedSaleId,
    queryFn: async () => {
      const { data } = await supabase.from("flight_segments").select("*").eq("sale_id", selectedSaleId).order("segment_order");
      return data || [];
    },
  });

  const { data: salePassengers = [] } = useQuery({
    queryKey: ["passengers-for-alt", selectedSaleId],
    enabled: !!selectedSaleId,
    queryFn: async () => {
      const { data } = await supabase.from("sale_passengers").select("passenger_id, role, passengers(id, full_name)").eq("sale_id", selectedSaleId);
      return data || [];
    },
  });

  const { data: saleTariffConditions = [] } = useQuery({
    queryKey: ["tariff-conditions-for-alt", selectedSaleId],
    enabled: !!selectedSaleId,
    queryFn: async () => {
      const { data } = await supabase.from("tariff_conditions").select("*").eq("sale_id", selectedSaleId);
      return data || [];
    },
  });

  const selectedSale = allSales.find((s: any) => s.id === selectedSaleId);

  /* ─── Smart sale search ─── */
  const filteredSales = useMemo(() => {
    if (!saleSearch.trim()) return allSales.slice(0, 20);
    const q = saleSearch.toLowerCase();
    return allSales.filter((s: any) =>
      s.display_id?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) ||
      s.clients?.display_name?.toLowerCase().includes(q) || s.clients?.email?.toLowerCase().includes(q) ||
      s.origin_iata?.toLowerCase().includes(q) || s.destination_iata?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [allSales, saleSearch]);

  /* ─── When cost items selected, build item alterations ─── */
  const handleToggleCostItem = (id: string) => {
    setSelectedCostItemIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // Sync itemAlterations
      setItemAlterations(current => {
        const result: ItemAlteration[] = [];
        for (const cid of next) {
          const existing = current.find(a => a.cost_item_id === cid);
          if (existing) {
            result.push(existing);
          } else {
            const ci = saleCostItems.find((c: any) => c.id === cid);
            if (ci) {
              const totalCost = saleCostItems.reduce((s: number, c: any) => s + (c.total_item_cost || 0), 0);
              const saleRevenue = selectedSale?.received_value || 0;
              const cost = ci.total_item_cost || 0;
              const proportion = totalCost > 0 ? (cost / totalCost) : 0;
              const productRevenue = saleRevenue * proportion;
              const profit = productRevenue - cost;

              // Find tariff condition for this product type
              const tariffRow = saleTariffConditions.find((t: any) =>
                t.cost_item_id === cid || t.product_type === ci.category
              );
              const tariff: TariffCondition | null = tariffRow ? {
                fare_name: tariffRow.fare_name || "",
                is_refundable: tariffRow.is_refundable || "nao_reembolsavel",
                alteration_allowed: tariffRow.alteration_allowed || false,
                cancellation_allowed: tariffRow.cancellation_allowed || false,
                refund_type: tariffRow.refund_type || "nao_reembolsavel",
                penalty_type: tariffRow.penalty_type || "sem_multa",
                penalty_percent: tariffRow.penalty_percent || 0,
                penalty_fixed_value: tariffRow.penalty_fixed_value || 0,
                fare_difference_applies: tariffRow.fare_difference_applies || false,
                penalty_plus_fare_difference: tariffRow.penalty_plus_fare_difference || false,
                cancellation_deadline: tariffRow.cancellation_deadline || "",
                alteration_deadline: tariffRow.alteration_deadline || "",
                credit_voucher_allowed: tariffRow.credit_voucher_allowed || false,
                credit_miles_allowed: tariffRow.credit_miles_allowed || false,
                observations: tariffRow.observations || "",
              } : null;

              result.push({
                ...EMPTY_ITEM_ALT(),
                cost_item_id: cid,
                product_type: ci.category || "outro",
                product_label: `${ci.category} — ${ci.description || "Sem descrição"}`,
                original_value: Math.round(productRevenue * 100) / 100,
                product_cost: cost,
                agency_profit: Math.round(profit * 100) / 100,
                tariff,
              });
            }
          }
        }
        return result;
      });
      return next;
    });
  };

  const updateItemAlt = (idx: number, field: string, value: any) => {
    setItemAlterations(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const toggleItemPassenger = (idx: number, passengerId: string) => {
    setItemAlterations(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const has = item.affected_passengers.includes(passengerId);
      return { ...item, affected_passengers: has ? item.affected_passengers.filter(id => id !== passengerId) : [...item.affected_passengers, passengerId] };
    }));
  };

  /* ─── Totals ─── */
  const totalClientRefund = itemAlterations.reduce((s, a) => s + a.client_refund_value, 0);
  const totalAgencyProfit = itemAlterations.reduce((s, a) => s + a.agency_profit, 0);
  const profitImpact = totalClientRefund > 0 ? totalAgencyProfit - (totalClientRefund - supplierRefundValue) : totalAgencyProfit;

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

  const resetForm = () => {
    setSelectedSaleId(""); setSaleSearch(""); setStep(1);
    setSelectedCostItemIds([]); setItemAlterations([]);
    setRefundMethod(""); setRefundDate("");
    setPixReceiverName(""); setPixKey(""); setPixKeyType(""); setPixBank("");
    setSupplierRefundOrigin(""); setSupplierRefundMethod("");
    setSupplierRefundValue(0); setSupplierRefundDate(""); setSupplierSettlementRef("");
    setNotes(""); setMilesProgram(""); setMilesUsed(0); setMilesPenalty(0); setMilesReturned(0);
  };

  const handleSave = async () => {
    if (!selectedSaleId) { toast({ title: "Selecione uma venda", variant: "destructive" }); return; }
    if (itemAlterations.length === 0) { toast({ title: "Selecione ao menos um item", variant: "destructive" }); return; }
    setSaving(true);
    try {
      // Save one trip_alteration per item
      for (const item of itemAlterations) {
        const impact = item.client_refund_value > 0 ? item.agency_profit - (item.client_refund_value - (supplierRefundValue / itemAlterations.length)) : item.agency_profit;

        const { data: inserted, error } = await supabase.from("trip_alterations").insert({
          sale_id: selectedSaleId,
          alteration_type: item.alteration_type,
          product_type: item.product_type,
          cost_item_id: item.cost_item_id || null,
          reason: item.reason || null,
          description: item.description || null,
          original_value: item.original_value,
          product_cost: item.product_cost,
          agency_profit: item.agency_profit,
          profit_impact: impact,
          penalty_value: item.penalty_value,
          refund_value: item.refund_value,
          credit_value: item.credit_value,
          client_refund_value: item.client_refund_value,
          miles_program: milesProgram || null,
          miles_used: milesUsed, miles_penalty: milesPenalty, miles_returned: milesReturned,
          refund_method: refundMethod || null,
          refund_date: refundDate || null,
          refund_status: "programado",
          pix_receiver_name: pixReceiverName || null,
          pix_key: pixKey || null, pix_key_type: pixKeyType || null, pix_bank: pixBank || null,
          supplier_refund_origin: supplierRefundOrigin || null,
          supplier_refund_method: supplierRefundMethod || null,
          supplier_refund_value: supplierRefundValue / itemAlterations.length,
          supplier_refund_date: supplierRefundDate || null,
          supplier_settlement_ref: supplierSettlementRef || null,
          affected_passengers: item.affected_passengers,
          new_flight_date: item.new_flight_date || null,
          notes: notes || null,
          created_by: user?.id,
          status: "solicitado",
        }).select("id").single();
        if (error) throw error;

        if (inserted?.id) {
          await supabase.from("trip_alteration_history").insert({
            alteration_id: inserted.id, action: "criacao",
            details: `${ALTERATION_TYPES.find(t => t.value === item.alteration_type)?.label} — ${item.product_label}. Lucro: ${fmt(item.agency_profit)}`,
            user_id: user?.id,
          });
        }

        // Financial entries per item
        if (item.client_refund_value > 0) {
          await supabase.from("accounts_payable").insert({
            sale_id: selectedSaleId,
            description: `Reembolso cliente - ${item.product_label}`,
            value: item.client_refund_value, status: "pendente",
            due_date: refundDate || null, payment_method: refundMethod || null, created_by: user?.id,
          });
        }
      }

      // Supplier refund (global)
      if (supplierRefundValue > 0) {
        await supabase.from("accounts_receivable").insert({
          sale_id: selectedSaleId,
          description: `Reembolso fornecedor - ${itemAlterations.map(a => a.product_label).join(", ")}`,
          gross_value: supplierRefundValue, net_value: supplierRefundValue,
          status: "pendente", due_date: supplierRefundDate || null,
          payment_method: supplierRefundMethod || null,
        });
      }

      // Check if all items are cancellation → cancel sale
      const allCancel = itemAlterations.every(a => a.alteration_type === "cancelamento");
      const allItems = saleCostItems.length > 0 && selectedCostItemIds.length === saleCostItems.length;
      if (allCancel && allItems) {
        await Promise.all([
          supabase.from("checkin_tasks").update({ status: "CANCELADO" }).eq("sale_id", selectedSaleId).neq("status", "CONCLUIDO"),
          supabase.from("lodging_confirmation_tasks").update({ status: "CANCELADO" }).eq("sale_id", selectedSaleId).neq("status", "CONFIRMADO"),
          supabase.from("sales").update({ status: "Cancelado" }).eq("id", selectedSaleId),
          supabase.from("accounts_receivable").update({ status: "cancelado" }).eq("sale_id", selectedSaleId).neq("status", "recebido"),
        ]);
      }

      toast({ title: "Alteração registrada com sucesso!" });
      setShowForm(false); resetForm();
      qc.invalidateQueries({ queryKey: ["trip-alterations"] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
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
          <p className="text-xs text-muted-foreground">Cancelamentos, remarcações e reembolsos por item com proteção de margem</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1">
          <Plus className="w-4 h-4" /> Registrar Alteração
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs">
                      {alt.agency_profit > 0 && <span className="text-muted-foreground">Lucro: <span className="font-bold text-emerald-600">{fmt(alt.agency_profit)}</span></span>}
                      {alt.client_refund_value > 0 && <span className="text-muted-foreground">Reembolso: <span className="font-bold text-primary">{fmt(alt.client_refund_value)}</span></span>}
                      {impact !== 0 && (
                        <span className={`font-bold flex items-center gap-1 ${impact >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {impact >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {fmt(impact)}
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
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Registrar Alteração de Viagem</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {[
              { n: 1, label: "Localizar Venda" },
              { n: 2, label: "Selecionar Itens" },
              { n: 3, label: "Detalhar Alteração" },
              { n: 4, label: "Financeiro" },
            ].map(s => (
              <button key={s.n} onClick={() => { if (s.n <= step || (s.n === 2 && selectedSaleId) || s.n <= step) setStep(s.n); }}
                className={`flex items-center gap-1 px-2 py-1 rounded ${step === s.n ? "bg-primary/10 text-primary font-bold" : step > s.n ? "text-emerald-600" : ""}`}>
                {step > s.n ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-4 h-4 rounded-full border text-center leading-4 text-[10px]">{s.n}</span>}
                {s.label}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {/* ── STEP 1: Sale search ── */}
            {step === 1 && (
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Localizar Venda</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar por cliente, nº venda, destino, email, passageiro..." value={saleSearch} onChange={e => setSaleSearch(e.target.value)} className="pl-9 h-10" />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                  {filteredSales.map((s: any) => {
                    const isSelected = selectedSaleId === s.id;
                    return (
                      <button key={s.id} className={`w-full text-left px-3 py-2.5 flex justify-between items-center text-xs ${isSelected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/50"}`}
                        onClick={() => { setSelectedSaleId(s.id); setSaleSearch(s.display_id + " — " + s.name); }}>
                        <div>
                          <span className="font-mono font-bold text-primary">{s.display_id}</span>
                          <span className="ml-2 text-foreground">{s.name}</span>
                          {s.clients?.display_name && <span className="ml-2 text-muted-foreground">({s.clients.display_name})</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {s.origin_iata && s.destination_iata && <span className="text-muted-foreground">{s.origin_iata} → {s.destination_iata}</span>}
                          {s.received_value > 0 && <span className="font-bold text-foreground">{fmt(s.received_value)}</span>}
                        </div>
                      </button>
                    );
                  })}
                  {filteredSales.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma venda encontrada</p>}
                </div>

                {selectedSaleId && selectedSale && (
                  <>
                    {/* Financial summary */}
                    {(() => {
                      const revenue = selectedSale.received_value || 0;
                      const cost = selectedSale.total_cost || 0;
                      const profit = revenue - cost;
                      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
                      return (
                        <Card className={`p-4 border-2 ${profit >= 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" /> Resumo Financeiro da Venda
                          </h4>
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div><p className="text-[10px] text-muted-foreground">Receita</p><p className="text-lg font-bold text-foreground">{fmt(revenue)}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Custo</p><p className="text-lg font-bold text-foreground">{fmt(cost)}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Lucro</p><p className={`text-xl font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(profit)}</p></div>
                            <div><p className="text-[10px] text-muted-foreground">Margem</p><p className={`text-lg font-bold ${margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>{margin.toFixed(1)}%</p></div>
                          </div>
                        </Card>
                      );
                    })()}
                    <Button onClick={() => setStep(2)} className="w-full">Avançar — Selecionar Itens <ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 2: Select items ── */}
            {step === 2 && selectedSaleId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecionar Itens Afetados</Label>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(1)}>← Voltar</Button>
                </div>
                <p className="text-xs text-muted-foreground">Marque um ou mais produtos da viagem que serão alterados/cancelados.</p>

                {saleCostItems.length > 0 ? (
                  <div className="space-y-2">
                    {saleCostItems.map((ci: any) => {
                      const isSelected = selectedCostItemIds.includes(ci.id);
                      const PIcon = PRODUCT_TYPES.find(p => p.value === ci.category)?.icon || FileText;
                      const segments = ci.category === "aereo" ? saleFlightSegments : [];
                      const tariff = saleTariffConditions.find((t: any) => t.cost_item_id === ci.id || t.product_type === ci.category);

                      return (
                        <Card key={ci.id} className={`p-3 cursor-pointer transition-all ${isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : "hover:bg-muted/30"}`}
                          onClick={() => handleToggleCostItem(ci.id)}>
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} className="pointer-events-none" />
                            <PIcon className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <span className="text-xs font-semibold text-foreground">{ci.category} — {ci.description || "Sem descrição"}</span>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                                {(ci as any).suppliers?.name && <span className="text-[10px] text-muted-foreground">Fornecedor: <strong className="text-foreground">{(ci as any).suppliers.name}</strong></span>}
                                {ci.reservation_code && <span className="text-[10px] text-muted-foreground">Loc: <strong className="font-mono text-foreground">{ci.reservation_code}</strong></span>}
                                {ci.miles_quantity > 0 && <span className="text-[10px] text-muted-foreground">Milhas: <strong className="text-foreground">{ci.miles_quantity?.toLocaleString()}</strong></span>}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-foreground">{fmt(ci.total_item_cost || 0)}</span>
                          </div>

                          {/* Show flight segments if aéreo and selected */}
                          {isSelected && segments.length > 0 && (
                            <div className="mt-2 pt-2 border-t space-y-1 pl-8">
                              {segments.map((seg: any) => (
                                <div key={seg.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <Plane className="w-3 h-3" />
                                  <span className="font-mono font-bold text-foreground">{seg.flight_number || "—"}</span>
                                  <span>{seg.origin_iata} → {seg.destination_iata}</span>
                                  {seg.departure_date && <span>{new Date(seg.departure_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Show tariff summary if exists */}
                          {isSelected && tariff && (
                            <div className="mt-2 pl-8">
                              <TariffConditionsCard value={{
                                fare_name: tariff.fare_name || "", is_refundable: tariff.is_refundable || "nao_reembolsavel",
                                alteration_allowed: tariff.alteration_allowed || false, cancellation_allowed: tariff.cancellation_allowed || false,
                                refund_type: tariff.refund_type || "nao_reembolsavel", penalty_type: tariff.penalty_type || "sem_multa",
                                penalty_percent: tariff.penalty_percent || 0, penalty_fixed_value: tariff.penalty_fixed_value || 0,
                                fare_difference_applies: tariff.fare_difference_applies || false, penalty_plus_fare_difference: tariff.penalty_plus_fare_difference || false,
                                cancellation_deadline: tariff.cancellation_deadline || "", alteration_deadline: tariff.alteration_deadline || "",
                                credit_voucher_allowed: tariff.credit_voucher_allowed || false, credit_miles_allowed: tariff.credit_miles_allowed || false,
                                observations: tariff.observations || "",
                              }} onChange={() => {}} readOnly />
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-6 text-center text-xs text-muted-foreground">Nenhum item de custo cadastrado nesta venda. Registre o produto manualmente.</Card>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Voltar</Button>
                  <Button onClick={() => setStep(3)} disabled={selectedCostItemIds.length === 0} className="flex-1">
                    Avançar — Detalhar ({selectedCostItemIds.length} item{selectedCostItemIds.length !== 1 ? "s" : ""}) <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Detail per item ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalhar Alteração por Item</Label>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(2)}>← Voltar</Button>
                </div>

                {itemAlterations.map((item, idx) => {
                  const PIcon = PRODUCT_TYPES.find(p => p.value === item.product_type)?.icon || FileText;
                  return (
                    <Card key={item.cost_item_id} className="p-4 space-y-4 border-l-4 border-primary/40">
                      {/* Item header */}
                      <div className="flex items-center gap-2">
                        <PIcon className="w-5 h-5 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">{item.product_label}</h4>
                        <Badge variant="outline" className="text-[10px] ml-auto">{fmt(item.product_cost)}</Badge>
                      </div>

                      {/* Tariff conditions display */}
                      {item.tariff && item.tariff.fare_name && (
                        <TariffConditionsCard value={item.tariff} onChange={() => {}} readOnly productLabel="Regras cadastradas" />
                      )}

                      {/* Financial summary */}
                      <div className="grid grid-cols-3 gap-3 text-center bg-muted/30 rounded-lg p-3">
                        <div><p className="text-[10px] text-muted-foreground">Valor pago</p><p className="text-sm font-bold text-foreground">{fmt(item.original_value)}</p></div>
                        <div><p className="text-[10px] text-muted-foreground">Custo real</p><p className="text-sm font-bold text-foreground">{fmt(item.product_cost)}</p></div>
                        <div><p className="text-[10px] text-muted-foreground">Lucro NatLeva</p><p className={`text-sm font-bold ${item.agency_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(item.agency_profit)}</p></div>
                      </div>

                      {/* Alteration type + reason */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Tipo de alteração</Label>
                          <Select value={item.alteration_type} onValueChange={v => updateItemAlt(idx, "alteration_type", v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>{ALTERATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Motivo</Label>
                          <Input className="h-9" value={item.reason} onChange={e => updateItemAlt(idx, "reason", e.target.value)} placeholder="Ex: Motivos pessoais" />
                        </div>
                      </div>

                      {(item.alteration_type === "remarcacao" || item.alteration_type === "alteracao_data") && (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Nova data</Label>
                          <DatePartsInput value={item.new_flight_date} onChange={(iso) => updateItemAlt(idx, "new_flight_date", iso)} inputClassName="h-9" />
                        </div>
                      )}

                      {/* Passengers affected */}
                      {salePassengers.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Passageiros afetados neste item</Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {salePassengers.map((sp: any) => {
                              const p = sp.passengers;
                              if (!p) return null;
                              const isChecked = item.affected_passengers.includes(p.id);
                              return (
                                <label key={p.id} className="flex items-center gap-2 text-xs p-2 border rounded hover:bg-muted/50 cursor-pointer">
                                  <Checkbox checked={isChecked} onCheckedChange={() => toggleItemPassenger(idx, p.id)} />
                                  <span className="font-medium text-foreground">{p.full_name}</span>
                                  {sp.role && <Badge variant="outline" className="text-[10px]">{sp.role}</Badge>}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Item financial */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Multa aplicada</Label>
                          <Input type="number" step="0.01" className="h-9" value={item.penalty_value || ""} onChange={e => updateItemAlt(idx, "penalty_value", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor reembolsado pela cia</Label>
                          <Input type="number" step="0.01" className="h-9" value={item.refund_value || ""} onChange={e => updateItemAlt(idx, "refund_value", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Crédito (voucher/futuro)</Label>
                          <Input type="number" step="0.01" className="h-9" value={item.credit_value || ""} onChange={e => updateItemAlt(idx, "credit_value", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-bold">Valor a devolver ao cliente</Label>
                          <Input type="number" step="0.01" className="h-9 border-primary" value={item.client_refund_value || ""} onChange={e => updateItemAlt(idx, "client_refund_value", parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                        const calc = Math.max(0, item.refund_value - item.penalty_value);
                        updateItemAlt(idx, "client_refund_value", calc);
                      }}>Calcular reembolso automático</Button>

                      <div className="space-y-1">
                        <Label className="text-xs">Descrição detalhada</Label>
                        <Textarea rows={2} className="text-sm" value={item.description} onChange={e => updateItemAlt(idx, "description", e.target.value)} />
                      </div>
                    </Card>
                  );
                })}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Voltar</Button>
                  <Button onClick={() => setStep(4)} className="flex-1">Avançar — Financeiro <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Financial ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados Financeiros</Label>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(3)}>← Voltar</Button>
                </div>

                {/* Impact summary */}
                <Card className={`p-4 border-2 ${profitImpact >= 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-[10px] text-muted-foreground">Total reembolso cliente</p><p className="text-lg font-bold text-primary">{fmt(totalClientRefund)}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Fornecedor devolverá</p><p className="text-lg font-bold text-foreground">{fmt(supplierRefundValue)}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Impacto no lucro</p><p className={`text-lg font-bold ${profitImpact >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(profitImpact)}</p></div>
                  </div>
                  {profitImpact < 0 && (
                    <div className="flex items-center gap-2 mt-3 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-xs font-bold">Atenção: este reembolso gera prejuízo de {fmt(Math.abs(profitImpact))}</p>
                    </div>
                  )}
                </Card>

                {/* Client refund method */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reembolso ao Cliente</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Forma de reembolso</Label>
                      <Select value={refundMethod} onValueChange={setRefundMethod}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>{REFUND_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Data prevista</Label>
                      <DatePartsInput value={refundDate} onChange={(iso) => setRefundDate(iso)} inputClassName="h-9" />
                    </div>
                  </div>
                  {refundMethod === "pix" && (
                    <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
                      <div className="space-y-1"><Label className="text-xs">Nome recebedor</Label><Input className="h-9" value={pixReceiverName} onChange={e => setPixReceiverName(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Tipo chave</Label>
                        <Select value={pixKeyType} onValueChange={setPixKeyType}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                          <SelectContent>{PIX_KEY_TYPES.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Chave PIX</Label><Input className="h-9" value={pixKey} onChange={e => setPixKey(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Banco</Label><Input className="h-9" value={pixBank} onChange={e => setPixBank(e.target.value)} /></div>
                    </div>
                  )}
                </div>

                {/* Miles */}
                {itemAlterations.some(a => a.product_type === "aereo") && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Milhas</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Programa</Label>
                        <Select value={milesProgram || "__none__"} onValueChange={v => setMilesProgram(v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                          <SelectContent><SelectItem value="__none__">Selecionar...</SelectItem>{milesPrograms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Milhas utilizadas</Label><Input type="number" className="h-9" value={milesUsed || ""} onChange={e => setMilesUsed(parseInt(e.target.value) || 0)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Multa em milhas</Label><Input type="number" className="h-9" value={milesPenalty || ""} onChange={e => setMilesPenalty(parseInt(e.target.value) || 0)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Milhas devolvidas</Label><Input type="number" className="h-9" value={milesReturned || ""} onChange={e => setMilesReturned(parseInt(e.target.value) || 0)} /></div>
                    </div>
                  </div>
                )}

                {/* Supplier refund */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reembolso do Fornecedor</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Origem</Label>
                      <Select value={supplierRefundOrigin} onValueChange={setSupplierRefundOrigin}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>{SUPPLIER_ORIGINS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Forma</Label>
                      <Select value={supplierRefundMethod} onValueChange={setSupplierRefundMethod}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>{SUPPLIER_REFUND_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Valor esperado</Label><Input type="number" step="0.01" className="h-9" value={supplierRefundValue || ""} onChange={e => setSupplierRefundValue(parseFloat(e.target.value) || 0)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Data prevista</Label><DatePartsInput value={supplierRefundDate} onChange={(iso) => setSupplierRefundDate(iso)} inputClassName="h-9" /></div>
                  </div>
                  {supplierRefundMethod === "abatimento_fechamento" && (
                    <div className="space-y-1 p-3 border rounded-lg bg-muted/30">
                      <Label className="text-xs">Referência do fechamento</Label>
                      <Input className="h-9" value={supplierSettlementRef} onChange={e => setSupplierSettlementRef(e.target.value)} placeholder="Ex: Fechamento quinzenal junho" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Observações gerais</Label>
                  <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas internas..." />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">← Voltar</Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !selectedSaleId || itemAlterations.length === 0} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Registrar {itemAlterations.length} Alteração{itemAlterations.length !== 1 ? "ões" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
