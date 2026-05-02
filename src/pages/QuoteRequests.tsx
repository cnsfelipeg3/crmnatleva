import { useState, useEffect, useDeferredValue, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, MapPin, CalendarDays, Users, Search, Eye, CheckCircle2,
  Clock, XCircle, MessageCircle, ChevronDown, FileText, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createProposalFromQuote } from "@/lib/quoteToProposalBridge";

interface QuoteRequest {
  id: string;
  client_id: string | null;
  portal_user_id: string;
  status: string;
  origin_city: string | null;
  destination_city: string | null;
  trip_type: string | null;
  departure_date: string | null;
  return_date: string | null;
  flexible_dates: boolean;
  adults: number;
  children: number;
  infants: number;
  cabin_class: string | null;
  hotel_needed: boolean;
  transfer_needed: boolean;
  insurance_needed: boolean;
  budget_range: string | null;
  special_requests: string | null;
  traveler_names: string[] | null;
  hotel_preferences: string | null;
  proposal_id: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Novo", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  reviewing: { label: "Em análise", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Eye },
  quoted: { label: "Cotado", color: "bg-accent/10 text-accent border-accent/20", icon: CheckCircle2 },
  accepted: { label: "Aceito", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Recusado", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

const CABIN_LABELS: Record<string, string> = {
  economy: "Econômica",
  premium_economy: "Premium Economy",
  business: "Executiva",
  first: "Primeira Classe",
};

const BUDGET_LABELS: Record<string, string> = {
  ate_5k: "Até R$ 5.000",
  "5k_10k": "R$ 5.000 – 10.000",
  "10k_20k": "R$ 10.000 – 20.000",
  "20k_50k": "R$ 20.000 – 50.000",
  acima_50k: "Acima de R$ 50.000",
  aberto: "Orçamento aberto",
};

export default function QuoteRequests() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchQuotes = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("portal_quote_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setQuotes(data);
    setLoading(false);
  };

  useEffect(() => { fetchQuotes(); }, []);

  const handleGenerateProposal = async (q: QuoteRequest) => {
    setGenerating(q.id);
    try {
      const result = await createProposalFromQuote(q as any);
      if (result) {
        toast({ title: "Proposta criada!", description: "Redirecionando ao editor..." });
        fetchQuotes();
        setTimeout(() => navigate(`/propostas/${result.proposalId}`), 800);
      } else {
        toast({ title: "Erro ao criar proposta", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };
  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from("portal_quote_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado" });
      fetchQuotes();
    }
  };

  const filtered = quotes.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        q.destination_city?.toLowerCase().includes(s) ||
        q.origin_city?.toLowerCase().includes(s) ||
        q.special_requests?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plane className="w-6 h-6 text-accent" /> Solicitações de Cotação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pedidos recebidos do Portal do Viajante</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {quotes.filter((q) => q.status === "pending").length} novas
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por destino..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Novos</SelectItem>
            <SelectItem value="reviewing">Em análise</SelectItem>
            <SelectItem value="quoted">Cotados</SelectItem>
            <SelectItem value="accepted">Aceitos</SelectItem>
            <SelectItem value="rejected">Recusados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma solicitação encontrada.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const st = STATUS_MAP[q.status] || STATUS_MAP.pending;
            const isExpanded = expandedId === q.id;
            return (
              <Card key={q.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">
                        {q.origin_city || "—"} → {q.destination_city || "—"}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] border", st.color)}>
                        {st.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {q.departure_date
                          ? format(new Date(q.departure_date + "T12:00:00"), "dd MMM yyyy", { locale: ptBR })
                          : q.flexible_dates ? "Flexível" : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {q.adults + q.children + q.infants} pax
                      </span>
                      <span>{format(new Date(q.created_at), "dd/MM HH:mm")}</span>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <div className="p-4 space-y-4 bg-muted/10">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <Detail label="Tipo" value={q.trip_type === "roundtrip" ? "Ida e Volta" : q.trip_type === "oneway" ? "Somente Ida" : "Múltiplos"} />
                          <Detail label="Classe" value={CABIN_LABELS[q.cabin_class || "economy"]} />
                          <Detail label="Adultos" value={String(q.adults)} />
                          <Detail label="Crianças" value={String(q.children)} />
                          <Detail label="Bebês" value={String(q.infants)} />
                          {q.departure_date && <Detail label="Ida" value={format(new Date(q.departure_date + "T12:00:00"), "dd/MM/yyyy")} />}
                          {q.return_date && <Detail label="Volta" value={format(new Date(q.return_date + "T12:00:00"), "dd/MM/yyyy")} />}
                          {q.budget_range && <Detail label="Orçamento" value={BUDGET_LABELS[q.budget_range] || q.budget_range} />}
                          {q.hotel_needed && <Detail label="Hotel" value="Sim" />}
                          {q.transfer_needed && <Detail label="Transfer" value="Sim" />}
                          {q.insurance_needed && <Detail label="Seguro" value="Sim" />}
                        </div>

                        {q.hotel_preferences && (
                          <div>
                            <span className="text-xs text-muted-foreground">Pref. hospedagem:</span>
                            <p className="text-sm text-foreground">{q.hotel_preferences}</p>
                          </div>
                        )}

                        {q.traveler_names && (q.traveler_names as string[]).length > 0 && (
                          <div>
                            <span className="text-xs text-muted-foreground">Viajantes:</span>
                            <p className="text-sm text-foreground">{(q.traveler_names as string[]).join(", ")}</p>
                          </div>
                        )}

                        {q.special_requests && (
                          <div>
                            <span className="text-xs text-muted-foreground">Pedidos especiais:</span>
                            <p className="text-sm text-foreground">{q.special_requests}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                          {q.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(q.id, "reviewing")} className="gap-1 text-xs">
                              <Eye className="w-3 h-3" /> Iniciar análise
                            </Button>
                          )}

                          {/* Generate or view proposal */}
                          {q.proposal_id ? (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/propostas/${q.proposal_id}`)} className="gap-1 text-xs">
                              <FileText className="w-3 h-3" /> Ver Proposta
                            </Button>
                          ) : (
                            (q.status === "pending" || q.status === "reviewing" || q.status === "quoted") && (
                              <Button
                                size="sm"
                                onClick={() => handleGenerateProposal(q)}
                                disabled={generating === q.id}
                                className="gap-1 text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
                              >
                                {generating === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                Gerar Proposta
                              </Button>
                            )
                          )}

                          {q.status === "quoted" && (
                            <>
                              <Button size="sm" onClick={() => updateStatus(q.id, "accepted")} className="gap-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                                <CheckCircle2 className="w-3 h-3" /> Aceito
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(q.id, "rejected")} className="gap-1 text-xs text-destructive">
                                <XCircle className="w-3 h-3" /> Recusado
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
