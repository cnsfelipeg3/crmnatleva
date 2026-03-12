import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Palette, Globe, Shield, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PortalAdminConfig() {
  const [autoPublish, setAutoPublish] = useState(false);
  const [showFinancial, setShowFinancial] = useState(true);
  const [showChecklist, setShowChecklist] = useState(true);
  const [showDocuments, setShowDocuments] = useState(true);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize a experiência do Portal do Viajante
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Visibilidade</h3>
              <p className="text-xs text-muted-foreground">O que os viajantes podem ver</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="financial" className="text-sm">Mostrar informações financeiras</Label>
              <Switch id="financial" checked={showFinancial} onCheckedChange={setShowFinancial} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="checklist" className="text-sm">Mostrar checklist de viagem</Label>
              <Switch id="checklist" checked={showChecklist} onCheckedChange={setShowChecklist} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="documents" className="text-sm">Mostrar documentos</Label>
              <Switch id="documents" checked={showDocuments} onCheckedChange={setShowDocuments} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autopublish" className="text-sm">Auto-publicar ao fechar venda</Label>
              <Switch id="autopublish" checked={autoPublish} onCheckedChange={setAutoPublish} />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Personalização</h3>
              <p className="text-xs text-muted-foreground">Aparência do portal</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">Mensagem de boas-vindas</Label>
              <Input defaultValue="Bem-vindo ao seu portal de viagens! 🌍" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">WhatsApp de suporte</Label>
              <Input defaultValue="+55 11 99999-9999" />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Configurações salvas!")}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
