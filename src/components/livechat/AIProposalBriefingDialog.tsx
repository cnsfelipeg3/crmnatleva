import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane, MapPin, Calendar, Users, Heart, Hotel, CreditCard,
  Loader2, Sparkles, Check, AlertCircle, ArrowRight, Baby, User,
  Clock, Target, FileText, Route, ChevronDown, ChevronUp,
  Pencil, X, Shield, Zap, Star,
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

// Steps: 0=loading, 1=review, 2=creating
type Step = "loading" | "review" | "creating";

export function AIProposalBriefingDialog({ open, onOpenChange, conversationDbId, contactName }: AIProposalBriefingDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [briefing, setBriefing] = useState<ProposalBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showItinerary, setShowItinerary] = useState(true);
  const [showNextSteps, setShowNextSteps] = useState(true);
  const [consultantNotes, setConsultantNotes] = useState("");

  // Editable fields
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationDbId]);

  const extractBriefing = async () => {
    setStep("loading");
    setError(null);
    setBriefing(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-proposal-briefing", {
        body: { conversationId: conversationDbId },
      });
      if (fnErr) throw fnErr;

      if (data?.briefing && data.briefing.confidence !== "none") {
        const b = data.briefing as ProposalBriefing;
        setBriefing(b);
        // Pre-fill editable fields
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

  const handleCreateProposal = () => {
    setStep("creating");

    // Build query params for pre-filling the proposal editor
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

    // Build itinerary summary for notes
    const itinSummary = briefing?.itinerary_suggestion?.map(s => `${s.city}: ${s.nights} noites`).join(" → ") || "";
    if (itinSummary) params.set("itinerary", itinSummary);

    // Navigate to proposal editor with pre-filled data
    onOpenChange(false);
    navigate(`/propostas/nova?${params.toString()}`);
  };

  const confidence = CONFIDENCE_MAP[briefing?.confidence || "none"] || CONFIDENCE_MAP.none;
  const style = briefing?.trip_style ? STYLE_MAP[briefing.trip_style] : null;
  const urgency = briefing?.urgency_level ? URGENCY_MAP[briefing.urgency_level] : null;

  const paxParts: string[] = [];
  if (adults && parseInt(adults) > 0) paxParts.push(`${adults} adulto${parseInt(adults) > 1 ? "s" : ""}`);
  if (children && parseInt(children) > 0) paxParts.push(`${children} criança${parseInt(children) > 1 ? "s" : ""}`);
  if (babies && parseInt(babies) > 0) paxParts.push(`${babies} bebê${parseInt(babies) > 1 ? "s" : ""}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Criar Proposta com IA</h2>
              <p className="text-xs text-muted-foreground">
                {step === "loading" ? "Analisando conversa..." : step === "creating" ? "Criando proposta..." : "Revise o briefing antes de criar a proposta"}
              </p>
            </div>
            {briefing && (
              <Badge className={`ml-auto text-[10px] px-2 py-0.5 border ${confidence.className}`}>
                {confidence.label}
              </Badge>
            )}
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
                    <p className="text-sm font-medium text-foreground">Analisando conversa com IA</p>
                    <p className="text-xs text-muted-foreground">Extraindo briefing completo da viagem...</p>
                  </div>
                  <div className="flex gap-6 mt-4 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Identificando destinos</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Extraindo datas</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> Lendo preferências</span>
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
                  {/* Briefing Summary */}
                  {briefing.briefing_summary && (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground/80 italic leading-relaxed">"{briefing.briefing_summary}"</p>
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

                  {/* Editable Fields - Proposal Title */}
                  <EditableField label="Título da Proposta" value={proposalTitle} onChange={setProposalTitle} icon={FileText} />

                  {/* Route & Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Origem" value={origin} onChange={setOrigin} icon={MapPin} />
                    <EditableField label="Destino Principal" value={destination} onChange={setDestination} icon={Plane} />
                  </div>
                  <EditableField label="Subdestinos" value={subDests} onChange={setSubDests} icon={Route} />
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Ida" value={departureDate} onChange={setDepartureDate} icon={Calendar} />
                    <EditableField label="Volta / Duração" value={returnDate} onChange={setReturnDate} icon={Calendar} />
                  </div>

                  {/* Passengers */}
                  <div className="grid grid-cols-3 gap-3">
                    <EditableField label="Adultos" value={adults} onChange={setAdults} icon={User} />
                    <EditableField label="Crianças" value={children} onChange={setChildren} icon={Users} />
                    <EditableField label="Bebês" value={babies} onChange={setBabies} icon={Baby} />
                  </div>

                  {/* Trip Type & Budget */}
                  <div className="grid grid-cols-2 gap-4">
                    <EditableField label="Tipo de Viagem" value={tripType} onChange={setTripType} icon={Heart} />
                    <EditableField label="Orçamento" value={budget} onChange={setBudget} icon={CreditCard} />
                  </div>

                  <Separator />

                  {/* Preferences */}
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

                  {/* Intro Text */}
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
              <Sparkles className="h-2.5 w-2.5" /> Briefing gerado por IA — revise antes de criar
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
