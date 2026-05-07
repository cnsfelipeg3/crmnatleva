import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string | null;
  contactName?: string;
  messageCount?: number;
}

export function GenerateQuotationDialog({ open, onOpenChange, conversationId, contactName, messageCount }: Props) {
  const [mode, setMode] = useState<"manual_review" | "auto">("manual_review");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    if (!conversationId) {
      toast({ title: "Conversa inválida", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-quotation-from-chat", {
        body: { conversationId, mode },
      });
      if (error) throw new Error(error.message || "Falha ao chamar função");
      if ((data as any)?.error) throw new Error((data as any).error);

      const briefingId = (data as any)?.briefingId;
      toast({
        title: "Cotação criada",
        description: `${(data as any)?.messagesAnalyzed || 0} mensagens analisadas.`,
      });
      onOpenChange(false);
      if (briefingId) {
        navigate(`/cotacoes?highlight=${briefingId}`);
      }
    } catch (e: any) {
      console.error("[GenerateQuotation] error:", e);
      toast({
        title: "Erro ao gerar cotação",
        description: e?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Cotação a partir desta conversa
          </DialogTitle>
          <DialogDescription>
            A IA vai analisar a conversa{contactName ? ` com ${contactName}` : ""} e extrair um briefing estruturado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md bg-muted/40 border border-border">
            <MessageSquare className="h-4 w-4" />
            <span>
              <strong className="text-foreground">{messageCount ?? "Últimas 100"}</strong> mensagens serão analisadas.
            </span>
          </div>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="gap-3">
            <div className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="manual_review" id="m-review" className="mt-1" />
              <Label htmlFor="m-review" className="flex-1 cursor-pointer">
                <div className="font-medium">Revisão manual</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Extrai o briefing · sua equipe revisa antes de virar proposta
                </div>
              </Label>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="auto" id="m-auto" className="mt-1" />
              <Label htmlFor="m-auto" className="flex-1 cursor-pointer">
                <div className="font-medium">Automático</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Cria briefing pronto direto na fila de cotações
                </div>
              </Label>
            </div>
          </RadioGroup>

          {loading && (
            <div className="text-xs text-muted-foreground text-center">
              Analisando conversa · pode levar 15-30 segundos...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Confirmar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
