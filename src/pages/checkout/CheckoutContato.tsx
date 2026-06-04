import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CheckoutCtx } from "@/components/checkout/CheckoutLayout";
import { formatCep, lookupCep } from "@/lib/cep";
import { formatPhoneBR, isValidEmail, isValidPhoneBR } from "@/lib/checkout/helpers";

interface AddrState {
  cep: string; rua: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string;
}

export default function CheckoutContato() {
  const { orderId, draft, update } = useOutletContext<CheckoutCtx>();
  const navigate = useNavigate();
  const [name, setName] = useState(draft.buyer_name ?? "");
  const [email, setEmail] = useState(draft.buyer_email ?? "");
  const [phone, setPhone] = useState(formatPhoneBR(draft.buyer_phone ?? ""));
  const initialAddr = (draft.buyer_address ?? {}) as Partial<AddrState>;
  const [addr, setAddr] = useState<AddrState>({
    cep: initialAddr.cep ?? "",
    rua: initialAddr.rua ?? "",
    numero: initialAddr.numero ?? "",
    complemento: initialAddr.complemento ?? "",
    bairro: initialAddr.bairro ?? "",
    cidade: initialAddr.cidade ?? "",
    uf: initialAddr.uf ?? "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCepBlur = async () => {
    const digits = addr.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    const r = await lookupCep(digits);
    setCepLoading(false);
    if (!r) { toast.error("CEP não encontrado"); return; }
    setAddr((a) => ({
      ...a,
      rua: r.street || a.rua,
      bairro: r.neighborhood || a.bairro,
      cidade: r.city || a.cidade,
      uf: r.state || a.uf,
    }));
  };

  const onContinue = async () => {
    if (!name.trim() || name.trim().length < 3) return toast.error("Informe o nome completo");
    if (!isValidEmail(email)) return toast.error("E-mail inválido");
    if (!isValidPhoneBR(phone)) return toast.error("Celular inválido");
    if (!addr.cep || addr.cep.replace(/\D/g, "").length !== 8) return toast.error("CEP inválido");
    if (!addr.rua.trim() || !addr.numero.trim() || !addr.cidade.trim() || !addr.uf.trim()) {
      return toast.error("Preencha o endereço completo");
    }

    setSaving(true);
    try {
      await update({
        step: "contato",
        buyer_name: name.trim(),
        buyer_email: email.trim(),
        buyer_phone: phone.replace(/\D/g, ""),
        buyer_address: addr,
      });
      navigate(`/checkout/${orderId}/passageiros`);
    } catch (e: any) {
      toast.error("Não foi possível salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <h1 className="font-serif text-xl mb-1">Seus dados</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Esses dados são para emitir a reserva e o comprovante.
        </p>

        <div className="space-y-4">
          <div>
            <Label>Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome como no documento" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <div>
              <Label>Celular (DDD + número)</Label>
              <Input value={phone} onChange={(e) => setPhone(formatPhoneBR(e.target.value))} placeholder="(11) 91234-5678" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-serif text-lg mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" /> Endereço
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Comece pelo CEP · preenchemos o resto pra você.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <Label>CEP</Label>
            <div className="relative">
              <Input
                value={addr.cep}
                onChange={(e) => setAddr((a) => ({ ...a, cep: formatCep(e.target.value) }))}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                inputMode="numeric"
              />
              {cepLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Rua</Label>
            <Input value={addr.rua} onChange={(e) => setAddr((a) => ({ ...a, rua: e.target.value }))} />
          </div>
          <div>
            <Label>Número</Label>
            <Input value={addr.numero} onChange={(e) => setAddr((a) => ({ ...a, numero: e.target.value }))} />
          </div>
          <div>
            <Label>Complemento</Label>
            <Input value={addr.complemento} onChange={(e) => setAddr((a) => ({ ...a, complemento: e.target.value }))} placeholder="opcional" />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={addr.bairro} onChange={(e) => setAddr((a) => ({ ...a, bairro: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Cidade</Label>
            <Input value={addr.cidade} onChange={(e) => setAddr((a) => ({ ...a, cidade: e.target.value }))} />
          </div>
          <div>
            <Label>UF</Label>
            <Input maxLength={2} value={addr.uf} onChange={(e) => setAddr((a) => ({ ...a, uf: e.target.value.toUpperCase().slice(0, 2) }))} />
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(`/checkout/${orderId}/resumo`)} disabled={saving}>
          Voltar
        </Button>
        <Button onClick={onContinue} disabled={saving} className="flex-1 h-12 font-semibold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
