import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Plus, Settings, Zap } from "lucide-react";

export default function OperacaoAgentesIA() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ai_integrations").select("*").order("created_at", { ascending: false });
      setIntegrations(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Agentes IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure agentes inteligentes para automação de atendimento</p>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Agente</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      ) : integrations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Bot className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum agente configurado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie seu primeiro agente de IA para automatizar o atendimento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map(agent => (
            <Card key={agent.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {agent.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{agent.provider} · {agent.model || "Padrão"}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                  <Settings className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
