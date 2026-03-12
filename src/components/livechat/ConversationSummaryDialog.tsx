import { useState, useRef, useCallback } from "react";
import { Brain, Loader2, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  text: string;
  sender_type: "cliente" | "atendente" | "sistema";
  message_type?: string;
}

interface ConversationSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  conversationHistory: Message[];
  contactName: string;
  stage: string;
}

const SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livechat-ai-suggest`;

export function ConversationSummaryDialog({ open, onClose, conversationHistory, contactName, stage }: ConversationSummaryDialogProps) {
  const [summary, setSummary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generateSummary = useCallback(async () => {
    setIsStreaming(true);
    setSummary("");
    setHasGenerated(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let fullText = "";

    try {
      const resp = await fetch(SUMMARY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mode: "question",
          conversationHistory,
          contactName,
          stage,
          customQuestion: `Analise TODA a conversa acima e me entregue um resumo executivo completo. Estruture assim:

## 📋 Panorama Geral
Resuma o que aconteceu na conversa do início ao fim. Quem é o cliente, o que ele quer, como a conversa evoluiu.

## ✅ Boas Práticas Identificadas
Liste o que o atendente fez bem (agilidade, cordialidade, técnica de venda, follow-up, etc).

## ⚠️ Falhas e Pontos de Melhoria
Liste erros, oportunidades perdidas, demora na resposta, falta de follow-up, tom inadequado, informações que deixou de pedir, etc.

## 🎯 Próximos Passos Sugeridos
O que deveria ser feito agora para avançar essa negociação.

## 📊 Score do Atendimento
Dê uma nota de 0 a 10 para o atendimento, justificando brevemente.

Seja direto, específico e construtivo. Use dados reais da conversa.`,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast({ title: "Limite de requisições", description: "Tente novamente em instantes.", variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "Créditos insuficientes", description: "Adicione créditos ao workspace.", variant: "destructive" });
        } else {
          toast({ title: "Erro ao gerar resumo", variant: "destructive" });
        }
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setSummary(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast({ title: "Erro ao gerar resumo", variant: "destructive" });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [conversationHistory, contactName, stage]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Resumo copiado!" });
  };

  const handleClose = () => {
    if (abortRef.current) abortRef.current.abort();
    setSummary("");
    setHasGenerated(false);
    setIsStreaming(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Resumo Inteligente da Conversa
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Análise completa com IA: panorama, boas práticas, falhas e score do atendimento
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!hasGenerated ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-base font-semibold">Analisar conversa com {contactName}</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  A IA vai ler toda a conversa ({conversationHistory.length} mensagens) e gerar um resumo executivo com análise de qualidade do atendimento.
                </p>
              </div>
              <Button onClick={generateSummary} className="gap-2 mt-2">
                <Brain className="h-4 w-4" />
                Gerar Resumo com IA
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[50vh] px-6 py-4">
              {isStreaming && !summary && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando conversa...
                </div>
              )}
              {summary && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {hasGenerated && summary && !isStreaming && (
          <div className="border-t border-border px-6 py-3 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={generateSummary} className="gap-1.5 text-xs">
              <Brain className="h-3.5 w-3.5" />
              Gerar novamente
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar resumo"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
