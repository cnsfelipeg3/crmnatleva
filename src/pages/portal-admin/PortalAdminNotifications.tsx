import { Card } from "@/components/ui/card";
import { Bell, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export default function PortalAdminNotifications() {
  const [message, setMessage] = useState("");

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificações do Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie notificações e atualizações para os viajantes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Nova Notificação</h3>
              <p className="text-xs text-muted-foreground">Enviar para todos os viajantes ativos</p>
            </div>
          </div>
          <Textarea
            placeholder="Digite a mensagem da notificação..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <Button
            className="w-full"
            onClick={() => {
              toast.success("Notificação enviada com sucesso!");
              setMessage("");
            }}
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar Notificação
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Notificações Automáticas</h3>
              <p className="text-xs text-muted-foreground">Gatilhos configurados</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: "Check-in disponível", desc: "48h antes do voo", active: true },
              { label: "Documentos pendentes", desc: "Passaporte vencendo", active: true },
              { label: "Viagem publicada", desc: "Ao publicar no portal", active: true },
              { label: "Pagamento confirmado", desc: "Ao confirmar recebimento", active: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <div className={`h-2 w-2 rounded-full ${item.active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
