import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plane, CheckCircle2, ShieldCheck, Globe2, Check, AlertCircle } from "lucide-react";
import logo from "@/assets/logo-natleva.png";
import { useToast } from "@/hooks/use-toast";

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

const initialForm = {
  full_name: "", cpf: "", birth_date: "", rg: "", email: "",
  phone: "", passport_number: "", passport_expiry: "",
  address_cep: "", address_street: "", address_number: "",
  address_complement: "", address_neighborhood: "",
  address_city: "", address_state: "",
  international_outside_sa: false,
};

export default function PassengerSelfSignup() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [linkState, setLinkState] = useState<"loading" | "valid" | "invalid">("loading");
  const [reason, setReason] = useState<string>("");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string>("");
  const [cepFound, setCepFound] = useState(false);

  const fnUrl = useMemo(() => {
    const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/passenger-self-signup`;
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`${fnUrl}?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setLinkState("valid");
        else { setLinkState("invalid"); setReason(d.reason || ""); }
      })
      .catch(() => setLinkState("invalid"));
  }, [slug, fnUrl]);

  const fetchCep = async (cep: string) => {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    setCepLoading(true);
    setCepError("");
    setCepFound(false);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) {
        setCepError("CEP não encontrado");
        return;
      }
      setForm((f) => ({
        ...f,
        address_street: j.logradouro || f.address_street,
        address_neighborhood: j.bairro || f.address_neighborhood,
        address_city: j.localidade || f.address_city,
        address_state: j.uf || f.address_state,
      }));
      setCepFound(true);
    } catch {
      setCepError("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const cepDigits = form.address_cep.replace(/\D/g, "");
  const cepInvalid = cepDigits.length > 0 && cepDigits.length < 8;
  const stateInvalid = form.address_state.length > 0 && form.address_state.length !== 2;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    if (!form.full_name.trim() || form.full_name.trim().length < 3) {
      toast({ title: "Informe o nome completo", variant: "destructive" });
      return;
    }
    if (form.international_outside_sa && (!form.passport_number || !form.passport_expiry)) {
      toast({ title: "Passaporte e validade são obrigatórios para viagem internacional fora da América do Sul", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, payload: form }),
      });
      const j = await r.json();
      if (!r.ok || j.error) {
        toast({ title: "Erro ao enviar", description: j.error || "Tente novamente", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch (err) {
      toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (linkState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (linkState === "invalid") {
    const map: Record<string, string> = {
      not_found: "Este link de cadastro não existe.",
      inactive: "Este link de cadastro foi desativado.",
      expired: "Este link expirou.",
      limit_reached: "Este link já atingiu o limite de cadastros.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="glass-card p-10 max-w-md w-full text-center space-y-4">
          <img src={logo} alt="NatLeva" className="h-10 mx-auto" />
          <h1 className="text-xl font-display">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">{map[reason] || "Não foi possível abrir este formulário."}</p>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="glass-card p-10 max-w-md w-full text-center space-y-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200" />
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
          <img src={logo} alt="NatLeva" className="h-8 mx-auto opacity-80" />
          <h1 className="text-2xl font-display">Cadastro recebido!</h1>
          <p className="text-sm text-muted-foreground">
            Obrigado por compartilhar seus dados com a gente. Nossa equipe já está com tudo em mãos para cuidar da sua viagem.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200" />
        <div className="max-w-2xl mx-auto px-6 py-10 text-center space-y-3">
          <img src={logo} alt="NatLeva" className="h-12 mx-auto" />
          <h1 className="text-3xl md:text-4xl font-display tracking-tight">Seu cadastro de passageiro</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
            Preencha seus dados com calma. Levam só uns minutinhos e nos ajudam a deixar a sua viagem 100% redonda.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Dados pessoais */}
        <Card className="glass-card p-6 space-y-4 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-200 rounded-l" />
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg">Dados pessoais</h2>
          </div>
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.birth_date} onChange={(e) => setForm(f => ({ ...f, birth_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>RG</Label>
              <Input value={form.rg} onChange={(e) => setForm(f => ({ ...f, rg: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="voce@email.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone com WhatsApp *</Label>
            <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" required />
          </div>
        </Card>

        {/* Endereço */}
        <Card className="glass-card p-6 space-y-4 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-200 rounded-l" />
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg">Endereço</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input value={form.address_cep} onChange={(e) => { const v = formatCep(e.target.value); setForm(f => ({ ...f, address_cep: v })); if (v.replace(/\D/g, "").length === 8) fetchCep(v); }} placeholder="00000-000" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Rua</Label>
              <Input value={form.address_street} onChange={(e) => setForm(f => ({ ...f, address_street: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={form.address_number} onChange={(e) => setForm(f => ({ ...f, address_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input value={form.address_complement} onChange={(e) => setForm(f => ({ ...f, address_complement: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={form.address_neighborhood} onChange={(e) => setForm(f => ({ ...f, address_neighborhood: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Cidade</Label>
              <Input value={form.address_city} onChange={(e) => setForm(f => ({ ...f, address_city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input maxLength={2} value={form.address_state} onChange={(e) => setForm(f => ({ ...f, address_state: e.target.value.toUpperCase() }))} placeholder="SP" />
            </div>
          </div>
        </Card>

        {/* Passaporte */}
        <Card className="glass-card p-6 space-y-4 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-200 rounded-l" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg">Passaporte</h2>
          </div>
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50 bg-card/50">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Vai viajar para fora da América do Sul?</p>
              <p className="text-xs text-muted-foreground">Se sim, passaporte e validade são obrigatórios.</p>
            </div>
            <Switch checked={form.international_outside_sa} onCheckedChange={(v) => setForm(f => ({ ...f, international_outside_sa: v }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Número do passaporte {form.international_outside_sa && "*"}</Label>
              <Input value={form.passport_number} onChange={(e) => setForm(f => ({ ...f, passport_number: e.target.value.toUpperCase() }))} required={form.international_outside_sa} />
            </div>
            <div className="space-y-2">
              <Label>Validade {form.international_outside_sa && "*"}</Label>
              <Input type="date" value={form.passport_expiry} onChange={(e) => setForm(f => ({ ...f, passport_expiry: e.target.value }))} required={form.international_outside_sa} />
            </div>
          </div>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enviar meus dados
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-6">
          Seus dados são tratados com sigilo e usados apenas para organizar sua viagem.
        </p>
      </form>
    </div>
  );
}
