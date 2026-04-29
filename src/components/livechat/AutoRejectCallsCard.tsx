import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function callZapiProxy(action: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke("zapi-proxy", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || "Erro Z-API");
  return data;
}

export function AutoRejectCallsCard() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("Olá! A gente está no chat · manda mensagem que respondemos rapidinho.");
  const [savingMsg, setSavingMsg] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  return (
    <Card className="p-4 space-y-3 glass-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <PhoneOff className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
          <div>
            <Label className="text-sm font-medium">Auto-rejeitar ligações</Label>
            <p className="text-xs text-muted-foreground">
              Quando alguém ligar, recebe mensagem automática
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          disabled={savingToggle}
          onCheckedChange={async (checked) => {
            setSavingToggle(true);
            try {
              await callZapiProxy("update-call-reject-auto", { enabled: checked });
              setEnabled(checked);
              toast.success(checked ? "Auto-rejeitar ativado" : "Auto-rejeitar desativado");
            } catch (e: any) {
              toast.error(e?.message || "Erro ao atualizar");
            } finally {
              setSavingToggle(false);
            }
          }}
        />
      </div>
      {enabled && (
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs">Mensagem de resposta automática</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            rows={2}
          />
          <Button
            size="sm"
            disabled={savingMsg}
            onClick={async () => {
              setSavingMsg(true);
              try {
                await callZapiProxy("update-call-reject-message", { message });
                toast.success("Mensagem atualizada");
              } catch (e: any) {
                toast.error(e?.message || "Erro ao salvar");
              } finally {
                setSavingMsg(false);
              }
            }}
          >
            Salvar mensagem
          </Button>
        </div>
      )}
    </Card>
  );
}
