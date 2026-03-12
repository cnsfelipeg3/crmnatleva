import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TariffCondition {
  fare_name: string;
  is_refundable: string;
  alteration_allowed: boolean;
  cancellation_allowed: boolean;
  refund_type: string;
  penalty_type: string;
  penalty_percent: number;
  penalty_fixed_value: number;
  fare_difference_applies: boolean;
  penalty_plus_fare_difference: boolean;
  cancellation_deadline: string;
  alteration_deadline: string;
  credit_voucher_allowed: boolean;
  credit_miles_allowed: boolean;
  observations: string;
}

export const EMPTY_TARIFF: TariffCondition = {
  fare_name: "",
  is_refundable: "nao_reembolsavel",
  alteration_allowed: false,
  cancellation_allowed: false,
  refund_type: "nao_reembolsavel",
  penalty_type: "sem_multa",
  penalty_percent: 0,
  penalty_fixed_value: 0,
  fare_difference_applies: false,
  penalty_plus_fare_difference: false,
  cancellation_deadline: "",
  alteration_deadline: "",
  credit_voucher_allowed: false,
  credit_miles_allowed: false,
  observations: "",
};

const FARE_NAMES = [
  "Light", "Standard", "Plus", "Flex", "Top", "Executiva", "Econômica Promocional",
  "Econômica", "Premium Economy", "Primeira Classe", "Outra",
];

const REFUND_TYPES = [
  { value: "integral", label: "Reembolso integral" },
  { value: "parcial", label: "Reembolso parcial" },
  { value: "nao_reembolsavel", label: "Não reembolsável" },
];

const PENALTY_TYPES = [
  { value: "sem_multa", label: "Sem multa" },
  { value: "percentual", label: "Percentual" },
  { value: "valor_fixo", label: "Valor fixo" },
];

interface Props {
  value: TariffCondition;
  onChange: (v: TariffCondition) => void;
  productLabel?: string;
  readOnly?: boolean;
  compact?: boolean;
}

export default function TariffConditionsCard({ value, onChange, productLabel, readOnly = false, compact = false }: Props) {
  const [open, setOpen] = useState(!compact);
  const update = (field: keyof TariffCondition, val: any) => onChange({ ...value, [field]: val });

  const hasFare = !!value.fare_name;
  const summary = hasFare
    ? `${value.fare_name} • ${value.cancellation_allowed ? "Cancelável" : "Sem cancel."} • ${value.alteration_allowed ? "Alterável" : "Sem alter."}`
    : "Não configurado";

  if (readOnly) {
    return (
      <Card className="p-4 border-dashed bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Regras Tarifárias {productLabel ? `— ${productLabel}` : ""}
          </h4>
        </div>
        {!hasFare ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma condição tarifária cadastrada para este item.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <InfoPill label="Tarifa" value={value.fare_name} />
            <InfoPill label="Cancelamento" value={value.cancellation_allowed ? "Permitido" : "Não permitido"} positive={value.cancellation_allowed} />
            <InfoPill label="Alteração" value={value.alteration_allowed ? "Permitida" : "Não permitida"} positive={value.alteration_allowed} />
            <InfoPill label="Reembolso" value={REFUND_TYPES.find(r => r.value === value.refund_type)?.label || "—"} />
            {value.penalty_type !== "sem_multa" && (
              <InfoPill label="Multa" value={
                value.penalty_type === "percentual" ? `${value.penalty_percent}%` : `R$ ${value.penalty_fixed_value.toFixed(2)}`
              } />
            )}
            {value.fare_difference_applies && <InfoPill label="Dif. tarifária" value="Aplicável" />}
            {value.credit_voucher_allowed && <InfoPill label="Voucher" value="Permitido" positive />}
            {value.credit_miles_allowed && <InfoPill label="Crédito milhas" value="Permitido" positive />}
            {value.cancellation_deadline && <InfoPill label="Prazo cancelamento" value={value.cancellation_deadline} />}
            {value.alteration_deadline && <InfoPill label="Prazo alteração" value={value.alteration_deadline} />}
          </div>
        )}
        {value.observations && <p className="text-[10px] text-muted-foreground mt-2 italic">{value.observations}</p>}
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Condições de Alteração e Cancelamento {productLabel ? `— ${productLabel}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasFare ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> {summary}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Opcional</Badge>
              )}
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            {/* Row 1: Fare name + refundable */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tarifa Escolhida</Label>
                <Select value={value.fare_name || "__none__"} onValueChange={v => update("fare_name", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecionar...</SelectItem>
                    {FARE_NAMES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reembolsável?</Label>
                <Select value={value.is_refundable} onValueChange={v => update("is_refundable", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reembolsavel">Reembolsável</SelectItem>
                    <SelectItem value="nao_reembolsavel">Não reembolsável</SelectItem>
                    <SelectItem value="parcial">Parcialmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Reembolso</Label>
                <Select value={value.refund_type} onValueChange={v => update("refund_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REFUND_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Permissions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SwitchField label="Alteração permitida?" checked={value.alteration_allowed} onChange={v => update("alteration_allowed", v)} />
              <SwitchField label="Cancelamento permitido?" checked={value.cancellation_allowed} onChange={v => update("cancellation_allowed", v)} />
              <SwitchField label="Diferença tarifária?" checked={value.fare_difference_applies} onChange={v => update("fare_difference_applies", v)} />
              <SwitchField label="Multa + diferença?" checked={value.penalty_plus_fare_difference} onChange={v => update("penalty_plus_fare_difference", v)} />
            </div>

            {/* Row 3: Penalty */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Multa</Label>
                <Select value={value.penalty_type} onValueChange={v => update("penalty_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PENALTY_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {value.penalty_type === "percentual" && (
                <div className="space-y-1">
                  <Label className="text-xs">Percentual da Multa (%)</Label>
                  <Input type="number" className="h-9 text-sm" value={value.penalty_percent || ""} onChange={e => update("penalty_percent", parseFloat(e.target.value) || 0)} placeholder="20" />
                </div>
              )}
              {value.penalty_type === "valor_fixo" && (
                <div className="space-y-1">
                  <Label className="text-xs">Valor Fixo da Multa (R$)</Label>
                  <Input type="number" step="0.01" className="h-9 text-sm" value={value.penalty_fixed_value || ""} onChange={e => update("penalty_fixed_value", parseFloat(e.target.value) || 0)} placeholder="350" />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Prazo Cancelamento</Label>
                <Input className="h-9 text-sm" value={value.cancellation_deadline} onChange={e => update("cancellation_deadline", e.target.value)} placeholder="Até 24h antes" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prazo Alteração</Label>
                <Input className="h-9 text-sm" value={value.alteration_deadline} onChange={e => update("alteration_deadline", e.target.value)} placeholder="Até 7 dias antes" />
              </div>
            </div>

            {/* Row 4: Credits */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SwitchField label="Crédito/Voucher?" checked={value.credit_voucher_allowed} onChange={v => update("credit_voucher_allowed", v)} />
              <SwitchField label="Crédito em milhas?" checked={value.credit_miles_allowed} onChange={v => update("credit_miles_allowed", v)} />
            </div>

            {/* Observations */}
            <div className="space-y-1">
              <Label className="text-xs">Observações Complementares</Label>
              <Textarea rows={2} className="text-sm" value={value.observations} onChange={e => update("observations", e.target.value)} placeholder="Detalhes adicionais da tarifa..." />
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label className="text-xs cursor-pointer">{label}</Label>
    </div>
  );
}

function InfoPill({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1.5">
      {positive !== undefined && (
        positive ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
      )}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
