import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Users, Clock, TrendingUp, ArrowRight, Eye, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  { key: "novo_lead", label: "Novo Lead", emoji: "🆕", color: "hsl(210 80% 55%)" },
  { key: "qualificacao", label: "Qualificação", emoji: "🔍", color: "hsl(45 90% 50%)" },
  { key: "orcamento_preparacao", label: "Orçamento", emoji: "📋", color: "hsl(32 90% 55%)" },
  { key: "proposta_enviada", label: "Proposta", emoji: "📩", color: "hsl(280 60% 55%)" },
  { key: "negociacao", label: "Negociação", emoji: "🤝", color: "hsl(200 70% 50%)" },
  { key: "fechado", label: "Fechado", emoji: "✅", color: "hsl(142 70% 45%)" },
  { key: "perdido", label: "Perdido", emoji: "❌", color: "hsl(0 70% 50%)" },
];

interface ConversationLead {
  id: string;
  phone: string | null;
  funnel_stage: string | null;
  tags: string[];
  last_message_preview: string | null;
  last_message_at: string | null;
  assigned_to: string | null;
  client?: { display_name: string; city?: string | null } | null;
}

export function FlowCRMPipeline() {
  const [conversations, setConversations] = useState<ConversationLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, phone, funnel_stage, tags, last_message_preview, last_message_at, assigned_to, client_id, clients(display_name, city)")
      .order("last_message_at", { ascending: false })
      .limit(500);

    setConversations((data || []).map((c: any) => ({
      ...c,
      tags: c.tags || [],
      client: c.clients,
    })));
    setLoading(false);
  };

  const stageData = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => {
      const leads = conversations.filter((c) => (c.funnel_stage || "novo_lead") === stage.key);
      return { ...stage, leads, count: leads.length };
    });
  }, [conversations]);

  const totalLeads = conversations.length;
  const closedCount = stageData.find((s) => s.key === "fechado")?.count || 0;
  const conversionRate = totalLeads > 0 ? ((closedCount / totalLeads) * 100).toFixed(1) : "0";

  const timeSince = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Agora";
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <h2 className="font-bold text-lg">📊 Pipeline CRM</h2>
        <div className="flex-1" />
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold">{totalLeads}</span>
            <span className="text-muted-foreground">leads</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <span className="font-semibold">{conversionRate}%</span>
            <span className="text-muted-foreground">conversão</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={loadConversations}>
          <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} /> Atualizar
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex gap-3 p-4 min-w-[1200px]">
          {stageData.map((stage) => (
            <div key={stage.key} className="flex-1 min-w-[170px]">
              {/* Column header */}
              <div
                className="rounded-t-xl px-3 py-2 flex items-center justify-between"
                style={{ background: `${stage.color}15`, borderBottom: `2px solid ${stage.color}` }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{stage.emoji}</span>
                  <span className="text-xs font-bold">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5 font-bold">{stage.count}</Badge>
              </div>

              {/* Cards */}
              <div className="space-y-1.5 mt-2 max-h-[500px] overflow-y-auto">
                {stage.leads.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4 italic">Nenhum lead</p>
                )}
                {stage.leads.slice(0, 20).map((lead) => (
                  <Card
                    key={lead.id}
                    className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                    onClick={() => setSelectedStage(lead.id)}
                  >
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold truncate">
                          {lead.client?.display_name || lead.phone || "Desconhecido"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{timeSince(lead.last_message_at)}</span>
                      </div>
                      {lead.last_message_preview && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">
                          {lead.last_message_preview}
                        </p>
                      )}
                      {lead.tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {lead.tags.slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="text-[8px] h-4 px-1">{t}</Badge>
                          ))}
                          {lead.tags.length > 3 && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1">+{lead.tags.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
