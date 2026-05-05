import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plane, CheckCircle2, ShieldCheck, Globe2, Check, AlertCircle, Camera, X, Upload } from "lucide-react";
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
  passport_photo_url: "",
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState<string>("");

  const fnUrl = useMemo(() => {
    const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/passenger-self-signup`;
  }, []);

  useEffect(() => {
    if (!slug) return;
    // Cache-bust with timestamp + no-store to evitar 404 antigo cacheado pelo navegador
    const bust = Date.now();
    fetch(`${fnUrl}?slug=${encodeURIComponent(slug)}&_=${bust}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
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
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { cache: "no-store" });
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

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Limite de 8MB.", variant: "destructive" });
      return;
    }
    setPhotoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `passport/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("passenger-uploads").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("passenger-uploads").getPublicUrl(path);
      setForm((f) => ({ ...f, passport_photo_url: pub.publicUrl }));
    } catch (e: any) {
      toast({ title: "Não foi possível enviar a foto", description: e?.message || "Tente de novo.", variant: "destructive" });
    } finally {
      setPhotoUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setBlockedMsg("");

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
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: JSON.stringify({ slug, payload: form }),
      });
      const j = await r.json();
      if (!r.ok || j.error) {
        // Bloqueio ou rate limit · exibe mensagem destacada acima do botão
        if (r.status === 429 || r.status === 409 || j.code) {
          setBlockedMsg(j.error || "Não foi possível concluir o cadastro agora.");
        } else {
          toast({ title: "Erro ao enviar", description: j.error || "Tente novamente", variant: "destructive" });
        }
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch (err) {
      toast({ title: "Erro de conexão", description: "Verifique sua internet e tente novamente.", variant: "destructive" });
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
        <Card className="p-8 sm:p-10 max-w-md w-full text-center space-y-4">
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
        <Card className="p-8 sm:p-10 max-w-md w-full text-center space-y-5">

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

  const sectionAccent = "hidden";

  // Helpers for sequential DOB inputs
  const dobParts = (() => {
    const [y = "", m = "", d = ""] = (form.birth_date || "").split("-");
    return { d, m, y };
  })();
  const setDob = (next: { d?: string; m?: string; y?: string }) => {
    const d = (next.d ?? dobParts.d).replace(/\D/g, "").slice(0, 2);
    const m = (next.m ?? dobParts.m).replace(/\D/g, "").slice(0, 2);
    const y = (next.y ?? dobParts.y).replace(/\D/g, "").slice(0, 4);
    const iso = y && m && d ? `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
    setForm((f) => ({ ...f, birth_date: iso }));
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center">
      {/* Hero */}
      <header className="w-full border-b border-border/30">
        <div className="w-full max-w-xl mx-auto px-5 sm:px-6 py-8 sm:py-10 text-center space-y-3">
          <img src={logo} alt="NatLeva" className="h-10 sm:h-12 mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-display tracking-tight">Seu cadastro de passageiro</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Preenche com calma. Leva só uns minutinhos e nos ajuda a deixar a sua viagem 100% redonda.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="w-full max-w-xl mx-auto px-5 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Dados pessoais */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            <h2 className="font-display text-base sm:text-lg">Dados pessoais</h2>
          </div>
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input inputMode="numeric" value={form.cpf} onChange={(e) => setForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label>Data de nascimento</Label>
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="DD"
                  className="text-center"
                  value={dobParts.d}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setDob({ d: v });
                    if (v.length === 2) {
                      const next = e.currentTarget.parentElement?.querySelectorAll("input")[1] as HTMLInputElement | undefined;
                      next?.focus();
                    }
                  }}
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="MM"
                  className="text-center"
                  value={dobParts.m}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setDob({ m: v });
                    if (v.length === 2) {
                      const next = e.currentTarget.parentElement?.querySelectorAll("input")[2] as HTMLInputElement | undefined;
                      next?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !dobParts.m) {
                      const prev = (e.currentTarget.parentElement?.querySelectorAll("input")[0] as HTMLInputElement | undefined);
                      prev?.focus();
                    }
                  }}
                />
                <span className="text-muted-foreground">/</span>
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="AAAA"
                  className="text-center"
                  value={dobParts.y}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setDob({ y: v });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !dobParts.y) {
                      const prev = (e.currentTarget.parentElement?.querySelectorAll("input")[1] as HTMLInputElement | undefined);
                      prev?.focus();
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>RG</Label>
              <Input value={form.rg} onChange={(e) => setForm(f => ({ ...f, rg: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" inputMode="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="voce@email.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone com WhatsApp *</Label>
            <Input inputMode="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" required />
          </div>
        </Card>

        {/* Endereço */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-primary" />
            <h2 className="font-display text-base sm:text-lg">Endereço</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  value={form.address_cep}
                  onChange={(e) => {
                    const v = formatCep(e.target.value);
                    setForm(f => ({ ...f, address_cep: v }));
                    setCepFound(false);
                    setCepError("");
                    if (v.replace(/\D/g, "").length === 8) fetchCep(v);
                  }}
                  placeholder="00000-000"
                  className={cepInvalid || cepError ? "border-destructive pr-9" : "pr-9"}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {cepLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {!cepLoading && cepFound && <Check className="w-4 h-4 text-primary" />}
                  {!cepLoading && (cepError || cepInvalid) && <AlertCircle className="w-4 h-4 text-destructive" />}
                </div>
              </div>
              {(cepInvalid || cepError) && (
                <p className="text-xs text-destructive">{cepError || "CEP incompleto"}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Rua</Label>
              <Input value={form.address_street} onChange={(e) => setForm(f => ({ ...f, address_street: e.target.value }))} placeholder="Preenchido pelo CEP" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input inputMode="numeric" value={form.address_number} onChange={(e) => setForm(f => ({ ...f, address_number: e.target.value }))} />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Cidade</Label>
              <Input value={form.address_city} onChange={(e) => setForm(f => ({ ...f, address_city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Input
                maxLength={2}
                value={form.address_state}
                onChange={(e) => setForm(f => ({ ...f, address_state: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))}
                placeholder="SP"
                className={stateInvalid ? "border-destructive" : ""}
              />
              {stateInvalid && <p className="text-xs text-destructive">UF deve ter 2 letras</p>}
            </div>
          </div>
        </Card>

        {/* Passaporte */}
        <Card className="glass-card p-5 sm:p-6 space-y-4 relative overflow-hidden">
          <div className={sectionAccent} />
          <div className="flex items-center gap-2 pt-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-display text-base sm:text-lg">Passaporte</h2>
          </div>
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50 bg-card/50">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Vai viajar para fora da América do Sul?</p>
              <p className="text-xs text-muted-foreground">Se sim, passaporte e validade são obrigatórios.</p>
            </div>
            <Switch checked={form.international_outside_sa} onCheckedChange={(v) => setForm(f => ({ ...f, international_outside_sa: v }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Número do passaporte {form.international_outside_sa && "*"}</Label>
              <Input value={form.passport_number} onChange={(e) => setForm(f => ({ ...f, passport_number: e.target.value.toUpperCase() }))} required={form.international_outside_sa} />
            </div>
            <div className="space-y-2">
              <Label>Validade {form.international_outside_sa && "*"}</Label>
              <Input type="date" value={form.passport_expiry} onChange={(e) => setForm(f => ({ ...f, passport_expiry: e.target.value }))} required={form.international_outside_sa} />
            </div>
          </div>

          {/* Passport photo · optional */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" /> Foto do passaporte <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            {form.passport_photo_url ? (
              <div className="relative inline-block">
                <img src={form.passport_photo_url} alt="Passaporte" className="h-32 rounded-lg border border-border object-cover" />
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, passport_photo_url: "" }))}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                  aria-label="Remover foto">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border bg-card/40 cursor-pointer hover:bg-card/60 transition text-sm text-muted-foreground">
                {photoUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Anexar foto do passaporte</>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={photoUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </Card>

        {blockedMsg && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{blockedMsg}</p>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting || photoUploading}>
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
