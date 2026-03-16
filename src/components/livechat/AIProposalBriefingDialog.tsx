import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane, MapPin, Calendar, Users, Heart, Hotel, CreditCard,
  Loader2, Sparkles, Check, AlertCircle, ArrowRight, Baby, User,
  Clock, Target, FileText, Route, ChevronDown, ChevronUp,
  Pencil, X, Shield, Zap, Star, History, Eye, EyeOff, Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export interface ProposalBriefing {
  origin?: string | null;
  destination?: string | null;
  sub_destinations?: string[] | null;
  departure_date?: string | null;
  return_date?: string | null;
  duration_days?: number | null;
  adults?: number | null;
  children?: number | null;
  babies?: number | null;
  trip_type?: string | null;
  trip_style?: string | null;
  hotel_preference?: string | null;
  flight_preference?: string | null;
  other_preferences?: string | null;
  restrictions?: string[] | null;
  budget?: string | null;
  urgency_level?: string | null;
  closing_probability?: string | null;
  client_profile?: string | null;
  briefing_summary?: string | null;
  proposal_title?: string | null;
  intro_text?: string | null;
  itinerary_suggestion?: { city: string; nights: number; highlights?: string }[] | null;
  next_steps?: string[] | null;
  internal_notes?: string | null;
  confidence?: string | null;
  client_name?: string | null;
  client_id?: string | null;
  // Journey-aware fields
  client_history_summary?: string | null;
  discarded_topics?: { topic: string; period?: string; reason?: string }[] | null;
  current_demand_confidence?: string | null;
  ambiguous_demands?: { destination: string; period?: string; evidence?: string }[] | null;
  client_profile_insights?: string | null;
  total_messages_analyzed?: number | null;
  detected_trip_cycles?: {
    destination: string;
    subdestinations?: string[];
    period?: string;
    dates?: string;
    passengers?: number;
    status: string;
    is_current_demand: boolean;
    evidence?: string;
  }[] | null;
}

interface AIProposalBriefingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationDbId: string;
  contactName: string;
}

const CONFIDENCE_MAP: Record<string, { label: string; className: string }> = {
  high: { label: "Alta confiança", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  medium: { label: "Média confiança", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  low: { label: "Baixa confiança", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  none: { label: "Sem dados", className: "bg-muted text-muted-foreground" },
};

const DEMAND_CONFIDENCE_MAP: Record<string, { label: string; className: string; icon: string }> = {
  alta: { label: "Demanda atual clara", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: "✅" },
  media: { label: "Demanda parcialmente clara", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: "⚠️" },
  baixa: { label: "Demanda incerta", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: "❓" },
};

const STYLE_MAP: Record<string, { label: string; emoji: string }> = {
  essencial: { label: "Essencial", emoji: "💰" },
  conforto: { label: "Conforto", emoji: "⭐" },
  premium: { label: "Premium", emoji: "✨" },
  ultra_luxo: { label: "Ultra Luxo", emoji: "👑" },
};

const URGENCY_MAP: Record<string, { label: string; className: string }> = {
  alta: { label: "Alta urgência", className: "text-red-500" },
  media: { label: "Urgência moderada", className: "text-amber-500" },
  baixa: { label: "Sem urgência", className: "text-muted-foreground" },
};

function EditableField({ label, value, onChange, icon: Icon, multiline }: {
  label: string; value: string; onChange: (v: string) => void; icon?: any; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  if (editing) {
    return (
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</label>
        {multiline ? (
          <Textarea
            value={local}
            onChange={e => setLocal(e.target.value)}
            className="text-xs min-h-[60px]"
            autoFocus
            onKeyDown={e => { if (e.key === "Escape") { setLocal(value); setEditing(false); } }}
          />
        ) : (
          <Input
            value={local}
            onChange={e => setLocal(e.target.value)}
            className="h-7 text-xs"
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter") { onChange(local); setEditing(false); }
              if (e.key === "Escape") { setLocal(value); setEditing(false); }
            }}
          />
        )}
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2 text-emerald-600" onClick={() => { onChange(local); setEditing(false); }}>
            <Check className="h-3 w-3 mr-1" /> Salvar
          </Button>
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => { setLocal(value); setEditing(false); }}>
            <X className="h-3 w-3 mr-1" /> Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group cursor-pointer" onClick={() => setEditing(true)}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        <Pencil className="h-2.5 w-2.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className={`text-xs mt-0.5 ${value ? "text-foreground font-medium" : "text-muted-foreground/50 italic"}`}>
        {value || "Não identificado — clique para editar"}
      </p>
    </div>
  );
}

type Step = "loading" | "review" | "creating";

export function AIProposalBriefingDialog({ open, onOpenChange, conversationDbId, contactName }: AIProposalBriefingDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [briefing, setBriefing] = useState<ProposalBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showItinerary, setShowItinerary] = useState(true);
  const [showNextSteps, setShowNextSteps] = useState(true);
  const [consultantNotes, setConsultantNotes] = useState("");
  const [selectedDemandIdx, setSelectedDemandIdx] = useState<number | null>(null);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [subDests, setSubDests] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [babies, setBabies] = useState("");
  const [tripType, setTripType] = useState("");
  const [budget, setBudget] = useState("");
  const [hotelPref, setHotelPref] = useState("");
  const [flightPref, setFlightPref] = useState("");
  const [otherPrefs, setOtherPrefs] = useState("");
  const [proposalTitle, setProposalTitle] = useState("");
  const [introText, setIntroText] = useState("");

  useEffect(() => {
    if (open && conversationDbId) {
      extractBriefing();
    }
  }, [open, conversationDbId]);

  const extractBriefing = async () => {
    setStep("loading");
    setError(null);
    setBriefing(null);
    setSelectedDemandIdx(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-proposal-briefing", {
        body: { conversationId: conversationDbId },
      });
      if (fnErr) throw fnErr;

      if (data?.briefing && data.briefing.confidence !== "none") {
        const b = data.briefing as ProposalBriefing;
        setBriefing(b);
        populateFields(b);
        setStep("review");
      } else {
        setError("Nenhuma viagem identificada nesta conversa.");
        setStep("review");
      }
    } catch (err: any) {
      console.error("Briefing extraction error:", err);
      setError(err.message || "Erro ao analisar conversa.");
      setStep("review");
    }
  };

  const populateFields = (b: ProposalBriefing) => {
    setOrigin(b.origin || "");
    setDestination(b.destination || "");
    setSubDests((b.sub_destinations || []).join(", "));
    setDepartureDate(b.departure_date || "");
    setReturnDate(b.return_date || "");
    setAdults(b.adults?.toString() || "");
    setChildren(b.children?.toString() || "");
    setBabies(b.babies?.toString() || "");
    setTripType(b.trip_type || "");
    setBudget(b.budget || "");
    setHotelPref(b.hotel_preference || "");
    setFlightPref(b.flight_preference || "");
    setOtherPrefs(b.other_preferences || "");
    setProposalTitle(b.proposal_title || "");
    setIntroText(b.intro_text || "");
  };

  const handleSelectDemand = (idx: number) => {
    if (!briefing?.ambiguous_demands?.[idx]) return;
    const demand = briefing.ambiguous_demands[idx];
    setSelectedDemandIdx(idx);
    setDestination(demand.destination);
    setDepartureDate(demand.period || "");
    setProposalTitle(`${demand.destination} · ${demand.period || ""}`);
    toast({ title: "Demanda selecionada", description: `Proposta será baseada em: ${demand.destination}` });
  };

  const handleCreateProposal = () => {
    setStep("creating");
    const params = new URLSearchParams();
    if (proposalTitle) params.set("title", proposalTitle);
    if (briefing?.client_name || contactName) params.set("client_name", briefing?.client_name || contactName);
    if (origin) params.set("origin", origin);
    if (destination) {
      const allDests = [destination, ...subDests.split(",").map(s => s.trim()).filter(Boolean)];
      params.set("destinations", allDests.join(","));
    }
    if (departureDate) params.set("start_date", departureDate);
    if (returnDate) params.set("end_date", returnDate);
    const totalPax = (parseInt(adults) || 0) + (parseInt(children) || 0) + (parseInt(babies) || 0);
    if (totalPax > 0) params.set("pax", totalPax.toString());
    if (introText) params.set("intro", introText);
    if (consultantNotes) params.set("notes", consultantNotes);
    const itinSummary = briefing?.itinerary_suggestion?.map(s => `${s.city}: ${s.nights} noites`).join(" → ") || "";
    if (itinSummary) params.set("itinerary", itinSummary);
    onOpenChange(false);
    navigate(`/propostas/nova?${params.toString()}`);
  };

  const confidence = CONFIDENCE_MAP[briefing?.confidence || "none"] || CONFIDENCE_MAP.none;
  const demandConf = briefing?.current_demand_confidence
    ? DEMAND_CONFIDENCE_MAP[briefing.current_demand_confidence]
    : null;
  const style = briefing?.trip_style ? STYLE_MAP[briefing.trip_style] : null;
  const urgency = briefing?.urgency_level ? URGENCY_MAP[briefing.urgency_level] : null;
  const hasAmbiguity = (briefing?.ambiguous_demands?.length || 0) > 1;
  const hasCycles = !!(briefing?.detected_trip_cycles?.length);
  const hasHistory = !!(briefing?.client_history_summary || briefing?.discarded_topics?.length || hasCycles);

  const CYCLE_STATUS_MAP: Record<string, { label: string; emoji: string; className: string }> = {
    cotacao_solicitada: { label: "Cotação", emoji: "📋", className: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
    proposta_enviada: { label: "Proposta enviada", emoji: "📤", className: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    viagem_realizada: { label: "Viagem realizada", emoji: "✅", className: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
    cotacao_abandonada: { label: "Abandonada", emoji: "⏸️", className: "text-muted-foreground bg-muted/50 border-border/50" },
    demanda_ativa: { label: "Demanda atual", emoji: "🔥", className: "text-primary bg-primary/10 border-primary/20" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Criar Proposta com IA</h2>
              <p className="text-xs text-muted-foreground">
                {step === "loading" ? "Analisando jornada completa do cliente..." : step === "creating" ? "Criando proposta..." : "Revise o briefing antes de criar a proposta"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {briefing?.total_messages_analyzed && (
                <Badge variant="outline" className="text-[9px] px-1.5 text-muted-foreground">
                  {briefing.total_messages_analyzed} msgs
                </Badge>
              )}
              {briefing && (
                <Badge className={`text-[10px] px-2 py-0.5 border ${confidence.className}`}>
                  {confidence.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="px-6 py-4">
            <AnimatePresence mode="wait">
              {step === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-4"
                >
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-primary absolute -top-1 -right-1" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-medium text-foreground">Analisando jornada completa</p>
                    <p className="text-xs text-muted-foreground">Lendo histórico, vendas e conversa atual...</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-4 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1"><History className="h-3 w-3" /> Histórico do cliente</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Separando assuntos</span>
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Identificando demanda atual</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> Extraindo preferências</span>
                  </div>
                </motion.div>
              )}

              {step === "review" && error && !briefing && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-12 gap-3"
                >
                  <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground text-center">{error}</p>
                  <Button variant="outline" size="sm" onClick={extractBriefing} className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Tentar novamente
                  </Button>
                </motion.div>
              )}

              {step === "review" && briefing && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  {/* ═══ AMBIGUITY ALERT ═══ */}
                  {hasAmbiguity && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-amber-700">Múltiplas demandas detectadas</p>
                          <p className="text-[10px] text-amber-600/80 mt-0.5">Selecione qual viagem deseja transformar em proposta:</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {briefing.ambiguous_demands!.map((d, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectDemand(i)}
                            className={`w-full text-left px-3 py-2 rounded-md border text-xs transition-all ${
                              selectedDemandIdx === i
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                            }`}
                          >
                            <span className="font-medium">{d.destination}</span>
                            {d.period && <span className="text-muted-foreground ml-1.5">· {d.period}</span>}
                            {d.evidence && <p className="text-[10px] text-muted-foreground/70 mt-0.5">"{d.evidence}"</p>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ═══ DEMAND CONFIDENCE ═══ */}
                  {demandConf && (
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] px-2 py-0.5 border ${demandConf.className}`}>
                        {demandConf.icon} {demandConf.label}
                      </Badge>
                      {briefing.destination && (
                        <span className="text-xs text-foreground/70">
                          Viagem detectada: <strong>{briefing.destination}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* ═══ CLIENT JOURNEY CONTEXT (collapsible) ═══ */}
                  {hasHistory && (
                    <div className="border border-border/30 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 bg-secondary/20 hover:bg-secondary/30 transition-colors"
                      >
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Contexto Histórico do Cliente</span>
                        {briefing.discarded_topics?.length ? (
                          <Badge variant="outline" className="text-[9px] px-1.5">
                            {briefing.discarded_topics.length} assunto{briefing.discarded_topics.length > 1 ? "s" : ""} descartado{briefing.discarded_topics.length > 1 ? "s" : ""}
                          </Badge>
                        ) : null}
                        {showHistory ? <EyeOff className="h-3 w-3 ml-auto text-muted-foreground" /> : <Eye className="h-3 w-3 ml-auto text-muted-foreground" />}
                      </button>
                      <AnimatePresence>
                        {showHistory && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 py-3 space-y-3">
                              {briefing.client_history_summary && (
                                <p className="text-xs text-foreground/70 leading-relaxed italic">
                                  "{briefing.client_history_summary}"
                                </p>
                              )}
                              {briefing.discarded_topics && briefing.discarded_topics.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Assuntos descartados da proposta</p>
                                  <div className="space-y-1">
                                    {briefing.discarded_topics.map((t, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs">
                                        <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                        <span className="text-foreground/70 font-medium">{t.topic}</span>
                                        {t.period && <span className="text-muted-foreground/50">({t.period})</span>}
                                        {t.reason && (
                                          <Badge variant="outline" className="text-[9px] px-1.5 text-muted-foreground/60">{t.reason}</Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {briefing.client_profile_insights && (
                                <div className="bg-primary/5 rounded-md px-3 py-2">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Info className="h-3 w-3 text-primary" />
                                    <span className="text-[10px] text-primary/80 uppercase tracking-wide font-medium">Insights do perfil</span>
                                  </div>
                                  <p className="text-xs text-foreground/70 leading-relaxed">{briefing.client_profile_insights}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ═══ BRIEFING SUMMARY ═══ */}
                  {briefing.briefing_summary && (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-primary/60 uppercase tracking-wide mb-1">Demanda Atual</p>
                          <p className="text-xs text-foreground/80 italic leading-relaxed">"{briefing.briefing_summary}"</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Commercial Signals */}
                  <div className="flex flex-wrap gap-2">
                    {style && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {style.emoji} {style.label}
                      </Badge>
                    )}
                    {urgency && (
                      <Badge variant="outline" className={`text-[10px] gap-1 ${urgency.className}`}>
                        <Zap className="h-2.5 w-2.5" /> {urgency.label}
                      </Badge>
                    )}
                    {briefing.closing_probability && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Target className="h-2.5 w-2.5" /> Chance: {briefing.closing_probability}
                      </Badge>
                    )}
                    {briefing.client_profile && briefing.client_profile !== "indeterminado" && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Star className="h-2.5 w-2.5" /> Perfil {briefing.client_profile}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Editable Fields */}
                  <EditableField label="Título da Proposta" value={proposalTitle} onChange={setProposalTitle} icon={FileText} />
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Origem" value={origin} onChange={setOrigin} icon={MapPin} />
                    <EditableField label="Destino Principal" value={destination} onChange={setDestination} icon={Plane} />
                  </div>
                  <EditableField label="Subdestinos" value={subDests} onChange={setSubDests} icon={Route} />
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Ida" value={departureDate} onChange={setDepartureDate} icon={Calendar} />
                    <EditableField label="Volta / Duração" value={returnDate} onChange={setReturnDate} icon={Calendar} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <EditableField label="Adultos" value={adults} onChange={setAdults} icon={User} />
                    <EditableField label="Crianças" value={children} onChange={setChildren} icon={Users} />
                    <EditableField label="Bebês" value={babies} onChange={setBabies} icon={Baby} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Tipo de Viagem" value={tripType} onChange={setTripType} icon={Heart} />
                    <EditableField label="Orçamento" value={budget} onChange={setBudget} icon={CreditCard} />
                  </div>

                  <Separator />

                  <EditableField label="Preferência de Hotel" value={hotelPref} onChange={setHotelPref} icon={Hotel} />
                  <EditableField label="Preferência de Voo" value={flightPref} onChange={setFlightPref} icon={Plane} />
                  <EditableField label="Outras Preferências" value={otherPrefs} onChange={setOtherPrefs} multiline />

                  {/* Restrictions */}
                  {briefing.restrictions && briefing.restrictions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Restrições</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {briefing.restrictions.map((r, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-destructive/5 text-destructive/80 border-destructive/20">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Itinerary Suggestion */}
                  {briefing.itinerary_suggestion && briefing.itinerary_suggestion.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowItinerary(!showItinerary)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <Route className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Sugestão de Roteiro</span>
                        <Badge variant="secondary" className="text-[9px] px-1.5">{briefing.itinerary_suggestion.length} paradas</Badge>
                        {showItinerary ? <ChevronUp className="h-3 w-3 ml-auto text-muted-foreground" /> : <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />}
                      </button>
                      <AnimatePresence>
                        {showItinerary && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-1.5 pl-5">
                              {briefing.itinerary_suggestion.map((s, i) => (
                                <div key={i} className="flex items-start gap-2 py-1.5 relative">
                                  {i < briefing.itinerary_suggestion!.length - 1 && (
                                    <div className="absolute left-[3px] top-5 w-px h-[calc(100%+6px)] bg-border/50" />
                                  )}
                                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0 relative z-10" />
                                  <div>
                                    <span className="text-xs font-medium text-foreground">{s.city}</span>
                                    <span className="text-[10px] text-muted-foreground ml-1.5">· {s.nights} noite{s.nights > 1 ? "s" : ""}</span>
                                    {s.highlights && (
                                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.highlights}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Next Steps */}
                  {briefing.next_steps && briefing.next_steps.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowNextSteps(!showNextSteps)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Próximos Passos Sugeridos</span>
                        {showNextSteps ? <ChevronUp className="h-3 w-3 ml-auto text-muted-foreground" /> : <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />}
                      </button>
                      <AnimatePresence>
                        {showNextSteps && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-1 pl-5">
                              {briefing.next_steps.map((s, i) => (
                                <div key={i} className="flex items-start gap-2 py-1">
                                  <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                  <span className="text-xs text-foreground/80">{s}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Internal Notes */}
                  {briefing.internal_notes && (
                    <div className="bg-secondary/30 border border-border/30 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Notas internas da IA</span>
                      </div>
                      <p className="text-xs text-foreground/70 leading-relaxed">{briefing.internal_notes}</p>
                    </div>
                  )}

                  <EditableField label="Texto de Introdução da Proposta" value={introText} onChange={setIntroText} multiline />

                  <Separator />

                  {/* Consultant Notes */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <Pencil className="h-3 w-3" /> Observações do Consultor
                    </label>
                    <Textarea
                      value={consultantNotes}
                      onChange={e => setConsultantNotes(e.target.value)}
                      placeholder="Adicione observações, ajustes ou detalhes que a IA não capturou..."
                      className="text-xs min-h-[60px]"
                    />
                  </div>
                </motion.div>
              )}

              {step === "creating" && (
                <motion.div
                  key="creating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-16 gap-3"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Abrindo proposta pré-preenchida...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        {step === "review" && briefing && (
          <div className="px-6 py-4 border-t border-border/50 bg-secondary/20 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Análise contextual por IA — revise antes de criar
            </p>
            <Button onClick={handleCreateProposal} className="gap-2 h-9">
              <ArrowRight className="h-4 w-4" />
              Criar Proposta
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
