import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2, Zap, MessageSquare, Brain, Globe, Plug, QrCode, X, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Integration {
  id: string;
  name: string;
  icon: any;
  status: "inactive" | "connected";
  desc: string;
  configurable?: boolean;
}

const integrations: Integration[] = [
  { id: "whatsapp-cloud", name: "WhatsApp Cloud API", icon: MessageSquare, status: "inactive", desc: "Conecte seu número oficial do WhatsApp", configurable: true },
  { id: "whatsapp-qrcode", name: "WhatsApp QRCode", icon: QrCode, status: "inactive", desc: "WhatsApp via leitura de QR Code", configurable: true },
  { id: "chatguru", name: "ChatGuru", icon: Globe, status: "connected", desc: "Importação de histórico de conversas" },
  { id: "openai", name: "OpenAI / GPT", icon: Brain, status: "inactive", desc: "Agentes de IA com modelos GPT", configurable: true },
  { id: "webhooks", name: "Webhooks", icon: Link2, status: "inactive", desc: "Integrações via webhook customizado", configurable: true },
];

export default function OperacaoIntegracoes() {
  const [selected, setSelected] = useState<Integration | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const getFields = (id: string) => {
    switch (id) {
      case "whatsapp-qrcode":
        return [
          { key: "instance_id", label: "Instance ID", placeholder: "Ex: 3FA85F64..." },
          { key: "token", label: "Token", placeholder: "Ex: eyJhbGciOiJI...", secret: true },
          { key: "api_url", label: "API URL", placeholder: "https://api.z-api.io/instances/..." },
        ];
      case "whatsapp-cloud":
        return [
          { key: "phone_number_id", label: "Phone Number ID", placeholder: "Ex: 123456789012345" },
          { key: "access_token", label: "Access Token", placeholder: "EAAxxxxxxx...", secret: true },
          { key: "waba_id", label: "WABA ID", placeholder: "Ex: 987654321098765" },
          { key: "verify_token", label: "Verify Token", placeholder: "Token para webhook" },
        ];
      case "openai":
        return [
          { key: "api_key", label: "API Key", placeholder: "sk-...", secret: true },
          { key: "model", label: "Modelo padrão", placeholder: "gpt-4o-mini" },
        ];
      case "webhooks":
        return [
          { key: "webhook_url", label: "Webhook URL", placeholder: "https://..." },
          { key: "secret", label: "Secret (opcional)", placeholder: "whsec_...", secret: true },
        ];
      default:
        return [];
    }
  };

  const handleOpen = (int: Integration) => {
    if (!int.configurable) return;
    setSelected(int);
    setCredentials({});
    setShowSecrets({});
  };

  const handleSave = () => {
    const fields = getFields(selected?.id || "");
    const required = fields.filter(f => !f.key.includes("opcional") && !f.key.includes("model"));
    const missing = required.filter(f => !credentials[f.key]?.trim());
    
    if (missing.length > 0) {
      toast({ title: "Preencha os campos obrigatórios", description: missing.map(f => f.label).join(", "), variant: "destructive" });
      return;
    }

    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Credenciais salvas", description: `${selected?.name} configurado com sucesso.` });
      setSelected(null);
    }, 800);
  };

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
          <Card
            key={int.id}
            className={`border-border transition-colors ${int.configurable ? "cursor-pointer hover:bg-accent/50" : ""}`}
            onClick={() => handleOpen(int)}
          >
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

      {/* Credential Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && <selected.icon className="w-5 h-5 text-primary" />}
              {selected?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{selected?.desc}</p>

            {getFields(selected?.id || "").map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{field.label}</Label>
                <div className="relative">
                  <Input
                    type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={credentials[field.key] || ""}
                    onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="pr-10"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }));
                      }}
                    >
                      {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? "Salvando..." : "Salvar Credenciais"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
