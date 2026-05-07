import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, ChevronDown, ArrowLeft, CheckCircle2, AlertTriangle, MessageCircle, Sparkles } from "lucide-react";
import { AsYouType, parsePhoneNumberFromString, getCountries, getCountryCallingCode } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Country {
  code: CountryCode;
  name: string;
  flag: string;
  dial: string;
}

const TOP_COUNTRIES: Country[] = [
  { code: "BR", name: "Brasil", flag: "🇧🇷", dial: "55" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dial: "1" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "351" },
  { code: "ES", name: "Espanha", flag: "🇪🇸", dial: "34" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "54" },
  { code: "MX", name: "México", flag: "🇲🇽", dial: "52" },
  { code: "IT", name: "Itália", flag: "🇮🇹", dial: "39" },
  { code: "FR", name: "França", flag: "🇫🇷", dial: "33" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", dial: "44" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪", dial: "49" },
];

const COUNTRY_NAMES_PT: Record<string, string> = {
  CA: "Canadá", CH: "Suíça", NL: "Holanda", BE: "Bélgica", IE: "Irlanda", AT: "Áustria",
  CL: "Chile", UY: "Uruguai", PY: "Paraguai", PE: "Peru", CO: "Colômbia", VE: "Venezuela",
  JP: "Japão", CN: "China", KR: "Coreia do Sul", IN: "Índia", AU: "Austrália", NZ: "Nova Zelândia",
  AE: "Emirados Árabes", SA: "Arábia Saudita", IL: "Israel", TR: "Turquia", ZA: "África do Sul",
  RU: "Rússia", PL: "Polônia", SE: "Suécia", NO: "Noruega", DK: "Dinamarca", FI: "Finlândia",
  GR: "Grécia", CZ: "República Tcheca", HU: "Hungria", RO: "Romênia",
};

function flagFromCode(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(...code.toUpperCase().split("").map(c => A + c.charCodeAt(0) - 65));
}

const ALL_COUNTRIES: Country[] = (() => {
  const top = new Set(TOP_COUNTRIES.map(c => c.code));
  const extra: Country[] = [];
  for (const code of getCountries()) {
    if (top.has(code)) continue;
    try {
      const dial = getCountryCallingCode(code);
      extra.push({
        code,
        name: COUNTRY_NAMES_PT[code] || (new Intl.DisplayNames(["pt-BR"], { type: "region" }).of(code) || code),
        flag: flagFromCode(code),
        dial: String(dial),
      });
    } catch { /* skip */ }
  }
  extra.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return [...TOP_COUNTRIES, ...extra];
})();

type Stage = "input" | "checking" | "not_found" | "found" | "creating";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Array<{ id: string; phone?: string | null; db_id?: string }>;
  waConnected: boolean;
  onSelectConversation: (id: string) => void;
}

export function NewConversationDialog({ open, onOpenChange, conversations, waConnected, onSelectConversation }: Props) {
  const [country, setCountry] = useState<Country>(TOP_COUNTRIES[0]);
  const [rawPhone, setRawPhone] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [waName, setWaName] = useState<string | null>(null);
  const [crmName, setCrmName] = useState("");
  const [normalizedE164, setNormalizedE164] = useState<string>("");
  const [existingConvId, setExistingConvId] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStage("input");
        setRawPhone("");
        setErrorMsg(null);
        setProfilePic(null);
        setWaName(null);
        setCrmName("");
        setNormalizedE164("");
        setExistingConvId(null);
        setCountrySearch("");
      }, 200);
    } else {
      setTimeout(() => phoneInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Format phone as user types
  const formattedPhone = useMemo(() => {
    if (!rawPhone) return "";
    try {
      return new AsYouType(country.code).input(rawPhone);
    } catch {
      return rawPhone;
    }
  }, [rawPhone, country]);

  // Validate
  const validation = useMemo(() => {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 0) return { state: "empty" as const, e164: "" };
    try {
      const parsed = parsePhoneNumberFromString(rawPhone, country.code);
      if (parsed && parsed.isValid()) {
        return { state: "valid" as const, e164: parsed.number.replace("+", "") };
      }
      if (digits.length < 6) return { state: "incomplete" as const, e164: "" };
      return { state: "invalid" as const, e164: "" };
    } catch {
      return { state: "invalid" as const, e164: "" };
    }
  }, [rawPhone, country]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const filteredCountriesShown = filteredCountries.slice(0, 80);

  async function handleVerify() {
    if (validation.state !== "valid") return;
    if (!waConnected) {
      toast.error("Reconecte o WhatsApp antes de iniciar nova conversa");
      return;
    }
    setStage("checking");
    setErrorMsg(null);
    setProfilePic(null);
    setWaName(null);
    const phone = validation.e164;
    setNormalizedE164(phone);

    // Check existing conversation locally first
    const existing = conversations.find(c => {
      const cp = (c.phone || "").replace(/\D/g, "");
      return cp === phone;
    });
    if (existing) {
      setExistingConvId(existing.id);
    }

    const callProxy = (action: string, payload: any, timeoutMs = 15000) => {
      const invocation = supabase.functions.invoke("zapi-proxy", { body: { action, payload } });
      const timeout = new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), timeoutMs)
      );
      return Promise.race([invocation, timeout]) as Promise<{ data: any; error: any }>;
    };

    try {
      // Critical: only check-number must succeed. Pic + contact are best-effort.
      const [existsRes, picRes, contactRes] = await Promise.all([
        callProxy("check-number", { phone }, 15000),
        callProxy("get-profile-picture", { phone }, 10000).catch(() => ({ data: null, error: null })),
        callProxy("get-contact", { phone }, 10000).catch(() => ({ data: null, error: null })),
      ]);

      if (existsRes?.error?.message === "timeout") {
        setErrorMsg("Z-API não respondeu · tente novamente em alguns segundos");
        setStage("input");
        toast.error("Z-API não respondeu");
        return;
      }
      if (existsRes?.error) {
        console.error("[NewConversation] check-number error:", existsRes.error);
        setErrorMsg("Erro ao verificar número · tente novamente");
        setStage("input");
        toast.error("Erro ao verificar número");
        return;
      }

      const existsData = existsRes?.data;
      const hasWhats =
        existsData?.exists === true ||
        existsData?.exists === "true" ||
        existsData?.numberExists === true ||
        (typeof existsData === "object" && existsData?.success !== false && (existsData?.exists ?? existsData?.numberExists) !== false && !!(existsData?.phone || existsData?.contactName || existsData?.name));

      if (!hasWhats) {
        setStage("not_found");
        return;
      }

      const picUrl = picRes?.data?.link || picRes?.data?.profilePictureUrl || null;
      setProfilePic(picUrl);

      const contactData = contactRes?.data;
      const fetchedName =
        contactData?.name ||
        contactData?.displayName ||
        contactData?.short ||
        existsData?.contactName ||
        existsData?.name ||
        null;
      setWaName(fetchedName);
      setCrmName(fetchedName || "");

      setStage("found");
      setTimeout(() => nameInputRef.current?.focus(), 100);
    } catch (err: any) {
      console.error("[NewConversation] verify failed:", err);
      setErrorMsg("Erro ao verificar número · tente novamente");
      setStage("input");
      toast.error("Erro ao verificar número");
    }
  }

  async function handleCreate() {
    if (!normalizedE164) return;
    if (existingConvId) {
      onSelectConversation(existingConvId);
      onOpenChange(false);
      return;
    }
    setStage("creating");
    try {
      const finalName = (crmName || waName || "").trim() || `+${normalizedE164}`;
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          phone: normalizedE164,
          contact_name: finalName,
          display_name: finalName,
          profile_picture_url: profilePic,
          source: "whatsapp",
          status: "novo",
          funnel_stage: "novo_lead",
          stage: "novo_lead",
          last_message_at: null,
          last_message_preview: null,
          profile_picture_fetched_at: profilePic ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success(`Conversa criada com ${finalName}`);

      // Foto de perfil já gravada via URL · persistência em background é feita pelo job backfill-profile-pics

      onSelectConversation(data!.id);
      onOpenChange(false);
    } catch (err: any) {
      console.error("[NewConversation] create failed:", err);
      const detail = err?.message || err?.error?.message || err?.details || "tente novamente";
      toast.error(`Erro ao salvar contato · ${detail}`);
      setStage("found");
    }
  }

  const borderClass =
    validation.state === "valid" ? "border-emerald-500 focus-visible:ring-emerald-500" :
    validation.state === "invalid" ? "border-destructive focus-visible:ring-destructive" :
    "border-input";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              {(stage === "found" || stage === "not_found") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 -ml-1"
                  onClick={() => { setStage("input"); setExistingConvId(null); }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="text-lg font-semibold">Nova conversa</DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              {stage === "input" && "Digite o número de telefone do contato"}
              {stage === "checking" && "Verificando número..."}
              {stage === "not_found" && "Número não encontrado no WhatsApp"}
              {stage === "found" && "Confirme os dados do contato"}
              {stage === "creating" && "Criando conversa..."}
            </DialogDescription>
          </DialogHeader>

          {/* ETAPA 1 — Input */}
          {stage === "input" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex gap-2">
                {/* Country selector */}
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[130px] justify-between px-2.5 shrink-0"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base leading-none">{country.flag}</span>
                        <span className="text-xs font-mono">+{country.dial}</span>
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar país..."
                          value={countrySearch}
                          onChange={e => setCountrySearch(e.target.value)}
                          className="pl-7 h-8 text-xs"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto">
                      {filteredCountriesShown.map(c => (
                        <button
                          key={c.code}
                          onClick={() => { setCountry(c); setCountryOpen(false); setCountrySearch(""); phoneInputRef.current?.focus(); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition text-left",
                            country.code === c.code && "bg-accent"
                          )}
                        >
                          <span className="text-base leading-none">{c.flag}</span>
                          <span className="flex-1 truncate">{c.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">+{c.dial}</span>
                        </button>
                      ))}
                      {filteredCountriesShown.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">Nenhum país encontrado</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Phone input */}
                <Input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="tel"
                  placeholder={country.code === "BR" ? "(11) 91234-5678" : "Número"}
                  value={formattedPhone}
                  onChange={e => setRawPhone(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && validation.state === "valid") handleVerify(); }}
                  className={cn("flex-1 font-mono", borderClass)}
                />
              </div>

              {validation.state === "invalid" && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Número inválido para {country.name}
                </p>
              )}
              {errorMsg && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {errorMsg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={handleVerify} disabled={validation.state !== "valid"}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Verificar
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 2 — Checking */}
          {stage === "checking" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando WhatsApp...
              </p>
            </div>
          )}

          {/* ETAPA 3a — Not Found */}
          {stage === "not_found" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Este número não tem WhatsApp</p>
                    <p className="text-xs text-muted-foreground">
                      Verifique se digitou corretamente. Talvez falte ou sobre algum dígito.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setStage("input")}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 3b — Found */}
          {(stage === "found" || stage === "creating") && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-2 ring-emerald-500/30">
                    {profilePic && <AvatarImage src={profilePic} alt={waName || normalizedE164} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(waName || normalizedE164).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    {waName && <p className="font-semibold truncate">{waName}</p>}
                    <p className="text-xs font-mono text-muted-foreground">+{normalizedE164}</p>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[10px] gap-1 h-5">
                      <CheckCircle2 className="h-3 w-3" />
                      WhatsApp ativo
                    </Badge>
                  </div>
                </div>
              </div>

              {existingConvId ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Já existe uma conversa com este contato. Deseja abri-la?
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button size="sm" onClick={() => { onSelectConversation(existingConvId); onOpenChange(false); }}>
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                      Abrir conversa existente
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nome no CRM</label>
                    <Input
                      ref={nameInputRef}
                      value={crmName}
                      onChange={e => setCrmName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                      placeholder="Nome do contato"
                      disabled={stage === "creating"}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={stage === "creating"}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={stage === "creating"}>
                      {stage === "creating" ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Criando...</>
                      ) : (
                        <><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Iniciar conversa</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
