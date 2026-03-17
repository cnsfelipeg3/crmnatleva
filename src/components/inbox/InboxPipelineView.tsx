import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Star, Clock, MessageSquare, Phone, Tag,
  ChevronRight, TrendingUp, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types (matching OperacaoInbox) ───
type Stage = "novo_lead" | "qualificacao" | "proposta_preparacao" | "proposta_enviada" | "negociacao" | "fechado" | "pos_venda" | "perdido";

interface PipelineConversation {
  id: string;
  db_id?: string;
  phone: string;
  contact_name: string;
  stage: Stage;
  tags: string[];
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  is_vip: boolean;
  assigned_to: string;
}

const PIPELINE_COLUMNS: { key: Stage; label: string; emoji: string; colorClass: string; bgClass: string }[] = [
  { key: "novo_lead", label: "Novo Lead", emoji: "🆕", colorClass: "border-t-blue-500", bgClass: "bg-blue-500/10" },
  { key: "qualificacao", label: "Qualificação", emoji: "🔍", colorClass: "border-t-amber-500", bgClass: "bg-amber-500/10" },
  { key: "proposta_preparacao", label: "Orçamento", emoji: "📋", colorClass: "border-t-orange-500", bgClass: "bg-orange-500/10" },
  { key: "proposta_enviada", label: "Proposta Enviada", emoji: "📩", colorClass: "border-t-purple-500", bgClass: "bg-purple-500/10" },
  { key: "negociacao", label: "Negociação", emoji: "🤝", colorClass: "border-t-primary", bgClass: "bg-primary/10" },
  { key: "fechado", label: "Fechado", emoji: "✅", colorClass: "border-t-emerald-500", bgClass: "bg-emerald-500/10" },
  { key: "pos_venda", label: "Pós-Venda", emoji: "🎯", colorClass: "border-t-teal-500", bgClass: "bg-teal-500/10" },
  { key: "perdido", label: "Perdido", emoji: "❌", colorClass: "border-t-destructive", bgClass: "bg-destructive/10" },
];

function timeSince(dateStr: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}sem`;
}

function formatPhoneShort(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("55") && clean.length >= 12) {
    const ddd = clean.slice(2, 4);
    const rest = clean.slice(4);
    return `(${ddd}) ${rest.slice(-4)}`;
  }
  return phone.slice(-8);
}

interface InboxPipelineViewProps {
  conversations: PipelineConversation[];
  onSelectConversation: (id: string) => void;
  onSwitchToChat: () => void;
}

export function InboxPipelineView({ conversations, onSelectConversation, onSwitchToChat }: InboxPipelineViewProps) {
  const [expandedColumn, setExpandedColumn] = useState<Stage | null>(null);

  const columns = useMemo(() => {
    return PIPELINE_COLUMNS.map((col) => {
      const leads = conversations.filter((c) => (c.stage || "novo_lead") === col.key);
      const unread = leads.reduce((sum, l) => sum + l.unread_count, 0);
      return { ...col, leads, count: leads.length, unread };
    });
  }, [conversations]);

  const totalLeads = conversations.length;
  const closedCount = columns.find((c) => c.key === "fechado")?.count || 0;
  const activeLeads = totalLeads - closedCount - (columns.find((c) => c.key === "perdido")?.count || 0);
  const conversionRate = totalLeads > 0 ? ((closedCount / totalLeads) * 100).toFixed(1) : "0";
  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with KPIs */}
      <div className="px-4 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-foreground">{totalLeads}</span>
              <span className="text-muted-foreground">total</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-bold text-foreground">{activeLeads}</span>
              <span className="text-muted-foreground">ativos</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-bold text-foreground">{conversionRate}%</span>
              <span className="text-muted-foreground">conversão</span>
            </div>
            {totalUnread > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/5">
                <span className="font-bold text-destructive">{totalUnread}</span>
                <span className="text-muted-foreground">não lidas</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <ScrollArea className="flex-1">
        <div className="flex gap-2.5 p-3 min-w-max">
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "flex flex-col w-[240px] shrink-0 rounded-xl border border-border/60 border-t-[3px] bg-card/30",
                col.colorClass
              )}
            >
              {/* Column header */}
              <div
                className={cn("px-3 py-2.5 flex items-center justify-between rounded-t-lg", col.bgClass)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{col.emoji}</span>
                  <span className="text-xs font-bold text-foreground">{col.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px] h-5 font-bold px-1.5">
                    {col.count}
                  </Badge>
                  {col.unread > 0 && (
                    <Badge className="text-[10px] h-5 font-bold px-1.5 bg-primary text-primary-foreground">
                      {col.unread}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] p-1.5 space-y-1.5">
                {col.leads.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-8 italic">
                    Nenhum atendimento
                  </p>
                )}
                {col.leads.map((lead) => {
                  const hasUnread = lead.unread_count > 0;
                  const contactName = lead.contact_name || "Sem nome";
                  const isPhone = /^\d{10,}$/.test(contactName);
                  const preview = (lead.last_message_preview || "").replace(/\n/g, " ").slice(0, 60);

                  return (
                    <Card
                      key={lead.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md hover:border-primary/30 group",
                        hasUnread && "ring-1 ring-primary/20 bg-primary/[0.02]"
                      )}
                      onClick={() => {
                        onSelectConversation(lead.id);
                        onSwitchToChat();
                      }}
                    >
                      <CardContent className="p-2.5">
                        {/* Row 1: Name + Time */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {lead.is_vip && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                            <span className={cn(
                              "text-xs truncate leading-tight",
                              hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                            )}>
                              {isPhone ? formatPhoneShort(contactName) : contactName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasUnread && (
                              <span className="h-4 min-w-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-primary-foreground px-1">
                                {lead.unread_count}
                              </span>
                            )}
                            <span className="text-[9px] text-muted-foreground tabular-nums">
                              {timeSince(lead.last_message_at)}
                            </span>
                          </div>
                        </div>

                        {/* Row 2: Preview */}
                        {preview && (
                          <p className={cn(
                            "text-[10px] line-clamp-2 leading-relaxed mb-1.5",
                            hasUnread ? "text-foreground/70" : "text-muted-foreground"
                          )}>
                            {preview}
                          </p>
                        )}

                        {/* Row 3: Tags */}
                        {lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {lead.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium"
                              >
                                {t}
                              </span>
                            ))}
                            {lead.tags.length > 3 && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                +{lead.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
