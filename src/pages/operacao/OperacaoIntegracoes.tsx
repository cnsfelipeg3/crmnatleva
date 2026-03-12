import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link2, Zap, MessageSquare, Brain, Globe, Plug } from "lucide-react";

const integrations = [
  { name: "WhatsApp Cloud API", icon: MessageSquare, status: "inactive", desc: "Conecte seu número oficial do WhatsApp" },
  { name: "Z-API", icon: Zap, status: "inactive", desc: "WhatsApp via Z-API (não oficial)" },
  { name: "ChatGuru", icon: Globe, status: "connected", desc: "Importação de histórico de conversas" },
  { name: "OpenAI / GPT", icon: Brain, status: "inactive", desc: "Agentes de IA com modelos GPT" },
  { name: "Webhooks", icon: Link2, status: "inactive", desc: "Integrações via webhook customizado" },
];

export default function OperacaoIntegracoes() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Plug className="w-6 h-6 text-primary" />
          Integrações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as integrações do módulo de operação diária</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map(int => (
          <Card key={int.name} className="border-border">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <int.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground">{int.name}</h3>
                  <Badge variant={int.status === "connected" ? "default" : "secondary"} className="text-[10px]">
                    {int.status === "connected" ? "Conectado" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{int.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
