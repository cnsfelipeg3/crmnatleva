import { useState, useEffect, useCallback } from "react";
import {
  Plane, MapPin, Calendar, Users, Heart, Hotel, CreditCard,
  Loader2, RefreshCw, Sparkles, Pencil, Check, X, ChevronDown,
  ChevronUp, AlertCircle, RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export interface QuoteData {
  origin?: string | null;
  destination?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  adults?: number | null;
  children?: number | null;
  babies?: number | null;
  trip_type?: string | null;
  hotel_preference?: string | null;
  flight_preference?: string | null;
  other_preferences?: string | null;
  budget?: string | null;
  quote_status?: string | null;
  confidence?: string | null;
  summary?: string | null;
}

interface QuoteSummaryCardProps {
  conversationDbId: string;
}

const STATUS_LABELS: Record<string, string> = {
  sondagem_inicial: "Sondagem inicial",
  levantando_informacoes: "Levantando informações",
  cotacao_em_andamento: "Cotação em andamento",
  proposta_enviada: "Proposta enviada",
  aguardando_resposta: "Aguardando resposta",
  ajustando_opcoes: "Ajustando opções",
  quase_fechando: "Quase fechando",
};

const CONFIDENCE_MAP: Record<string, { label: string; className: string }> = {
  high: { label: "Alta confiança", className: "bg-emerald-500/10 text-emerald-600" },
  medium: { label: "Média confiança", className: "bg-amber-500/10 text-amber-600" },
  low: { label: "Baixa confiança", className: "bg-orange-500/10 text-orange-600" },
  none: { label: "Sem dados", className: "bg-muted text-muted-foreground" },
};

const TRIP_EMOJIS: Record<string, string> = {
  lazer: "🏖️", "lua de mel": "💍", família: "👨‍👩‍👧‍👦", corporativa: "💼",
  religioso: "⛪", luxo: "✨", econômico: "💰", grupo: "👥",
  intercâmbio: "🎓", cruzeiro: "🚢", "apenas aéreo": "✈️", "pacote completo": "📦",
};

function FieldRow({ icon: Icon, label, value, editable, editValue, onEdit, onSave, onCancel, editing }: {
  icon: any; label: string; value: string | null | undefined;
  editable?: boolean; editValue?: string; onEdit?: () => void; onSave?: (v: string) => void; onCancel?: () => void; editing?: boolean;
}) {
  const [localVal, setLocalVal] = useState(editValue || value || "");

  useEffect(() => { setLocalVal(editValue || value || ""); }, [editValue, value]);

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
        <Input
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          className="h-6 text-[11px] px-1.5 flex-1"
          autoFocus
          onKeyDown={e => {
            if (e.key === "Enter") onSave?.(localVal);
            if (e.key === "Escape") onCancel?.();
          }}
        />
        <button onClick={() => onSave?.(localVal)} className="text-emerald-500 hover:text-emerald-600"><Check className="h-3 w-3" /></button>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 py-1 group">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <p className={`text-[11px] leading-tight ${value ? 'text-foreground font-medium' : 'text-muted-foreground/50 italic'}`}>
          {value || "Não identificado"}
        </p>
      </div>
      {editable && value && (
        <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

export function QuoteSummaryCard({ conversationDbId }: QuoteSummaryCardProps) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});

  const extractQuote = useCallback(async (forceRebuild = false) => {
    if (!conversationDbId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal-briefing", {
        body: { conversationId: conversationDbId, forceRebuild },
      });
      if (error) throw error;

      const briefing = data?.briefing;
      if (briefing && briefing.confidence !== "none") {
        const activeCycle = briefing.detected_trip_cycles?.find((cycle: any) => cycle.is_current_demand);
        const mappedQuote: QuoteData = {
          origin: briefing.origin,
          destination: briefing.destination || activeCycle?.destination || null,
          departure_date: briefing.departure_date,
          return_date: briefing.return_date,
          adults: briefing.adults,
          children: briefing.children,
          babies: briefing.babies,
          trip_type: briefing.trip_type,
          hotel_preference: briefing.hotel_preference,
          flight_preference: briefing.flight_preference,
          other_preferences: briefing.other_preferences,
          budget: briefing.budget,
          quote_status: activeCycle ? "cotacao_em_andamento" : null,
          confidence: briefing.confidence,
          summary: briefing.briefing_summary,
        };
        setQuote(mappedQuote);
        setManualOverrides(prev => ({ ...prev }));
        if (forceRebuild) {
          toast({ title: "Contexto reanalisado", description: `Demanda ativa recalculada: ${mappedQuote.destination || "não identificada"}` });
        }
      } else {
        setQuote(null);
      }
    } catch (err: any) {
      console.error("Quote extraction error:", err);
      toast({ title: "Erro ao extrair cotação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [conversationDbId]);

  useEffect(() => {
    if (conversationDbId && !loaded) {
      extractQuote(false);
    }
  }, [conversationDbId, loaded, extractQuote]);

  const getVal = (field: string): string | null | undefined => {
    if (manualOverrides[field] !== undefined) return manualOverrides[field];
    return (quote as any)?.[field];
  };

  const handleSaveField = (field: string, value: string) => {
    setManualOverrides(prev => ({ ...prev, [field]: value }));
    setEditingField(null);
  };

  const confidence = CONFIDENCE_MAP[quote?.confidence || "none"] || CONFIDENCE_MAP.none;
  const hasData = quote && quote.confidence !== "none";
  const paxParts: string[] = [];
  const adults = getVal("adults");
  const children = getVal("children");
  const babies = getVal("babies");
  if (adults) paxParts.push(`${adults} adulto${Number(adults) > 1 ? "s" : ""}`);
  if (children && Number(children) > 0) paxParts.push(`${children} criança${Number(children) > 1 ? "s" : ""}`);
  if (babies && Number(babies) > 0) paxParts.push(`${babies} bebê${Number(babies) > 1 ? "s" : ""}`);
  const paxStr = paxParts.length > 0 ? paxParts.join(" + ") : null;

  const tripType = getVal("trip_type");
  const tripEmoji = tripType ? TRIP_EMOJIS[tripType.toLowerCase()] || "🌍" : null;
  const statusLabel = STATUS_LABELS[getVal("quote_status") || ""] || null;

  return (
    <div className="border-b border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Cotação em Andamento</span>
          {hasData && (
            <Badge className={`text-[8px] px-1.5 py-0 h-3.5 ${confidence.className}`}>
              {confidence.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              {!loaded && loading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Analisando conversa com IA...</span>
                </div>
              ) : !hasData ? (
                <div className="flex flex-col items-center py-4 gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground/40" />
                  <p className="text-[11px] text-muted-foreground text-center">
                    Nenhuma cotação identificada nesta conversa.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 gap-1" onClick={() => extractQuote(false)} disabled={loading}>
                      <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                      Tentar novamente
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1" onClick={() => extractQuote(true)} disabled={loading}>
                      <RotateCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                      Reanalisar contexto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {quote?.summary && (
                    <p className="text-[11px] text-foreground/80 italic mb-2 leading-relaxed bg-primary/5 rounded-md px-2.5 py-1.5 border border-primary/10">
                      "{quote.summary}"
                    </p>
                  )}

                  {statusLabel && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-[11px] font-semibold text-primary">{statusLabel}</span>
                    </div>
                  )}

                  <FieldRow icon={MapPin} label="Origem" value={getVal("origin")} editable
                    editing={editingField === "origin"} onEdit={() => setEditingField("origin")}
                    onSave={v => handleSaveField("origin", v)} onCancel={() => setEditingField(null)} />
                  <FieldRow icon={Plane} label="Destino" value={getVal("destination")} editable
                    editing={editingField === "destination"} onEdit={() => setEditingField("destination")}
                    onSave={v => handleSaveField("destination", v)} onCancel={() => setEditingField(null)} />

                  <FieldRow icon={Calendar} label="Ida" value={getVal("departure_date")} editable
                    editing={editingField === "departure_date"} onEdit={() => setEditingField("departure_date")}
                    onSave={v => handleSaveField("departure_date", v)} onCancel={() => setEditingField(null)} />
                  <FieldRow icon={Calendar} label="Volta / Duração" value={getVal("return_date")} editable
                    editing={editingField === "return_date"} onEdit={() => setEditingField("return_date")}
                    onSave={v => handleSaveField("return_date", v)} onCancel={() => setEditingField(null)} />

                  <FieldRow icon={Users} label="Passageiros" value={paxStr} />

                  {tripType && (
                    <div className="flex items-start gap-1.5 py-1">
                      <Heart className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-muted-foreground">Tipo</span>
                        <p className="text-[11px] text-foreground font-medium">
                          {tripEmoji} {tripType}
                        </p>
                      </div>
                    </div>
                  )}

                  <FieldRow icon={CreditCard} label="Orçamento" value={getVal("budget")} editable
                    editing={editingField === "budget"} onEdit={() => setEditingField("budget")}
                    onSave={v => handleSaveField("budget", v)} onCancel={() => setEditingField(null)} />

                  {getVal("hotel_preference") && (
                    <FieldRow icon={Hotel} label="Hotel" value={getVal("hotel_preference")} />
                  )}

                  {getVal("flight_preference") && (
                    <FieldRow icon={Plane} label="Preferência de voo" value={getVal("flight_preference")} />
                  )}

                  {getVal("other_preferences") && (
                    <div className="mt-1.5 bg-secondary/20 rounded-md px-2.5 py-1.5">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Outras preferências</span>
                      <p className="text-[11px] text-foreground mt-0.5 leading-relaxed">{getVal("other_preferences")}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
                    <span className="text-[9px] text-muted-foreground/50 italic flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Cotação baseada na demanda ativa atual
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-[10px] h-5 gap-1 px-1.5" onClick={() => extractQuote(false)} disabled={loading}>
                        <RefreshCw className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`} />
                        Atualizar
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-5 gap-1 px-1.5" onClick={() => extractQuote(true)} disabled={loading}>
                        <RotateCcw className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`} />
                        Rebuild
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

