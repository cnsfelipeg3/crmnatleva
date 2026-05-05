import { useState, useRef, useCallback, useEffect } from "react";
import { Brain, Loader2, Copy, Check, Mic, Image as ImageIcon, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface SummaryStats {
  total: number;
  texts: number;
  audios: number;
  images: number;
  documents: number;
  processed: number;
  cached: number;
  failed: number;
}

interface ConversationSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  contactName: string;
  stage: string;
}

const SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livechat-summary`;

export function ConversationSummaryDialog({ open, onClose, conversationId, contactName, stage }: ConversationSummaryDialogProps) {
  const [summary, setSummary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [phase, setPhase] = useState<"idle" | "processing_media" | "generating" | "done">("idle");
  const abortRef = useRef<AbortController | null>(null);

  const generateSummary = useCallback(async () => {
    if (!conversationId) {
      toast({ title: "Conversa não identificada", description: "Aguarde sincronizar e tente novamente.", variant: "destructive" });
      return;
    }
    setIsStreaming(true);
    setSummary("");
    setStats(null);
    setHasGenerated(true);
    setPhase("processing_media");

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
        body: JSON.stringify({ conversationId, contactName, stage, limit: 50 }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast({ title: "Limite de requisições", description: "Tente novamente em instantes.", variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "Créditos insuficientes", description: "Adicione créditos ao workspace.", variant: "destructive" });
        } else {
          const errBody = await resp.json().catch(() => ({}));
          toast({ title: "Erro ao gerar resumo", description: errBody?.message || `Status ${resp.status}`, variant: "destructive" });
        }
        setIsStreaming(false);
        setPhase("idle");
        return;
      }

      const statsHeader = resp.headers.get("X-Summary-Stats");
      if (statsHeader) {
        try { setStats(JSON.parse(statsHeader)); } catch { /* ignore */ }
      }

      setPhase("generating");

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
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              setSummary(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      setPhase("done");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "Erro ao gerar resumo", description: err.message, variant: "destructive" });
      }
      setPhase("idle");
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, contactName, stage]);

  useEffect(() => {
    if (open && conversationId && !hasGenerated) generateSummary();
  }, [open, conversationId, hasGenerated, generateSummary]);

  useEffect(() => {
    if (!open) {
      setHasGenerated(false);
      setSummary("");
      setStats(null);
      setPhase("idle");
      abortRef.current?.abort();
    }
  }, [open]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Resumo copiado!" });
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Resumo Inteligente · {contactName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Análise multimodal: texto, áudios, imagens e documentos
          </p>
        </DialogHeader>

        {stats && (
          <div className="px-6 pb-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> {stats.texts} textos
            </span>
            {stats.audios > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                <Mic className="h-3 w-3" /> {stats.audios} áudios{stats.cached > 0 ? ` (${stats.cached} em cache)` : ""}
              </span>
            )}
            {stats.images > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                <ImageIcon className="h-3 w-3" /> {stats.images} imagens
              </span>
            )}
            {stats.documents > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                <FileText className="h-3 w-3" /> {stats.documents} documentos
              </span>
            )}
            {stats.failed > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                ⚠ {stats.failed} falhas
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden border-t border-border/20">
          {isStreaming && phase === "processing_media" && !summary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 px-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando áudios, imagens e documentos...
            </div>
          )}
          {isStreaming && phase === "generating" && !summary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 px-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando análise...
            </div>
          )}
          <ScrollArea className="h-[50vh] px-6 py-4">
            {summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            ) : !isStreaming && hasGenerated ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem resumo disponível.</p>
            ) : null}
          </ScrollArea>
        </div>

        <div className="border-t border-border/20 px-6 py-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={generateSummary} disabled={isStreaming} className="gap-1.5 text-xs">
            {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {hasGenerated ? "Regenerar" : "Gerar resumo"}
          </Button>
          <div className="flex items-center gap-2">
            {summary && !isStreaming && (
              <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
