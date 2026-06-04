import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, User, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CheckoutCtx } from "@/components/checkout/CheckoutLayout";
import {
  exigePassaporte, formatCPF, isValidCPF, isValidBirthDate, isFuturePassportExpiry,
} from "@/lib/checkout/helpers";

interface PaxForm {
  full_name: string;
  birth_date: string;
  cpf: string;
  passport_number: string;
  passport_expiry: string;
}

const empty: PaxForm = {
  full_name: "", birth_date: "", cpf: "", passport_number: "", passport_expiry: "",
};

export default function CheckoutPassageiros() {
  const { orderId, draft, update } = useOutletContext<CheckoutCtx>();
  const navigate = useNavigate();
  const n = Math.max(1, Number(draft.pax) || 1);
  const needsPassport = exigePassaporte(draft.product);

  const [pax, setPax] = useState<PaxForm[]>(() => {
    const existing = Array.isArray(draft.passengers) ? draft.passengers : [];
    return Array.from({ length: n }, (_, i) => ({ ...empty, ...(existing[i] || {}) }));
  });
  const [saving, setSaving] = useState(false);

  // Mantém o array do tamanho de pax se mudar
  useEffect(() => {
    setPax((arr) => {
      if (arr.length === n) return arr;
      if (arr.length < n) return [...arr, ...Array.from({ length: n - arr.length }, () => ({ ...empty }))];
      return arr.slice(0, n);
    });
  }, [n]);

  const setField = (idx: number, key: keyof PaxForm, value: string) => {
    setPax((arr) => arr.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  };

  const copyBuyerToPax = (idx: number) => {
    setField(idx, "full_name", draft.buyer_name ?? "");
  };

  const validate = (): string | null => {
    for (let i = 0; i < pax.length; i++) {
      const p = pax[i];
      const tag = `Passageiro ${i + 1}`;
      if (!p.full_name.trim() || p.full_name.trim().length < 3) return `${tag}: nome inválido`;
      const dobErr = isValidBirthDate(p.birth_date);
      if (dobErr) return `${tag}: ${dobErr}`;
      if (!isValidCPF(p.cpf)) return `${tag}: CPF inválido`;
      if (needsPassport) {
        if (!p.passport_number.trim()) return `${tag}: informe o número do passaporte`;
        if (!isFuturePassportExpiry(p.passport_expiry)) {
          return `${tag}: validade do passaporte deve ser futura`;
        }
      }
    }
    return null;
  };

  const onContinue = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const cleaned = pax.map((p) => ({
        full_name: p.full_name.trim(),
        birth_date: p.birth_date,
        cpf: p.cpf.replace(/\D/g, ""),
        passport_number: needsPassport ? p.passport_number.trim().toUpperCase() : null,
        passport_expiry: needsPassport ? p.passport_expiry : null,
      }));
      await update({ step: "passageiros", passengers: cleaned });
      navigate(`/checkout/${orderId}/termos`);
    } catch (e: any) {
      toast.error("Não foi possível salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-xl mb-1">Dados dos passageiros</h1>
        <p className="text-sm text-muted-foreground">
          Preencha exatamente como está no documento de identidade.
          {needsPassport && " Este destino exige passaporte com validade futura."}
        </p>
      </div>

      {pax.map((p, idx) => (
        <Card key={idx} className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Passageiro {idx + 1}{idx === 0 ? " · titular" : ""}
            </h2>
            {idx === 0 && draft.buyer_name && (
              <button
                type="button"
                onClick={() => copyBuyerToPax(0)}
                className="text-[11px] inline-flex items-center gap-1 text-emerald-700 hover:underline"
              >
                <UserCheck className="w-3 h-3" /> Sou um dos passageiros
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input value={p.full_name} onChange={(e) => setField(idx, "full_name", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" value={p.birth_date} onChange={(e) => setField(idx, "birth_date", e.target.value)} />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={p.cpf} onChange={(e) => setField(idx, "cpf", formatCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
              </div>
            </div>
            {needsPassport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div>
                  <Label>Passaporte · número</Label>
                  <Input
                    value={p.passport_number}
                    onChange={(e) => setField(idx, "passport_number", e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <Label>Passaporte · validade</Label>
                  <Input type="date" value={p.passport_expiry} onChange={(e) => setField(idx, "passport_expiry", e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(`/checkout/${orderId}/contato`)} disabled={saving}>
          Voltar
        </Button>
        <Button onClick={onContinue} disabled={saving} className="flex-1 h-12 font-semibold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
