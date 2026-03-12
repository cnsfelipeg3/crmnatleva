import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Brain, Globe, Shield, ExternalLink, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WhatsAppQRCard } from "./WhatsAppQRCard";
import { WhatsAppCloudAPICard } from "./WhatsAppCloudAPICard";

const integrations = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini para blocos de IA no Flow Builder.",
    icon: Brain,
    color: "#10a37f",
    status: "desconectado" as const,
    fields: [{ key: "api_key", label: "API Key" }],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini 2.5 Pro/Flash para processamento de IA.",
    icon: Brain,
    color: "#4285F4",
    status: "desconectado" as const,
    fields: [{ key: "api_key", label: "API Key" }],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Claude para conversas e análise avançada.",
    icon: Brain,
    color: "#cc785c",
    status: "desconectado" as const,
    fields: [{ key: "api_key", label: "API Key" }],
  },
  {
    id: "n8n",
    name: "n8n Webhook",
    description: "Conecte webhooks n8n para automações externas.",
    icon: Globe,
    color: "#ea4b71",
    status: "desconectado" as const,
    fields: [
      { key: "webhook_url", label: "Webhook URL" },
      { key: "auth_header", label: "Auth Header (opcional)" },
    ],
  },
];

const futureIntegrations = [
  { name: "Serasa / Score de Crédito", icon: Shield, description: "Consulta de score para KYC" },
  { name: "WebMotors API", icon: ExternalLink, description: "Importação de leads e anúncios" },
  { name: "OLX API", icon: ExternalLink, description: "Importação de leads e anúncios" },
  { name: "CRM Externo", icon: Globe, description: "Sincronização com CRMs de mercado" },
];

export function LiveChatIntegrations() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-extrabold">Integrações</h2>
        <p className="text-xs text-muted-foreground">Configure conectores para WhatsApp, IA e serviços externos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WhatsAppQRCard />
        <WhatsAppCloudAPICard />
        {integrations.map(integ => (
          <Card key={integ.id} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: integ.color }} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${integ.color}20` }}>
                    <integ.icon className="h-4 w-4" style={{ color: integ.color }} />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{integ.name}</CardTitle>
                    <CardDescription className="text-[10px]">{integ.description}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] gap-1">
                  <XCircle className="h-2.5 w-2.5 text-muted-foreground" /> Desconectado
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {integ.fields.map(f => (
                <div key={f.key}>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                  <Input placeholder={`Inserir ${f.label}...`} className="h-8 text-xs mt-0.5" type={f.key.includes("token") || f.key.includes("key") || f.key.includes("secret") ? "password" : "text"} />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch disabled />
                  <span className="text-[10px] text-muted-foreground">Ativo</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs" disabled>
                      Testar conexão
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Preencha as credenciais para testar</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Future placeholders */}
      <div>
        <h3 className="text-sm font-bold text-muted-foreground mb-3">Em breve</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {futureIntegrations.map(fi => (
            <Card key={fi.name} className="opacity-50">
              <CardContent className="p-4 flex items-center gap-3">
                <fi.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-bold">{fi.name}</p>
                  <p className="text-[10px] text-muted-foreground">{fi.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
