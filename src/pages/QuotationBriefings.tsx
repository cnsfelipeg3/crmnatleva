import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, ChevronDown, MapPin, Users, CalendarDays, Plane, Hotel,
  Star, Brain, MessageCircle, AlertTriangle, CheckCircle2, Clock,
  RotateCcw, Send, Eye, Sparkles, DollarSign, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ReturnToAIDialog from "@/components/briefing/ReturnToAIDialog";
import BriefingSection from "@/components/briefing/BriefingSection";
import EditableField from "@/components/briefing/EditableField";

interface QuotationBriefing {
  id: string;
  conversation_id: string | null;
  client_id: string | null;
  status: string;
  urgency: string;
  lead_name: string;
  lead_phone: string | null;
  lead_origin: string | null;
  lead_score: number | null;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  duration_days: number | null;
  flexible_dates: boolean;
  trip_motivation: string | null;
  total_people: number | null;
  adults: number | null;
  children: number | null;
  children_ages: string[] | null;
  group_details: string | null;
  hotel_preference: string | null;
  hotel_stars: string | null;
  hotel_needs: string[] | null;
  hotel_location: string | null;
  hotel_notes: string | null;
  departure_airport: string | null;
  flight_preference: string | null;
  cabin_class: string | null;
  preferred_airline: string | null;
  rental_car: boolean;
  transfer_needed: boolean;
  transport_notes: string | null;
  must_have_experiences: string[] | null;
  desired_experiences: string[] | null;
  travel_pace: string | null;
  experience_notes: string | null;
  budget_range: string | null;
  budget_behavioral_reading: string | null;
  price_sensitivity: string | null;
  lead_type: string | null;
  lead_sentiment: string | null;
  lead_urgency: string | null;
  travel_experience: string | null;
  behavioral_notes: string | null;
  conversation_summary: string | null;
  ai_recommendation: string | null;
  next_steps: string | null;
  return_to_ai_reason: string | null;
  returned_at: string | null;
  updated_fields: string[] | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  em_cotacao: { label: "Em Cotação", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Eye },
  devolvido_ia: { label: "Devolvido p/ IA", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: RotateCcw },
  cotacao_enviada: { label: "Cotação Enviada", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: Send },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "text-emerald-400" },
  media: { label: "Média", color: "text-amber-400" },
  alta: { label: "Alta", color: "text-red-400" },
};

export default function QuotationBriefings() {
  const [briefings, setBriefings] = useState<QuotationBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [returnDialogId, setReturnDialogId] = useState<string | null>(null);
  const [showFictional, setShowFictional] = useState(false);

  const fetchBriefings = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("quotation_briefings")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setBriefings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBriefings();
    // Realtime subscription
    const channel = supabase
      .channel("briefings-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotation_briefings" }, () => {
        fetchBriefings();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotation_briefings" }, () => {
        fetchBriefings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateField = async (id: string, field: string, value: any) => {
    const { error } = await (supabase as any)
      .from("quotation_briefings")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setBriefings(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await updateField(id, "status", status);
    toast({ title: "Status atualizado", description: STATUS_CONFIG[status]?.label });
  };

  const filtered = briefings.filter((b: any) => {
    if (!showFictional && b.is_fictional) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        b.lead_name?.toLowerCase().includes(s) ||
        b.destination?.toLowerCase().includes(s) ||
        b.conversation_summary?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const pendingCount = filtered.filter(b => b.status === "pendente").length;
  const fictionalCount = briefings.filter((b: any) => b.is_fictional).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" /> Briefings de Cotação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Demandas qualificadas pela IA, prontas para cotação humana
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-sm px-3 py-1 animate-pulse">
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            variant={showFictional ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFictional(v => !v)}
            className="text-xs"
          >
            {showFictional ? "Ocultar fictícias" : `Mostrar fictícias${fictionalCount ? ` (${fictionalCount})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por lead ou destino..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="em_cotacao">Em Cotação</SelectItem>
            <SelectItem value="devolvido_ia">Devolvido p/ IA</SelectItem>
            <SelectItem value="cotacao_enviada">Enviados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum briefing encontrado.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Os briefings são gerados automaticamente quando o ATLAS conclui a qualificação de um lead.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((b) => {
              const st = STATUS_CONFIG[b.status] || STATUS_CONFIG.pendente;
              const urg = URGENCY_CONFIG[b.urgency] || URGENCY_CONFIG.media;
              const isExpanded = expandedId === b.id;

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Card className={cn("overflow-hidden transition-shadow", isExpanded && "ring-1 ring-accent/30 shadow-lg shadow-accent/5")}>
                    {/* Header row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                    >
                      {/* Urgency dot */}
                      <div className={cn("w-2 h-2 rounded-full shrink-0", b.urgency === "alta" ? "bg-red-400 animate-pulse" : b.urgency === "media" ? "bg-amber-400" : "bg-emerald-400")} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{b.lead_name}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium text-accent">{b.destination || "Destino indefinido"}</span>
                          <Badge variant="outline" className={cn("text-[10px] border", st.color)}>{st.label}</Badge>
                          {(b as any).is_fictional && (
                            <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-500">
                              FICTÍCIA
                            </Badge>
                          )}
                          {b.updated_fields && b.updated_fields.length > 0 && (
                            <Badge variant="outline" className="text-[10px] border-purple-500/20 text-purple-400">Atualizado</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {b.total_people && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {b.total_people} pax
                            </span>
                          )}
                          {b.departure_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" /> {b.departure_date}
                            </span>
                          )}
                          {b.lead_score != null && b.lead_score > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400" /> {b.lead_score}
                            </span>
                          )}
                          <span>{format(new Date(b.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border"
                        >
                          <div className="p-4 space-y-4 bg-muted/5">
                            {/* Trip section */}
                            <BriefingSection icon={MapPin} title="Viagem">
                              <EditableField label="Destino" value={b.destination} onSave={(v) => updateField(b.id, "destination", v)} />
                              <EditableField label="Ida" value={b.departure_date} onSave={(v) => updateField(b.id, "departure_date", v)} />
                              <EditableField label="Volta" value={b.return_date} onSave={(v) => updateField(b.id, "return_date", v)} />
                              <EditableField label="Duração" value={b.duration_days ? `${b.duration_days} dias` : null} onSave={(v) => updateField(b.id, "duration_days", parseInt(v) || null)} />
                              <EditableField label="Motivação" value={b.trip_motivation} onSave={(v) => updateField(b.id, "trip_motivation", v)} />
                            </BriefingSection>

                            {/* Group section */}
                            <BriefingSection icon={Users} title="Grupo">
                              <EditableField label="Total" value={b.total_people ? `${b.total_people} pessoas` : null} onSave={(v) => updateField(b.id, "total_people", parseInt(v) || 1)} />
                              <EditableField label="Adultos" value={String(b.adults || 0)} onSave={(v) => updateField(b.id, "adults", parseInt(v) || 0)} />
                              <EditableField label="Crianças" value={String(b.children || 0)} onSave={(v) => updateField(b.id, "children", parseInt(v) || 0)} />
                              {b.children_ages && b.children_ages.length > 0 && (
                                <EditableField label="Idades" value={b.children_ages.join(", ")} onSave={(v) => updateField(b.id, "children_ages", v.split(",").map(s => s.trim()))} />
                              )}
                              <EditableField label="Detalhes" value={b.group_details} onSave={(v) => updateField(b.id, "group_details", v)} />
                            </BriefingSection>

                            {/* Hotel section */}
                            <BriefingSection icon={Hotel} title="Hospedagem">
                              <EditableField label="Preferência" value={b.hotel_preference} onSave={(v) => updateField(b.id, "hotel_preference", v)} />
                              <EditableField label="Estrelas" value={b.hotel_stars} onSave={(v) => updateField(b.id, "hotel_stars", v)} />
                              <EditableField label="Localização" value={b.hotel_location} onSave={(v) => updateField(b.id, "hotel_location", v)} />
                              {b.hotel_needs && b.hotel_needs.length > 0 && (
                                <EditableField label="Necessidades" value={b.hotel_needs.join(", ")} onSave={(v) => updateField(b.id, "hotel_needs", v.split(",").map(s => s.trim()))} />
                              )}
                              <EditableField label="Observações" value={b.hotel_notes} onSave={(v) => updateField(b.id, "hotel_notes", v)} />
                            </BriefingSection>

                            {/* Transport section */}
                            <BriefingSection icon={Plane} title="Transporte">
                              <EditableField label="Aeroporto" value={b.departure_airport} onSave={(v) => updateField(b.id, "departure_airport", v)} />
                              <EditableField label="Voo" value={b.flight_preference} onSave={(v) => updateField(b.id, "flight_preference", v)} />
                              <EditableField label="Classe" value={b.cabin_class} onSave={(v) => updateField(b.id, "cabin_class", v)} />
                              <EditableField label="Cia aérea" value={b.preferred_airline} onSave={(v) => updateField(b.id, "preferred_airline", v)} />
                              <EditableField label="Carro alugado" value={b.rental_car ? "Sim" : "Não"} onSave={(v) => updateField(b.id, "rental_car", v.toLowerCase() === "sim")} />
                              <EditableField label="Transfer" value={b.transfer_needed ? "Sim" : "Não"} onSave={(v) => updateField(b.id, "transfer_needed", v.toLowerCase() === "sim")} />
                              <EditableField label="Observações" value={b.transport_notes} onSave={(v) => updateField(b.id, "transport_notes", v)} />
                            </BriefingSection>

                            {/* Experiences */}
                            <BriefingSection icon={Star} title="Experiências">
                              {b.must_have_experiences && b.must_have_experiences.length > 0 && (
                                <EditableField label="Obrigatórias" value={b.must_have_experiences.join(", ")} onSave={(v) => updateField(b.id, "must_have_experiences", v.split(",").map(s => s.trim()))} />
                              )}
                              {b.desired_experiences && b.desired_experiences.length > 0 && (
                                <EditableField label="Desejadas" value={b.desired_experiences.join(", ")} onSave={(v) => updateField(b.id, "desired_experiences", v.split(",").map(s => s.trim()))} />
                              )}
                              <EditableField label="Ritmo" value={b.travel_pace} onSave={(v) => updateField(b.id, "travel_pace", v)} />
                              <EditableField label="Observações" value={b.experience_notes} onSave={(v) => updateField(b.id, "experience_notes", v)} />
                            </BriefingSection>

                            {/* Budget */}
                            <BriefingSection icon={DollarSign} title="Orçamento">
                              <EditableField label="Faixa" value={b.budget_range} onSave={(v) => updateField(b.id, "budget_range", v)} />
                              <EditableField label="Leitura comportamental" value={b.budget_behavioral_reading} onSave={(v) => updateField(b.id, "budget_behavioral_reading", v)} />
                              <EditableField label="Sensibilidade" value={b.price_sensitivity} onSave={(v) => updateField(b.id, "price_sensitivity", v)} />
                            </BriefingSection>

                            {/* Lead profile */}
                            <BriefingSection icon={Heart} title="Perfil do Lead">
                              <EditableField label="Tipo" value={b.lead_type} onSave={(v) => updateField(b.id, "lead_type", v)} />
                              <EditableField label="Sentimento" value={b.lead_sentiment} onSave={(v) => updateField(b.id, "lead_sentiment", v)} />
                              <EditableField label="Urgência" value={b.lead_urgency} onSave={(v) => updateField(b.id, "lead_urgency", v)} />
                              <EditableField label="Experiência" value={b.travel_experience} onSave={(v) => updateField(b.id, "travel_experience", v)} />
                              <EditableField label="Observações" value={b.behavioral_notes} onSave={(v) => updateField(b.id, "behavioral_notes", v)} />
                            </BriefingSection>

                            {/* AI Summaries */}
                            {b.conversation_summary && (
                              <BriefingSection icon={MessageCircle} title="Resumo da Conversa">
                                <p className="text-sm text-foreground/80 leading-relaxed">{b.conversation_summary}</p>
                              </BriefingSection>
                            )}

                            {b.ai_recommendation && (
                              <BriefingSection icon={Brain} title="Recomendação IA">
                                <p className="text-sm text-accent leading-relaxed">{b.ai_recommendation}</p>
                              </BriefingSection>
                            )}

                            {/* Return-to-AI info */}
                            {b.return_to_ai_reason && (
                              <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                <p className="text-xs text-purple-400 font-medium mb-1">Devolvido para IA:</p>
                                <p className="text-sm text-foreground/80">{b.return_to_ai_reason}</p>
                                {b.returned_at && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    em {format(new Date(b.returned_at), "dd/MM/yyyy HH:mm")}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                              {b.status === "pendente" && (
                                <Button size="sm" onClick={() => updateStatus(b.id, "em_cotacao")} className="gap-1.5 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
                                  <Eye className="w-3.5 h-3.5" /> Iniciar Cotação
                                </Button>
                              )}
                              {(b.status === "pendente" || b.status === "em_cotacao") && (
                                <Button size="sm" variant="outline" onClick={() => setReturnDialogId(b.id)} className="gap-1.5 text-xs text-purple-400 border-purple-500/20 hover:bg-purple-500/10">
                                  <RotateCcw className="w-3.5 h-3.5" /> Devolver p/ IA
                                </Button>
                              )}
                              {b.status === "em_cotacao" && (
                                <Button size="sm" onClick={() => updateStatus(b.id, "cotacao_enviada")} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                  <Send className="w-3.5 h-3.5" /> Cotação Enviada
                                </Button>
                              )}
                              {b.conversation_id && (
                                <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground">
                                  <MessageCircle className="w-3.5 h-3.5" /> Ver Conversa
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Return to AI Dialog */}
      <ReturnToAIDialog
        open={!!returnDialogId}
        onClose={() => setReturnDialogId(null)}
        onSubmit={async (reason) => {
          if (!returnDialogId) return;
          const { error } = await (supabase as any)
            .from("quotation_briefings")
            .update({
              status: "devolvido_ia",
              return_to_ai_reason: reason,
              returned_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", returnDialogId);
          if (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
          } else {
            toast({ title: "Devolvido para IA", description: "O ATLAS vai retomar a conversa com o lead." });
            fetchBriefings();
          }
          setReturnDialogId(null);
        }}
      />
    </div>
  );
}
