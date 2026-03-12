import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, HelpCircle, Send, Loader2, X, Check, Copy, RotateCcw, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

interface Message {
  text: string;
  sender_type: "cliente" | "atendente" | "sistema";
  message_type?: string;
}

interface AISuggestionPanelProps {
  open: boolean;
  onClose: () => void;
  onUseSuggestion: (text: string) => void;
  conversationHistory: Message[];
  contactName: string;
  stage: string;
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livechat-ai-suggest`;

export function AISuggestionPanel({ open, onClose, onUseSuggestion, conversationHistory, contactName, stage }: AISuggestionPanelProps) {
  const [mode, setMode] = useState<"choose" | "reply" | "question" | "select">("choose");
  const [customQuestion, setCustomQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedMsgIndices, setSelectedMsgIndices] = useState<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const streamAI = useCallback(async (selectedMode: "reply" | "question", question?: string, selectedMessages?: Message[]) => {
    setIsStreaming(true);
    setAiResponse("");
    setSuggestions([]);

    const controller = new AbortController();
    abortRef.current = controller;

    let fullText = "";
    const historyToSend = selectedMessages || conversationHistory.slice(-15);

    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mode: selectedMode,
          conversationHistory: historyToSend.map(m => ({ text: m.text, sender_type: m.sender_type })),
          customQuestion: question,
          contactName,
          stage,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        if (resp.status === 429) toast({ title: "⏳ Limite de requisições", variant: "destructive" });
        else if (resp.status === 402) toast({ title: "💳 Créditos insuficientes", variant: "destructive" });
        else toast({ title: "Erro na IA", variant: "destructive" });
        setIsStreaming(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiResponse(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Parse suggestions separated by ---
      if (selectedMode === "reply" && fullText.includes("---")) {
        const parts = fullText.split("---").map(s => s.trim()).filter(Boolean);
        const cleaned = parts.map(part => {
          const lines = part.split("\n");
          const bodyLines = lines.filter(line => {
            const trimmed = line.trim();
            if (/^op[çc][ãa]o\s*\d+/i.test(trimmed)) return false;
            if (/^aqui\s+(est[ãa]o|vão)/i.test(trimmed)) return false;
            return true;
          });
          return bodyLines.join("\n").trim();
        }).filter(Boolean);
        setSuggestions(cleaned.length > 0 ? cleaned : [fullText.trim()]);
      } else {
        setSuggestions([fullText.trim()]);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("AI stream error:", err);
        toast({ title: "Erro de conexão", variant: "destructive" });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [conversationHistory, contactName, stage]);

  const handleSelectMode = (m: "reply" | "question" | "select") => {
    setMode(m);
    if (m === "reply") {
      streamAI("reply");
    } else if (m === "select") {
      setSelectedMsgIndices(new Set());
    }
  };

  const handleAskQuestion = () => {
    if (!customQuestion.trim()) return;
    streamAI("question", customQuestion.trim());
  };

  const toggleMsgSelection = (index: number) => {
    setSelectedMsgIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleGenerateFromSelected = () => {
    if (selectedMsgIndices.size === 0) return;
    const selected = Array.from(selectedMsgIndices)
      .sort((a, b) => a - b)
      .map(i => conversationHistory[i]);
    setMode("reply");
    streamAI("reply", undefined, selected);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMode("choose");
    setAiResponse("");
    setSuggestions([]);
    setCustomQuestion("");
    setSelectedMsgIndices(new Set());
    setIsStreaming(false);
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    handleReset();
    onClose();
  };

  if (!open) return null;

  // Only text messages for selection
  const selectableMessages = conversationHistory.map((m, i) => ({ ...m, originalIndex: i }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="border-t border-primary/20 bg-primary/5 px-4 py-3 max-h-[50vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Assistente IA</span>
        </div>
        <div className="flex items-center gap-1">
          {mode !== "choose" && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1" onClick={handleReset}>
              <RotateCcw className="h-2.5 w-2.5" /> Voltar
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Mode selector */}
      {mode === "choose" && (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleSelectMode("reply")}
            className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all text-left"
          >
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold">Responder</p>
              <p className="text-[10px] text-muted-foreground">Última mensagem</p>
            </div>
          </button>
          <button
            onClick={() => handleSelectMode("select")}
            className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all text-left"
          >
            <CheckSquare className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold">Selecionar</p>
              <p className="text-[10px] text-muted-foreground">Escolher mensagens</p>
            </div>
          </button>
          <button
            onClick={() => handleSelectMode("question")}
            className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all text-left"
          >
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold">Perguntar</p>
              <p className="text-[10px] text-muted-foreground">Dúvidas à IA</p>
            </div>
          </button>
        </div>
      )}

      {/* Select messages mode */}
      {mode === "select" && !aiResponse && !isStreaming && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">Selecione as mensagens que deseja usar como contexto:</p>
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1">
              {selectableMessages.slice(-20).map((msg, i) => {
                const isSelected = selectedMsgIndices.has(msg.originalIndex);
                const isAudio = msg.message_type === "audio";
                const displayText = isAudio ? "🎤 Áudio" : (msg.text || "📎 Mídia");
                return (
                  <button
                    key={i}
                    onClick={() => toggleMsgSelection(msg.originalIndex)}
                    className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-card border border-border hover:bg-secondary/50"
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-muted-foreground mb-0.5">
                        {msg.sender_type === "cliente" ? contactName : "Atendente"}
                      </p>
                      <p className="text-[11px] text-foreground truncate">{displayText}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <Button
            size="sm"
            className="w-full h-8 text-xs gap-1.5"
            onClick={handleGenerateFromSelected}
            disabled={selectedMsgIndices.size === 0}
          >
            <Sparkles className="h-3 w-3" />
            Gerar resposta ({selectedMsgIndices.size} selecionada{selectedMsgIndices.size !== 1 ? "s" : ""})
          </Button>
        </div>
      )}

      {/* Question mode input */}
      {mode === "question" && !aiResponse && !isStreaming && (
        <div className="flex items-end gap-2">
          <Textarea
            value={customQuestion}
            onChange={e => setCustomQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskQuestion(); } }}
            placeholder="Ex: Como negociar desconto sem perder margem?"
            className="min-h-[40px] max-h-[80px] resize-none text-xs"
            rows={1}
            autoFocus
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleAskQuestion} disabled={!customQuestion.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Loading */}
      {isStreaming && !aiResponse && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Gerando sugestão...</span>
        </div>
      )}

      {/* Streaming / Results */}
      {aiResponse && (
        <div className="space-y-2 mt-1">
          {suggestions.length > 1 ? (
            suggestions.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground font-bold mb-1">Opção {i + 1}</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{s}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => { navigator.clipboard.writeText(s); toast({ title: "Copiado!" }); }}
                  >
                    <Copy className="h-2.5 w-2.5" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => { onUseSuggestion(s); handleClose(); }}
                  >
                    <Check className="h-2.5 w-2.5" /> Usar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
              {!isStreaming && (
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => { navigator.clipboard.writeText(aiResponse); toast({ title: "Copiado!" }); }}
                  >
                    <Copy className="h-2.5 w-2.5" /> Copiar
                  </Button>
                  {mode === "reply" && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => { onUseSuggestion(aiResponse); handleClose(); }}
                    >
                      <Check className="h-2.5 w-2.5" /> Usar
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
