import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, CreditCard, Banknote, Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
  notes: string;
}

const PAYMENT_METHODS = [
  { value: "cartao_credito", label: "Cartão de Crédito", icon: CreditCard },
  { value: "pix", label: "PIX", icon: Wallet },
  { value: "transferencia", label: "Transferência Bancária", icon: Banknote },
  { value: "ted", label: "TED", icon: Banknote },
  { value: "deposito", label: "Depósito", icon: Banknote },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "cripto", label: "Criptomoeda", icon: Wallet },
  { value: "outro", label: "Outro", icon: Wallet },
];

const CARD_METHODS = ["cartao_credito", "cartao_debito"];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  payments: SalePayment[];
  onChange: (payments: SalePayment[]) => void;
  totalSaleValue?: number;
}

export default function SalePaymentsEditor({ payments, onChange, totalSaleValue = 0 }: Props) {
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
      payment_date: new Date().toISOString().slice(0, 10),
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

      // Auto-calculate fees when gateway, installments, or gross_value change
      if (field === "gateway" || field === "installments" || field === "gross_value" || field === "payment_method") {
        const isCard = CARD_METHODS.includes(updated.payment_method);
        if (isCard && updated.gateway && updated.gross_value > 0) {
          const rule = feeRules.find((r: any) =>
            r.acquirer === updated.gateway &&
            r.installments === updated.installments
          );
          if (rule) {
            updated.fee_percent = (rule as any).fee_percent || 0;
            updated.fee_fixed = (rule as any).fee_fixed || 0;
            updated.fee_total = (updated.gross_value * updated.fee_percent / 100) + updated.fee_fixed;
            updated.net_value = updated.gross_value - updated.fee_total;
          } else {
            updated.fee_percent = 0;
            updated.fee_fixed = 0;
            updated.fee_total = 0;
            updated.net_value = updated.gross_value;
          }
        } else {
          updated.fee_percent = 0;
          updated.fee_fixed = 0;
          updated.fee_total = 0;
          updated.net_value = updated.gross_value;
        }
      }

      // Reset gateway fields when switching away from card
      if (field === "payment_method" && !CARD_METHODS.includes(value)) {
        updated.gateway = "";
        updated.installments = 1;
      }

      return updated;
    }));
  };

  const totalGross = payments.reduce((s, p) => s + p.gross_value, 0);
  const totalFees = payments.reduce((s, p) => s + p.fee_total, 0);
  const totalNet = payments.reduce((s, p) => s + p.net_value, 0);
  const remaining = totalSaleValue - totalGross;

  const getMaxInstallments = (gateway: string) => {
    const rules = feeRules.filter((r: any) => r.acquirer === gateway);
    const max = Math.max(1, ...rules.map((r: any) => r.installments || 1));
    return max;
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

        return (
          <Card key={payment.id} className="p-4 space-y-4 border-border/60">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold">Pagamento {idx + 1}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePayment(payment.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Method + Value */}
            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* Card-specific: Gateway + Installments */}
            {isCard && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Gateway de pagamento</Label>
                  <Select value={payment.gateway} onValueChange={v => updatePayment(payment.id, "gateway", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar gateway" /></SelectTrigger>
                    <SelectContent>
                      {gateways.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Parcelas</Label>
                  <Select value={String(payment.installments)} onValueChange={v => updatePayment(payment.id, "installments", Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: payment.gateway ? getMaxInstallments(payment.gateway) : 18 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Card fee result */}
            {isCard && payment.gateway && payment.gross_value > 0 && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Valor pago pelo cliente</span>
                  <span className="font-medium">{fmt(payment.gross_value)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Taxa {payment.fee_percent > 0 ? `(${payment.fee_percent.toFixed(2)}%` : ""}
                    {payment.fee_fixed > 0 ? ` + ${fmt(payment.fee_fixed)}` : ""}
                    {payment.fee_percent > 0 ? ")" : ""}
                  </span>
                  <span className="font-medium text-destructive">- {fmt(payment.fee_total)}</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Valor líquido recebido</span>
                  <span className="font-bold text-primary">{fmt(payment.net_value)}</span>
                </div>
                {payment.installments > 1 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Parcela cliente</span>
                    <span>{payment.installments}x de {fmt(payment.gross_value / payment.installments)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Non-card: receiving account */}
            {!isCard && (
              <div className="space-y-1.5">
                <Label className="text-xs">Conta de recebimento</Label>
                <Select value={payment.receiving_account_id || "none"} onValueChange={v => updatePayment(payment.id, "receiving_account_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informar</SelectItem>
                    {accounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} {a.bank_name ? `• ${a.bank_name}` : ""} {a.pix_key ? `• ${a.pix_key}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date + Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data do pagamento</Label>
                <Input type="date" className="h-9" value={payment.payment_date} onChange={e => updatePayment(payment.id, "payment_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observações</Label>
                <Input className="h-9" value={payment.notes} onChange={e => updatePayment(payment.id, "notes", e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          </Card>
        );
      })}

      <Button variant="outline" onClick={addPayment} className="w-full">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Pagamento
      </Button>

      {/* Summary */}
      {payments.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo dos Pagamentos</h4>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">Total pago (bruto)</span>
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
