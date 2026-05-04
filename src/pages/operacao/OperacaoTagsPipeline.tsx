import { useState, useEffect, useMemo } from "react";
import { formatPhoneDisplay } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, User } from "lucide-react";
import { cn } from "@/lib/utils";

const stages = [
  { key: "novo_lead", label: "Novo Lead", color: "border-blue-500" },
  { key: "qualificacao", label: "Qualificação", color: "border-amber-500" },
  { key: "proposta_preparacao", label: "Proposta", color: "border-purple-500" },
  { key: "proposta_enviada", label: "Proposta Enviada", color: "border-indigo-500" },
  { key: "negociacao", label: "Negociação", color: "border-orange-500" },
  { key: "fechado", label: "Fechado", color: "border-emerald-500" },
  { key: "pos_venda", label: "Pós-Venda", color: "border-teal-500" },
  { key: "perdido", label: "Perdido", color: "border-red-500" },
];

export default function OperacaoTagsPipeline() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, contact_name, display_name, phone, funnel_stage, tags, last_message_at")
        .order("last_message_at", { ascending: false })
        .limit(1000);
      setConversations(data || []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    stages.forEach(s => { map[s.key] = []; });
    conversations.forEach(c => {
      const stage = c.funnel_stage || "novo_lead";
      if (map[stage]) map[stage].push(c);
      else map["novo_lead"].push(c);
    });
    return map;
  }, [conversations]);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Carregando pipeline...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tag className="w-6 h-6 text-primary" />
          Tags & Pipeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Visualize o funil de atendimentos em formato Kanban</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div key={stage.key} className={cn("min-w-[260px] max-w-[300px] shrink-0 rounded-xl border-t-4 bg-card border-border", stage.color)}>
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                <Badge variant="secondary" className="text-[10px]">{grouped[stage.key]?.length || 0}</Badge>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="p-2 space-y-2">
                {(grouped[stage.key] || []).slice(0, 50).map((conv: any) => (
                  <Card key={conv.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{conv.contact_name || conv.display_name || formatPhoneDisplay(conv.phone) || "Sem nome"}</p>
                          {conv.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {conv.tags.slice(0, 3).map((t: string) => (
                                <span key={t} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );
}
