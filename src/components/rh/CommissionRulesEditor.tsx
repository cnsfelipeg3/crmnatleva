import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Info } from "lucide-react";
import {
  CommissionRules,
  CommissionTier,
  DEFAULT_COMMISSION_RULES,
  parseCommissionRules,
  DEFAULT_COMMISSION_AGENCIA,
  DEFAULT_COMMISSION_ORGANICO,
} from "@/lib/commissionRules";

interface Props {
  value: unknown;
  onChange: (rules: CommissionRules) => void;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function CommissionRulesEditor({ value, onChange }: Props) {
  const rules = parseCommissionRules(value);

  const update = (patch: Partial<CommissionRules>) =>
    onChange({ ...rules, ...patch });

  const updateTier = (idx: number, patch: Partial<CommissionTier>) => {
    const tiers = rules.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    update({ tiers });
  };

  const addTier = () => {
    const last = rules.tiers[rules.tiers.length - 1];
    const nextUpTo = last?.up_to ? last.up_to + 100000 : 100000;
    // Se a última for "infinito", convertemos ela em uma faixa com cap e adicionamos nova infinita.
    if (last && last.up_to === null) {
      const tiers = [...rules.tiers];
      tiers[tiers.length - 1] = { ...last, up_to: nextUpTo };
      tiers.push({ up_to: null, percent: last.percent });
      update({ tiers });
    } else {
      update({ tiers: [...rules.tiers, { up_to: nextUpTo, percent: 5 }] });
    }
  };

  const removeTier = (idx: number) =>
    update({ tiers: rules.tiers.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div>
        <Label>Modelo de comissão</Label>
        <Select value={rules.mode} onValueChange={(v) => update({ mode: v as CommissionRules["mode"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              Padrão da agência ({(DEFAULT_COMMISSION_AGENCIA * 100).toFixed(0)}% agência / {(DEFAULT_COMMISSION_ORGANICO * 100).toFixed(0)}% orgânico)
            </SelectItem>
            <SelectItem value="tiers">Faixas progressivas (personalizado)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rules.mode === "default" ? (
        <Card className="p-3 bg-muted/30 border-dashed">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>
              Esse colaborador receberá <strong>{(DEFAULT_COMMISSION_AGENCIA * 100).toFixed(0)}%</strong> sobre o lucro
              de cada venda originada de <strong>leads da agência</strong>, e <strong>{(DEFAULT_COMMISSION_ORGANICO * 100).toFixed(0)}%</strong>{" "}
              quando o lead for <strong>orgânico</strong>. Para regras como "5% até R$100k de lucro / 10% acima",
              mude para <strong>Faixas progressivas</strong>.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>Base de cálculo</Label>
            <Select value={rules.base} onValueChange={(v) => update({ base: v as CommissionRules["base"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Lucro total da empresa no mês</SelectItem>
                <SelectItem value="individual">Lucro das vendas deste colaborador no mês</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {rules.base === "company"
                ? "As faixas são aplicadas sobre o lucro consolidado da NatLeva no mês (ideal para líderes/gestores)."
                : "As faixas são aplicadas sobre o lucro só das vendas atribuídas a este colaborador."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Faixas (progressivo)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addTier}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar faixa
              </Button>
            </div>

            {rules.tiers.length === 0 && (
              <Card className="p-4 text-center text-xs text-muted-foreground border-dashed">
                Nenhuma faixa configurada. Clique em "Adicionar faixa" pra começar.
                <br />
                Exemplo: <strong>até R$100.000 → 5%</strong> · <strong>acima → 10%</strong>.
              </Card>
            )}

            {rules.tiers.length > 0 && (
              <div className="space-y-2">
                {rules.tiers.map((tier, idx) => {
                  const prev = idx > 0 ? rules.tiers[idx - 1].up_to ?? 0 : 0;
                  const isLastInfinite = tier.up_to === null;
                  return (
                    <Card key={idx} className="p-3">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Label className="text-[11px] text-muted-foreground">
                            Faixa {idx + 1} {idx === 0 ? "(do início)" : `(acima de ${fmtBRL(prev)})`}
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">até</span>
                            <Input
                              type="number"
                              placeholder="∞ (sem limite)"
                              value={tier.up_to ?? ""}
                              onChange={(e) =>
                                updateTier(idx, {
                                  up_to: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="col-span-5">
                          <Label className="text-[11px] text-muted-foreground">% de comissão</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={tier.percent}
                              onChange={(e) => updateTier(idx, { percent: Number(e.target.value) })}
                              className="h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeTier(idx)}
                            title="Remover faixa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {isLastInfinite && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Última faixa: aplica esse percentual a todo lucro acima de {fmtBRL(prev)}.
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {rules.tiers.length > 0 && rules.tiers.every((t) => t.up_to !== null) && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Lucro acima de {fmtBRL(rules.tiers[rules.tiers.length - 1].up_to ?? 0)} ficará sem comissão.
                Considere deixar a última faixa "sem limite" (campo vazio).
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_COMMISSION_RULES };
