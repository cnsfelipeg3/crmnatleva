import { useState, useRef, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FlaskConical, Play, RotateCcw, X, Send, Loader2,
  Tag, Workflow, Bot, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimMessage {
  from: "bot" | "user" | "system";
  text: string;
}

interface AIResponse {
  suggestion?: string;
  intent?: string;
  destination?: string;
  urgency?: string;
  tags?: string[];
  funnel_stage?: string;
  reasoning?: string;
  error?: string;
}

export function FlowSimulator({
  nodes,
  edges,
  onHighlightNode,
  onClose,
}: {
  nodes: Node[];
  edges: Edge[];
  onHighlightNode: (nodeIds: string[], activeId: string | null) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [funnelStage, setFunnelStage] = useState("novo_lead");
  const [detectedIntent, setDetectedIntent] = useState<string | null>(null);
  const [detectedDestination, setDetectedDestination] = useState<string | null>(null);
  const [urgency, setUrgency] = useState("normal");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const FUNNEL_LABELS: Record<string, string> = {
    novo_lead: "Novo Lead",
    recepcao: "Recepção & Conexão",
    qualificacao: "Qualificação",
    aguardando_info: "Aguardando Info",
    orcamento_preparacao: "Orçamento em Preparação",
    proposta_enviada: "Proposta Enviada",
    negociacao: "Negociação",
    fechado: "Fechado",
    pos_venda: "Pós-venda",
    perdido: "Perdido",
  };

  const buildClientContext = () => ({
    name: "Cliente Simulado",
    score: 65,
    cluster: "potencial",
    level: "silver",
    totalSpent: 0,
    tripCount: 0,
    avgTicket: 0,
    avgMargin: "0",
    lastPurchase: "N/A",
    favoriteDestination: detectedDestination || "N/A",
    profile: "Simulação",
    pendencies: "Nenhuma",
  });

  const callAI = async (allMessages: SimMessage[]): Promise<AIResponse> => {
    const chatMessages = allMessages
      .filter((m) => m.from !== "system")
      .map((m) => ({
        role: m.from === "user" ? "user" as const : "assistant" as const,
        content: m.text,
      }));

    const { data, error } = await supabase.functions.invoke("livechat-ai", {
      body: {
        messages: chatMessages,
        clientContext: buildClientContext(),
      },
    });

    if (error) throw error;
    return data as AIResponse;
  };

  const startSimulation = async () => {
    setIsRunning(true);
    setIsLoading(true);

    const welcomeMsg: SimMessage = {
      from: "system",
      text: "🧪 Simulação iniciada. Você é o cliente — escreva como se estivesse no WhatsApp.",
    };
    setMessages([welcomeMsg]);

    // Simulate the first contact from "client"
    const firstContact: SimMessage = {
      from: "user",
      text: "Olá, boa tarde!",
    };
    setMessages([welcomeMsg, firstContact]);

    try {
      const aiResponse = await callAI([firstContact]);
      
      const botMsg: SimMessage = {
        from: "bot",
        text: aiResponse.suggestion || "Olá! Como posso ajudar?",
      };
      setMessages([welcomeMsg, firstContact, botMsg]);

      if (aiResponse.tags?.length) setTags(prev => [...new Set([...prev, ...aiResponse.tags!])]);
      if (aiResponse.funnel_stage) setFunnelStage(aiResponse.funnel_stage);
      if (aiResponse.intent) setDetectedIntent(aiResponse.intent);
      if (aiResponse.destination) setDetectedDestination(aiResponse.destination);
      if (aiResponse.urgency) setUrgency(aiResponse.urgency);

      // Highlight trigger node
      const trigger = nodes.find((n) => (n.data as any)?.nodeType === "trigger");
      if (trigger) onHighlightNode([trigger.id], trigger.id);
    } catch (e) {
      console.error("AI error:", e);
      toast.error("Erro ao chamar IA. Verifique a configuração.");
      setMessages(prev => [...prev, { from: "system", text: "❌ Erro ao conectar com a IA." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMsg: SimMessage = { from: "user", text: userInput };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setUserInput("");
    setIsLoading(true);

    try {
      const aiResponse = await callAI(updatedMessages);

      const botMsg: SimMessage = {
        from: "bot",
        text: aiResponse.suggestion || "Entendi, vou verificar isso para você.",
      };
      setMessages(prev => [...prev, botMsg]);

      // Update state from AI analysis
      if (aiResponse.tags?.length) setTags(prev => [...new Set([...prev, ...aiResponse.tags!])]);
      if (aiResponse.funnel_stage) setFunnelStage(aiResponse.funnel_stage);
      if (aiResponse.intent) setDetectedIntent(aiResponse.intent);
      if (aiResponse.destination) setDetectedDestination(aiResponse.destination);
      if (aiResponse.urgency) setUrgency(aiResponse.urgency);

      // Show reasoning as system message
      if (aiResponse.reasoning) {
        setMessages(prev => [...prev, { from: "system", text: `💡 Análise: ${aiResponse.reasoning}` }]);
      }

      // Highlight relevant nodes based on funnel stage
      highlightNodesForStage(aiResponse.funnel_stage || funnelStage);
    } catch (e: any) {
      console.error("AI error:", e);
      const errorText = e?.message?.includes("429")
        ? "⚠️ Rate limit atingido. Aguarde alguns segundos."
        : e?.message?.includes("402")
        ? "⚠️ Créditos insuficientes."
        : "❌ Erro ao processar resposta da IA.";
      setMessages(prev => [...prev, { from: "system", text: errorText }]);
    } finally {
      setIsLoading(false);
    }
  };

  const highlightNodesForStage = (stage: string) => {
    const stageNodes = nodes.filter((n) => {
      const config = (n.data as any)?.config;
      return config?.funnel_stage === stage;
    });
    const ids = stageNodes.map((n) => n.id);
    if (ids.length > 0) onHighlightNode(ids, ids[0]);
  };

  const resetSimulation = () => {
    setMessages([]);
    setIsRunning(false);
    setTags([]);
    setFunnelStage("novo_lead");
    setDetectedIntent(null);
    setDetectedDestination(null);
    setUrgency("normal");
    setIsLoading(false);
    onHighlightNode([], null);
  };

  const urgencyColor: Record<string, string> = {
    normal: "bg-muted text-muted-foreground",
    media: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    alta: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    critica: "bg-destructive/20 text-destructive",
  };

  return (
    <Card className="w-[400px] shadow-2xl border-border/50 backdrop-blur-sm bg-card/95 flex flex-col h-full max-h-[85vh]">
      <CardHeader className="p-3 pb-2 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            🧪 Simulação com IA Real
          </CardTitle>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetSimulation}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {!isRunning ? (
            <div className="space-y-3 py-6">
              <Bot className="w-10 h-10 mx-auto text-primary/60" />
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Converse com a IA NatLeva como se fosse um cliente real no WhatsApp.
                <br />A IA irá responder, classificar intenções, aplicar tags e mover o funil.
              </p>
              <p className="text-[10px] text-muted-foreground/60 text-center">
                Nenhum dado real será afetado.
              </p>
              <Button className="w-full" onClick={startSimulation}>
                <Play className="w-4 h-4 mr-2" /> Iniciar Conversa com IA
              </Button>
            </div>
          ) : (
            <>
              {/* Status panels */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Workflow className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">Etapa Funil</span>
                  </div>
                  <Badge variant="default" className="text-[10px]">
                    {FUNNEL_LABELS[funnelStage] || funnelStage}
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">⚡ Urgência</span>
                  </div>
                  <Badge className={cn("text-[10px]", urgencyColor[urgency] || urgencyColor.normal)}>
                    {urgency}
                  </Badge>
                </div>
              </div>

              {/* Detected info */}
              <div className="grid grid-cols-2 gap-2">
                {detectedIntent && (
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground block mb-1">🎯 Intenção</span>
                    <span className="text-[10px] font-medium">{detectedIntent}</span>
                  </div>
                )}
                {detectedDestination && (
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground block mb-1">✈️ Destino</span>
                    <span className="text-[10px] font-medium">{detectedDestination}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3 h-3 text-purple-500" />
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">Tags aplicadas</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px] h-5">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Chat */}
              <div className="space-y-2">
                <span className="text-[9px] font-semibold uppercase text-muted-foreground">💬 Conversa simulada (IA real)</span>
                <div className="space-y-1.5 min-h-[120px] max-h-[280px] overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i} className={cn(
                      "flex",
                      m.from === "user" ? "justify-end" : m.from === "system" ? "justify-center" : "justify-start"
                    )}>
                      {m.from === "system" ? (
                        <div className="px-2 py-1 rounded-lg bg-muted/30 text-[10px] text-muted-foreground italic max-w-[90%] text-center">
                          {m.text}
                        </div>
                      ) : (
                        <div className={cn(
                          "px-2.5 py-1.5 rounded-xl text-[11px] max-w-[85%] leading-relaxed",
                          m.from === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted border border-border/30 rounded-bl-sm"
                        )}>
                          {m.from === "bot" && <Bot className="w-3 h-3 inline-block mr-1 opacity-60" />}
                          {m.text}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="px-3 py-2 rounded-xl bg-muted border border-border/30 rounded-bl-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="flex gap-1.5">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendUserMessage()}
                  placeholder="Digite como cliente..."
                  className="h-8 text-xs"
                  disabled={isLoading}
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendUserMessage} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {/* Reset */}
              <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={resetSimulation}>
                <RotateCcw className="w-3 h-3 mr-1" /> Resetar Simulação
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
