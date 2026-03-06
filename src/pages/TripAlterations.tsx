import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertTriangle, Plus, Search, Eye, Clock, CheckCircle2, XCircle, RotateCcw,
  Ban, CreditCard, Plane, Hotel, Shield, FileText, ArrowRight, Loader2
} from "lucide-react";

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

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function TripAlterations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    sale_id: "",
    alteration_type: "cancelamento_total",
    product_type: "aereo",
    reason: "",
    description: "",
    original_value: 0,
    penalty_value: 0,
    refund_value: 0,
    credit_value: 0,
    client_refund_value: 0,
    miles_program: "",
    miles_used: 0,
    miles_penalty: 0,
    miles_returned: 0,
    refund_method: "",
    refund_date: "",
    refund_notes: "",
    notes: "",
  });

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

  const { data: sales = [] } = useQuery({
    queryKey: ["sales-for-alterations"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("id, name, display_id").order("close_date", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let result = alterations;
    if (filterStatus !== "all") result = result.filter((a: any) => a.status === filterStatus);
    if (filterType !== "all") result = result.filter((a: any) => a.alteration_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a: any) => {
        const sale = a.sales;
        return (
          sale?.name?.toLowerCase().includes(q) ||
          sale?.display_id?.toLowerCase().includes(q) ||
          a.reason?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [alterations, filterStatus, filterType, search]);

  // KPIs
  const pending = alterations.filter((a: any) => ["solicitado", "aguardando_cia"].includes(a.status)).length;
  const refundPending = alterations.filter((a: any) => a.status === "reembolso_aprovado").length;
  const totalRefundValue = alterations.reduce((s: number, a: any) => s + (a.client_refund_value || 0), 0);

  const resetForm = () => {
    setForm({
      sale_id: "", alteration_type: "cancelamento_total", product_type: "aereo",
      reason: "", description: "", original_value: 0, penalty_value: 0,
      refund_value: 0, credit_value: 0, client_refund_value: 0,
      miles_program: "", miles_used: 0, miles_penalty: 0, miles_returned: 0,
      refund_method: "", refund_date: "", refund_notes: "", notes: "",
    });
  };

  const handleSave = async () => {
    if (!form.sale_id) {
      toast({ title: "Selecione uma venda", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("trip_alterations").insert({
        sale_id: form.sale_id,
        alteration_type: form.alteration_type,
        product_type: form.product_type,
        reason: form.reason || null,
        description: form.description || null,
        original_value: form.original_value,
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
        refund_notes: form.refund_notes || null,
        notes: form.notes || null,
        created_by: user?.id,
        status: "solicitado",
      });
      if (error) throw error;

      // Auto-create financial entry if there's a refund value
      if (form.client_refund_value > 0) {
        await supabase.from("accounts_payable").insert({
          sale_id: form.sale_id,
          description: `Reembolso - ${ALTERATION_TYPES.find(t => t.value === form.alteration_type)?.label || form.alteration_type}`,
          value: form.client_refund_value,
          status: "pendente",
          due_date: form.refund_date || null,
          payment_method: form.refund_method || null,
          created_by: user?.id,
        });
      }

      // Log history
      await supabase.from("trip_alteration_history").insert({
        alteration_id: (await supabase.from("trip_alterations").select("id").order("created_at", { ascending: false }).limit(1).single()).data?.id,
        action: "criacao",
        details: `Alteração registrada: ${ALTERATION_TYPES.find(t => t.value === form.alteration_type)?.label}`,
        user_id: user?.id,
      });

      // If cancellation, cancel related checkin tasks
      if (form.alteration_type === "cancelamento_total") {
        await supabase.from("checkin_tasks").update({ status: "CANCELADO" }).eq("sale_id", form.sale_id).neq("status", "CONCLUIDO");
        await supabase.from("lodging_confirmation_tasks").update({ status: "CANCELADO" }).eq("sale_id", form.sale_id).neq("status", "CONFIRMADO");
      }

      toast({ title: "Alteração registrada com sucesso!" });
      setShowForm(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["trip-alterations"] });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "concluido") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }
      await supabase.from("trip_alterations").update(updates).eq("id", id);
      await supabase.from("trip_alteration_history").insert({
        alteration_id: id,
        action: "status_change",
        details: `Status alterado para: ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
        user_id: user?.id,
      });
      toast({ title: "Status atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["trip-alterations"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // Auto-calculate client refund
  const autoCalcRefund = () => {
    const calc = form.refund_value - form.penalty_value;
    setForm(f => ({ ...f, client_refund_value: Math.max(0, calc) }));
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 md:w-6 md:h-6" /> Alterações de Viagem
          </h1>
          <p className="text-xs text-muted-foreground">Cancelamentos, remarcações e reembolsos</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1">
          <Plus className="w-4 h-4" /> Registrar Alteração
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{alterations.length}</p>
        </Card>
        <Card className={`p-4 border-2 ${pending > 0 ? "border-amber-500/50 bg-amber-500/5" : "border-transparent"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">Pendentes</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </Card>
        <Card className={`p-4 border-2 ${refundPending > 0 ? "border-primary/50 bg-primary/5" : "border-transparent"}`}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Reembolsos pendentes</span>
          </div>
          <p className="text-2xl font-bold text-primary">{refundPending}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Ban className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Total reembolsos</span>
          </div>
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
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {ALTERATION_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
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

            return (
              <Card key={alt.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Left icon */}
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    {alt.alteration_type.includes("cancelamento") ? (
                      <Ban className="w-5 h-5 text-destructive" />
                    ) : (
                      <RotateCcw className="w-5 h-5 text-amber-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{typeCfg?.label || alt.alteration_type}</span>
                      <Badge variant="outline" className={`text-[10px] gap-1 ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <ProdIcon className="w-3 h-3" /> {prodCfg?.label || alt.product_type}
                      </Badge>
                    </div>

                    {sale && (
                      <p className="text-xs text-muted-foreground">
                        Venda: <button onClick={() => navigate(`/sales/${sale.id}`)} className="font-mono font-bold text-primary hover:underline">{sale.display_id}</button> — {sale.name}
                        {sale.origin_iata && sale.destination_iata && (
                          <span className="ml-2">{sale.origin_iata} → {sale.destination_iata}</span>
                        )}
                      </p>
                    )}

                    {alt.reason && <p className="text-xs text-muted-foreground">{alt.reason}</p>}

                    {/* Financial summary */}
                    <div className="flex flex-wrap gap-4 text-xs">
                      {alt.original_value > 0 && (
                        <span className="text-muted-foreground">Original: <span className="font-bold text-foreground">{fmt(alt.original_value)}</span></span>
                      )}
                      {alt.penalty_value > 0 && (
                        <span className="text-muted-foreground">Multa: <span className="font-bold text-destructive">{fmt(alt.penalty_value)}</span></span>
                      )}
                      {alt.client_refund_value > 0 && (
                        <span className="text-muted-foreground">Reembolso: <span className="font-bold text-primary">{fmt(alt.client_refund_value)}</span></span>
                      )}
                      {alt.miles_returned > 0 && (
                        <span className="text-muted-foreground">Milhas devolvidas: <span className="font-bold text-foreground">{alt.miles_returned.toLocaleString()}</span></span>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground">{formatDateBR(alt.created_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {alt.status === "solicitado" && (
                      <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => updateStatus(alt.id, "aguardando_cia")}>
                        Aguardando Cia
                      </Button>
                    )}
                    {alt.status === "aguardando_cia" && (
                      <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => updateStatus(alt.id, "reembolso_aprovado")}>
                        Aprovar Reembolso
                      </Button>
                    )}
                    {alt.status === "reembolso_aprovado" && (
                      <Button size="sm" variant="default" className="text-[10px] h-7" onClick={() => updateStatus(alt.id, "reembolso_realizado")}>
                        Reembolso Feito
                      </Button>
                    )}
                    {!["concluido", "cancelado"].includes(alt.status) && (
                      <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => updateStatus(alt.id, "concluido")}>
                        Concluir
                      </Button>
                    )}
                    {sale && (
                      <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1" onClick={() => navigate(`/sales/${sale.id}`)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Registrar Alteração de Viagem
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Sale */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Venda vinculada *</Label>
              <Select value={form.sale_id} onValueChange={v => setForm(f => ({ ...f, sale_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar venda..." /></SelectTrigger>
                <SelectContent>
                  {sales.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.display_id} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type + Product */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de alteração</Label>
                <Select value={form.alteration_type} onValueChange={v => setForm(f => ({ ...f, alteration_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALTERATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Produto afetado</Label>
                <Select value={form.product_type} onValueChange={v => setForm(f => ({ ...f, product_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo</Label>
              <Input className="h-9" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex: Cliente solicitou por motivos pessoais" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição detalhada</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes da alteração..." />
            </div>

            {/* Financial */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valores Financeiros</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor pago originalmente</Label>
                  <Input type="number" step="0.01" className="h-9" value={form.original_value || ""} onChange={e => setForm(f => ({ ...f, original_value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Multa aplicada</Label>
                  <Input type="number" step="0.01" className="h-9" value={form.penalty_value || ""} onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    setForm(f => ({ ...f, penalty_value: v }));
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor reembolsado pela cia</Label>
                  <Input type="number" step="0.01" className="h-9" value={form.refund_value || ""} onChange={e => setForm(f => ({ ...f, refund_value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Crédito (voucher/futuro)</Label>
                  <Input type="number" step="0.01" className="h-9" value={form.credit_value || ""} onChange={e => setForm(f => ({ ...f, credit_value: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-bold">Valor a devolver ao cliente</Label>
                  <Input type="number" step="0.01" className="h-9 border-primary" value={form.client_refund_value || ""} onChange={e => setForm(f => ({ ...f, client_refund_value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <Button size="sm" variant="outline" className="h-9 text-xs" onClick={autoCalcRefund}>Calcular</Button>
              </div>
              {form.client_refund_value > 0 && (
                <Card className="p-3 bg-primary/5 border-primary/20">
                  <p className="text-xs text-muted-foreground">Saldo a devolver ao cliente:</p>
                  <p className="text-lg font-bold text-primary">{fmt(form.client_refund_value)}</p>
                </Card>
              )}
            </div>

            {/* Miles */}
            {(form.product_type === "aereo" || form.miles_used > 0) && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Milhas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Programa</Label>
                    <Input className="h-9" value={form.miles_program} onChange={e => setForm(f => ({ ...f, miles_program: e.target.value }))} placeholder="Ex: Smiles" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Milhas utilizadas</Label>
                    <Input type="number" className="h-9" value={form.miles_used || ""} onChange={e => setForm(f => ({ ...f, miles_used: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Multa em milhas</Label>
                    <Input type="number" className="h-9" value={form.miles_penalty || ""} onChange={e => setForm(f => ({ ...f, miles_penalty: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Milhas devolvidas</Label>
                    <Input type="number" className="h-9" value={form.miles_returned || ""} onChange={e => setForm(f => ({ ...f, miles_returned: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              </div>
            )}

            {/* Refund method */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reembolso ao Cliente</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Forma de reembolso</Label>
                  <Select value={form.refund_method} onValueChange={v => setForm(f => ({ ...f, refund_method: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {REFUND_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data prevista do reembolso</Label>
                  <Input type="date" className="h-9" value={form.refund_date} onChange={e => setForm(f => ({ ...f, refund_date: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas internas..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Registrar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
