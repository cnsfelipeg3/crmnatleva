import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plane, Globe2, ShieldCheck, Loader2, Check, AlertCircle,
  Camera, Upload, X, Trash2, User,
} from "lucide-react";

export type PassengerFormState = {
  full_name: string;
  cpf: string;
  birth_date: string;
  rg: string;
  email: string;
  phone: string;
  phone_country: string;
  passport_number: string;
  passport_expiry: string;
  passport_photo_url: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  international_outside_sa: boolean;
};

export const emptyPassenger: PassengerFormState = {
  full_name: "", cpf: "", birth_date: "", rg: "", email: "",
  phone: "", phone_country: "BR", passport_number: "", passport_expiry: "",
  passport_photo_url: "",
  address_cep: "", address_street: "", address_number: "",
  address_complement: "", address_neighborhood: "",
  address_city: "", address_state: "",
  international_outside_sa: false,
};

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function daysInMonth(m: number, y: number) {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}
export function validateDob(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "Use o formato DD/MM/AAAA";
  const y = +m[1], mo = +m[2], d = +m[3];
  const currentYear = new Date().getFullYear();
  if (y < 1900 || y > currentYear) return `Ano deve estar entre 1900 e ${currentYear}`;
  if (mo < 1 || mo > 12) return "Mês inválido (01 a 12)";
  const max = daysInMonth(mo, y);
  if (d < 1 || d > max) return `Dia inválido para ${String(mo).padStart(2, "0")}/${y} (máx ${max})`;
  const date = new Date(y, mo - 1, d);
  if (date > new Date()) return "Data não pode ser no futuro";
  return "";
}

type Props = {
  index: number;
  value: PassengerFormState;
  onChange: (next: PassengerFormState) => void;
  onRemove?: () => void;
  canRemove?: boolean;
};

export default function PassengerFormCard({ index, value, onChange, onRemove, canRemove }: Props) {
  const { toast } = useToast();
  const [dobParts, setDobParts] = useState(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.birth_date || "");
    return m ? { d: m[3], m: m[2], y: m[1] } : { d: "", m: "", y: "" };
  });
  const [dobError, setDobError] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cepFound, setCepFound] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const dobDayRef = useRef<HTMLInputElement>(null);
  const dobMonthRef = useRef<HTMLInputElement>(null);
  const dobYearRef = useRef<HTMLInputElement>(null);

  const setForm = (updater: (f: PassengerFormState) => PassengerFormState) => onChange(updater(value));

  const cepDigits = value.address_cep.replace(/\D/g, "");
  const cepInvalid = cepDigits.length > 0 && cepDigits.length < 8;
  const stateInvalid = value.address_state.length > 0 && value.address_state.length !== 2;

  const fetchCep = async (cep: string) => {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    setCepLoading(true); setCepError(""); setCepFound(false);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { cache: "no-store" });
      const j = await r.json();
      if (j.erro) { setCepError("CEP não encontrado"); return; }
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

  const focusField = (ref: React.RefObject<HTMLInputElement>) => {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      try { const len = el.value.length; el.setSelectionRange(len, len); } catch {}
    });
  };
  const commitDob = (parts: { d: string; m: string; y: string }) => {
    const d = parts.d.replace(/\D/g, "").slice(0, 2);
    const m = parts.m.replace(/\D/g, "").slice(0, 2);
    const y = parts.y.replace(/\D/g, "").slice(0, 4);
    setDobParts({ d, m, y });
    const iso = y.length === 4 && m.length >= 1 && d.length >= 1
      ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
      : "";
    setForm((f) => ({ ...f, birth_date: iso }));
    if (iso) setDobError(validateDob(iso));
    else setDobError("");
  };
  const splitDobDigits = (raw: string) => {
    const text = raw.replace(/\D/g, "").slice(0, 8);
    if (text.length === 8 && +text.slice(0, 4) >= 1900) {
      return { d: text.slice(6, 8), m: text.slice(4, 6), y: text.slice(0, 4) };
    }
    return { d: text.slice(0, 2), m: text.slice(2, 4), y: text.slice(4, 8) };
  };
  const handleDobChange = (field: "d" | "m" | "y", v: string) => {
    const clean = v.replace(/\D/g, "");
    const max = field === "y" ? 4 : 2;
    if (clean.length === 0 && dobParts[field].length === 0) {
      if (field === "m") focusField(dobDayRef);
      if (field === "y") focusField(dobMonthRef);
      return;
    }
    if (clean.length > max) {
      const current = clean.slice(0, max);
      const overflow = clean.slice(max);
      const next = { ...dobParts, [field]: current };
      if (field === "d") {
        next.m = (overflow + dobParts.m).replace(/\D/g, "").slice(0, 2);
        if (overflow.length >= 2) next.y = (overflow.slice(2) + dobParts.y).replace(/\D/g, "").slice(0, 4);
        commitDob(next);
        focusField(next.m.length >= 2 ? dobYearRef : dobMonthRef);
      } else if (field === "m") {
        next.y = (overflow + dobParts.y).replace(/\D/g, "").slice(0, 4);
        commitDob(next);
        focusField(dobYearRef);
      } else {
        commitDob(next);
      }
      return;
    }
    const next = { ...dobParts, [field]: clean };
    commitDob(next);
    if (field === "d" && clean.length === 2) focusField(dobMonthRef);
    if (field === "m" && clean.length === 2) focusField(dobYearRef);
  };
  const handleDobPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.replace(/\D/g, "").length >= 6) {
      e.preventDefault();
      const parts = splitDobDigits(text);
      commitDob(parts);
      focusField(parts.y.length === 4 ? dobYearRef : dobMonthRef);
    }
  };
  const handleDobKeyDown = (field: "d" | "m" | "y", e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !dobParts[field]) {
      e.preventDefault();
      if (field === "m") focusField(dobDayRef);
      if (field === "y") focusField(dobMonthRef);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header do passageiro */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <h3 className="font-display text-base sm:text-lg">
            Passageiro {index + 1}
            {value.full_name ? <span className="text-muted-foreground font-sans text-sm font-normal"> · {value.full_name}</span> : null}
          </h3>
        </div>
        {canRemove && onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-1" /> Remover
          </Button>
        )}
      </div>

      <Card className="p-5 sm:p-6 space-y-8 overflow-hidden">
        {/* Dados pessoais */}
        <section className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            <h2 className="font-display text-base sm:text-lg">Dados pessoais</h2>
          </div>
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input value={value.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input inputMode="numeric" value={value.cpf} onChange={(e) => setForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label>Data de nascimento</Label>
              <div className="flex w-full items-center gap-1.5">
                <Input ref={dobDayRef} inputMode="numeric" pattern="[0-9]*" placeholder="DD" aria-label="Dia" autoComplete="bday-day" maxLength={2}
                  className={`h-11 flex-1 min-w-0 text-center tabular-nums px-2 ${dobError ? "border-destructive" : ""}`}
                  value={dobParts.d} onPaste={handleDobPaste} onChange={(e) => handleDobChange("d", e.target.value)} onKeyDown={(e) => handleDobKeyDown("d", e)} />
                <span className="text-muted-foreground select-none shrink-0">/</span>
                <Input ref={dobMonthRef} inputMode="numeric" pattern="[0-9]*" placeholder="MM" aria-label="Mês" autoComplete="bday-month" maxLength={2}
                  className={`h-11 flex-1 min-w-0 text-center tabular-nums px-2 ${dobError ? "border-destructive" : ""}`}
                  value={dobParts.m} onPaste={handleDobPaste} onChange={(e) => handleDobChange("m", e.target.value)} onKeyDown={(e) => handleDobKeyDown("m", e)} />
                <span className="text-muted-foreground select-none shrink-0">/</span>
                <Input ref={dobYearRef} inputMode="numeric" pattern="[0-9]*" placeholder="AAAA" aria-label="Ano" autoComplete="bday-year" maxLength={4}
                  className={`h-11 flex-[1.4] min-w-0 text-center tabular-nums px-2 ${dobError ? "border-destructive" : ""}`}
                  value={dobParts.y} onPaste={handleDobPaste} onChange={(e) => handleDobChange("y", e.target.value)} onKeyDown={(e) => handleDobKeyDown("y", e)} />
              </div>
              {dobError ? (
                <p className="text-xs text-destructive">{dobError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Formato DD/MM/AAAA</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>RG</Label>
              <Input value={value.rg} onChange={(e) => setForm(f => ({ ...f, rg: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" inputMode="email" value={value.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="voce@email.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone com WhatsApp *</Label>
            <PhoneInput
              value={value.phone}
              countryCode={value.phone_country}
              onChange={(full, { country }) => setForm((f) => ({ ...f, phone: full, phone_country: country.code }))}
              required
            />
          </div>
        </section>

        <div className="h-px bg-border/60" />

        {/* Endereço */}
        <section className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Globe2 className="w-4 h-4 text-primary" />
            <h2 className="font-display text-base sm:text-lg">Endereço</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input inputMode="numeric" value={value.address_cep}
                  onChange={(e) => {
                    const v = formatCep(e.target.value);
                    setForm(f => ({ ...f, address_cep: v }));
                    setCepFound(false); setCepError("");
                    if (v.replace(/\D/g, "").length === 8) fetchCep(v);
                  }}
                  placeholder="00000-000"
                  className={cepInvalid || cepError ? "border-destructive pr-9" : "pr-9"} />
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
              <Input value={value.address_street} onChange={(e) => setForm(f => ({ ...f, address_street: e.target.value }))} placeholder="Preenchido pelo CEP" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input inputMode="numeric" value={value.address_number} onChange={(e) => setForm(f => ({ ...f, address_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input value={value.address_complement} onChange={(e) => setForm(f => ({ ...f, address_complement: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={value.address_neighborhood} onChange={(e) => setForm(f => ({ ...f, address_neighborhood: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Cidade</Label>
              <Input value={value.address_city} onChange={(e) => setForm(f => ({ ...f, address_city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Input maxLength={2} value={value.address_state}
                onChange={(e) => setForm(f => ({ ...f, address_state: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))}
                placeholder="SP" className={stateInvalid ? "border-destructive" : ""} />
              {stateInvalid && <p className="text-xs text-destructive">UF deve ter 2 letras</p>}
            </div>
          </div>
        </section>

        <div className="h-px bg-border/60" />

        {/* Documento de Viagem */}
        <section className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-display text-base sm:text-lg">Documento de Viagem</h2>
          </div>
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50 bg-card/50">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Vai viajar para fora da América do Sul?</p>
              <p className="text-xs text-muted-foreground">Se sim, passaporte e validade são obrigatórios.</p>
            </div>
            <Switch checked={value.international_outside_sa} onCheckedChange={(v) => setForm(f => ({ ...f, international_outside_sa: v }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Número do passaporte {value.international_outside_sa && "*"}</Label>
              <Input value={value.passport_number} onChange={(e) => setForm(f => ({ ...f, passport_number: e.target.value.toUpperCase() }))} required={value.international_outside_sa} />
            </div>
            <div className="space-y-2">
              <Label>Validade {value.international_outside_sa && "*"}</Label>
              <Input type="date" value={value.passport_expiry} onChange={(e) => setForm(f => ({ ...f, passport_expiry: e.target.value }))} required={value.international_outside_sa} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" /> Foto do passaporte <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            {value.passport_photo_url ? (
              <div className="relative inline-block">
                <img src={value.passport_photo_url} alt="Passaporte" className="h-32 rounded-lg border border-border object-cover" />
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
                <input type="file" accept="image/*" capture="environment" className="hidden" disabled={photoUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                    e.target.value = "";
                  }} />
              </label>
            )}
          </div>
        </section>
      </Card>
    </div>
  );
}
