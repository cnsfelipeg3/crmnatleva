import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CreditCard, Banknote, Wallet, AlertCircle, Clock, CheckCircle2, AlertTriangle, Paperclip, FileText, X, Upload, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DatePartsInput } from "@/components/ui/date-parts-input";

export interface SalePayment {
  id: string;
  payment_method: string;
  gateway: string;
  installments: number;
  gross_value: number;
  fee_percent: number;
  fee_fixed: number;
  fee_total: number;
  net_value: number;
  receiving_account_id: string;
  payment_date: string;
  due_date: string;
  status: "pago" | "a_receber" | "vencido";
  notes: string;
  receipt_url?: string;
  receipt_name?: string;
}

const PAYMENT_METHODS = [
  { value: "cartao_credito", label: "Cartão de Crédito", icon: CreditCard },
  { value: "pix", label: "PIX", icon: Wallet },
  { value: "transferencia", label: "Transferência Bancária", icon: Banknote },
  { value: "ted", label: "TED", icon: Banknote },
  { value: "deposito", label: "Depósito", icon: Banknote },
  { value: "boleto", label: "Boleto", icon: Banknote },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "cripto", label: "Criptomoeda", icon: Wallet },
  { value: "outro", label: "Outro", icon: Wallet },
];

const CARD_METHODS = ["cartao_credito", "cartao_debito"];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_CONFIG = {
  pago: { label: "Pago", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  a_receber: { label: "A receber", color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
  vencido: { label: "Vencido", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

interface Props {
  payments: SalePayment[];
  onChange: (payments: SalePayment[]) => void;
  totalSaleValue?: number;
}

export default function SalePaymentsEditor({ payments, onChange, totalSaleValue = 0 }: Props) {
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null);

  const { data: feeRules = [] } = useQuery({
    queryKey: ["payment-fee-rules-all"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_fee_rules").select("*").eq("is_active", true).order("acquirer").order("installments");
      return data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["receiving-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("receiving_accounts").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const gateways = useMemo(() => {
    const unique = new Set(feeRules.map((r: any) => r.acquirer).filter(Boolean));
    return [...unique] as string[];
  }, [feeRules]);

  const today = new Date().toISOString().slice(0, 10);

  const resolveStatus = (p: { status: string; due_date?: string; payment_date?: string }): "pago" | "a_receber" | "vencido" => {
    if (p.status === "pago") return "pago";
    if (p.due_date && p.due_date < today) return "vencido";
    return "a_receber";
  };

  const addPayment = () => {
    onChange([...payments, {
      id: crypto.randomUUID(),
      payment_method: "pix",
      gateway: "",
      installments: 1,
      gross_value: 0,
      fee_percent: 0,
      fee_fixed: 0,
      fee_total: 0,
      net_value: 0,
      receiving_account_id: "",
      payment_date: today,
      due_date: "",
      status: "pago",
      notes: "",
    }]);
  };

  const removePayment = (id: string) => {
    onChange(payments.filter(p => p.id !== id));
  };

  const updatePayment = (id: string, field: string, value: any) => {
    onChange(payments.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };

      // When gross_value changes and net_value hasn't been manually set, default net_value to gross_value
      if (field === "gross_value" && p.net_value === 0) {
        updated.net_value = parseFloat(value) || 0;
      }

      // Auto-calculate fee_total from the difference
      if (field === "gross_value" || field === "net_value") {
        updated.fee_total = Math.max(0, updated.gross_value - updated.net_value);
      }

      // Reset installments when switching away from card
      if (field === "payment_method" && !CARD_METHODS.includes(value)) {
        updated.installments = 1;
      }

      // Auto-set status based on due_date
      if (field === "status") {
        // manual override
      } else if (field === "due_date" && value) {
        updated.status = value <= today ? "pago" : "a_receber";
      }

      return updated;
    }));
  };

  const totalGross = payments.reduce((s, p) => s + p.gross_value, 0);
  const totalFees = payments.reduce((s, p) => s + p.fee_total, 0);
  const totalNet = payments.reduce((s, p) => s + p.net_value, 0);
  const totalPaid = payments.filter(p => resolveStatus(p) === "pago").reduce((s, p) => s + p.net_value, 0);
  const totalPending = payments.filter(p => resolveStatus(p) !== "pago").reduce((s, p) => s + p.net_value, 0);
  const totalOverdue = payments.filter(p => resolveStatus(p) === "vencido").reduce((s, p) => s + p.net_value, 0);
  const remaining = totalSaleValue - totalGross;

  const getMaxInstallments = (gateway: string) => {
    const rules = feeRules.filter((r: any) => r.acquirer === gateway);
    const max = Math.max(1, ...rules.map((r: any) => r.installments || 1));
    return max;
  };

  const handleReceiptUpload = async (paymentId: string, file: File) => {
    setUploadingPaymentId(paymentId);
    try {
      const ext = file.name.split(".").pop();
      const path = `receipts/${paymentId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("sale-attachments").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("sale-attachments").getPublicUrl(path);
      updatePayment(paymentId, "receipt_url", urlData.publicUrl);
      updatePayment(paymentId, "receipt_name", file.name);
      toast.success("Comprovante anexado");
    } catch (err: any) {
      toast.error("Erro ao enviar comprovante: " + (err.message || ""));
    } finally {
      setUploadingPaymentId(null);
    }
  };

  const removeReceipt = (paymentId: string) => {
    updatePayment(paymentId, "receipt_url", "");
    updatePayment(paymentId, "receipt_name", "");
  };

  return (
    <div className="space-y-4">
      {payments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum pagamento registrado</p>
          <p className="text-xs">Adicione os pagamentos desta venda</p>
        </div>
      )}

      {payments.map((payment, idx) => {
        const isCard = CARD_METHODS.includes(payment.payment_method);
        const methodConfig = PAYMENT_METHODS.find(m => m.value === payment.payment_method);
        const Icon = methodConfig?.icon || Wallet;
        const currentStatus = resolveStatus(payment);
        const statusCfg = STATUS_CONFIG[currentStatus];
        const StatusIcon = statusCfg.icon;

        return (
          <Card key={payment.id} className="p-4 space-y-4 border-border/60">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold">Pagamento {idx + 1}</span>
                <Badge variant="outline" className={`text-[10px] gap-1 ${statusCfg.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusCfg.label}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePayment(payment.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Method + Value + Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Forma de pagamento</Label>
                <Select value={payment.payment_method} onValueChange={v => updatePayment(payment.id, "payment_method", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor pago pelo cliente (R$)</Label>
                <Input
                  type="number" step="0.01" className="h-9"
                  value={payment.gross_value || ""}
                  onChange={e => updatePayment(payment.id, "gross_value", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={payment.status} onValueChange={v => updatePayment(payment.id, "status", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="a_receber">A receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Gateway + Installments + Valor Recebido */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Gateway de pagamento</Label>
                <Input
                  className="h-9"
                  placeholder="Ex: Mercado Pago, PagBank..."
                  value={payment.gateway || ""}
                  onChange={e => updatePayment(payment.id, "gateway", e.target.value)}
                />
              </div>
              {isCard && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Parcelas</Label>
                  <Select value={String(payment.installments)} onValueChange={v => updatePayment(payment.id, "installments", Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 18 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Valor recebido (R$)</Label>
                <Input
                  type="number" step="0.01" className="h-9"
                  value={payment.net_value || ""}
                  onChange={e => updatePayment(payment.id, "net_value", parseFloat(e.target.value) || 0)}
                  placeholder="Descontando taxas"
                />
              </div>
            </div>

            {/* Fee summary when there's a difference */}
            {payment.gross_value > 0 && payment.net_value > 0 && payment.gross_value !== payment.net_value && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Valor pago pelo cliente</span>
                  <span className="font-medium">{fmt(payment.gross_value)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Taxa retida</span>
                  <span className="font-medium text-destructive">- {fmt(payment.gross_value - payment.net_value)}</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Valor líquido recebido</span>
                  <span className="font-bold text-primary">{fmt(payment.net_value)}</span>
                </div>
                {isCard && payment.installments > 1 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Parcela cliente</span>
                    <span>{payment.installments}x de {fmt(payment.gross_value / payment.installments)}</span>
                  </div>
                )}
              </div>
            )}
            {/* Date fields */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data do pagamento</Label>
                <DatePartsInput value={payment.payment_date} onChange={(iso) => updatePayment(payment.id, "payment_date", iso)} inputClassName="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de vencimento</Label>
                <DatePartsInput value={payment.due_date || ""} onChange={(iso) => updatePayment(payment.id, "due_date", iso)} inputClassName="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observações</Label>
                <Input className="h-9" value={payment.notes} onChange={e => updatePayment(payment.id, "notes", e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            {/* Receipt attachment */}
            <div className="space-y-1.5">
              <Label className="text-xs">Comprovante</Label>
              {payment.receipt_url ? (
                <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs truncate flex-1">{payment.receipt_name || "Comprovante"}</span>
                  <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => removeReceipt(payment.id)} className="text-destructive hover:text-destructive/80">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer hover:border-primary/50 transition-colors">
                  {uploadingPaymentId === payment.id ? (
                    <span className="text-xs text-muted-foreground">Enviando...</span>
                  ) : (
                    <>
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Anexar comprovante</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={uploadingPaymentId === payment.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReceiptUpload(payment.id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </Card>
        );
      })}

      <Button variant="outline" onClick={addPayment} className="w-full">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Pagamento
      </Button>

      {/* Summary */}
      {payments.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo Financeiro</h4>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">Total da venda</span>
            <span className="font-bold text-right">{fmt(totalSaleValue)}</span>

            <span className="text-muted-foreground">Total registrado (bruto)</span>
            <span className="font-bold text-right">{fmt(totalGross)}</span>

            {totalFees > 0 && (
              <>
                <span className="text-muted-foreground">Total taxas</span>
                <span className="font-medium text-right text-destructive">- {fmt(totalFees)}</span>
              </>
            )}

            <span className="text-muted-foreground">Total líquido</span>
            <span className="font-bold text-right text-primary">{fmt(totalNet)}</span>
          </div>

          <div className="border-t border-border pt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Recebido</p>
              <p className="text-sm font-bold text-emerald-600">{fmt(totalPaid)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">A receber</p>
              <p className="text-sm font-bold text-amber-600">{fmt(totalPending)}</p>
            </div>
            {totalOverdue > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Vencido</p>
                <p className="text-sm font-bold text-destructive">{fmt(totalOverdue)}</p>
              </div>
            )}
          </div>

          {totalSaleValue > 0 && remaining !== 0 && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className={`text-xs font-medium ${remaining > 0 ? "text-amber-500" : "text-destructive"}`}>
                {remaining > 0 ? `Faltam ${fmt(remaining)} para cobrir o valor da venda` : `Excedente de ${fmt(Math.abs(remaining))}`}
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
