import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Sparkles, Plane, Hotel, DollarSign, User, CloudSun, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { supabase } from "@/integrations/supabase/client";
import { getMockTripDetail } from "@/lib/portalMockTrips";

const ASSISTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-assistant`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PortalAssistantProps {
  saleId?: string | null;
}

const quickActions = [
  { icon: Plane, label: "Meus voos", question: "Quais são os detalhes dos meus voos? Mostre horários, companhias e trechos." },
  { icon: Hotel, label: "Meu hotel", question: "Qual é o meu hotel? Mostre nome, endereço, check-in, check-out e tipo de quarto." },
  { icon: DollarSign, label: "Pagamentos", question: "Como está a situação financeira da minha viagem? Mostre parcelas e próximo vencimento." },
  { icon: CloudSun, label: "Clima no destino", question: "Como está o clima no meu destino de viagem? Dê dicas de o que vestir." },
  { icon: MapPin, label: "Roteiro", question: "Qual é o roteiro completo da minha viagem? Mostre dia a dia." },
  { icon: User, label: "Meu consultor", question: "Quem é meu consultor da NatLeva e como posso entrar em contato?" },
];

function pickBestTrip(trips: any[]): any | null {
  if (!trips.length) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const score = (trip: any) => {
    const sale = trip?.sale || {};
    const dep = sale.departure_date ? new Date(`${sale.departure_date}T00:00:00`) : null;
    const ret = sale.return_date ? new Date(`${sale.return_date}T00:00:00`) : null;

    if (dep && dep > today) return { rank: 0, ts: dep.getTime() }; // próxima viagem
    if (dep && ret && dep <= today && ret >= today) return { rank: 1, ts: dep.getTime() }; // viagem ativa
    return { rank: 2, ts: -(ret?.getTime() || dep?.getTime() || 0) }; // mais recente finalizada
  };

  return [...trips].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa.rank !== sb.rank) return sa.rank - sb.rank;
    return sa.ts - sb.ts;
  })[0] || null;
}

export default function PortalAssistant({ saleId }: PortalAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [inferredSaleId, setInferredSaleId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const effectiveSaleId = saleId || inferredSaleId || null;
  const currentMockTrip = useMemo(() => {
    if (!effectiveSaleId || !effectiveSaleId.startsWith("mock-")) return null;
    return getMockTripDetail(effectiveSaleId) || null;
  }, [effectiveSaleId]);

  useEffect(() => {
    if (saleId) {
      setInferredSaleId(null);
      return;
    }

    let cancelled = false;
    const inferTripContext = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("portal-api", { body: { action: "trips" } });
        if (cancelled || error) return;
        const trips = (data?.trips || []) as any[];
        const best = pickBestTrip(trips);
        setInferredSaleId(best?.sale_id || null);
      } catch {
        if (!cancelled) setInferredSaleId(null);
      }
    };

    void inferTripContext();
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Auto-focus input
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sua sessão expirou. Faça login novamente para continuar.");
      }

      const resp = await fetch(ASSISTANT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: text.trim(),
          sale_id: effectiveSaleId,
          conversation_history: newMessages.slice(-12),
          mock_trip: currentMockTrip
            ? {
                sale_id: currentMockTrip.sale_id,
                custom_title: currentMockTrip.custom_title,
                sale: currentMockTrip.sale,
                segments: currentMockTrip.segments,
                hotels: currentMockTrip.hotels,
                lodging: currentMockTrip.lodging,
                services: currentMockTrip.services,
                attachments: currentMockTrip.attachments,
                financial: currentMockTrip.financial,
                passengers: currentMockTrip.passengers,
                sellerName: currentMockTrip.sellerName,
              }
            : null,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const errMsg = errData.error || "Desculpe, não consegui processar sua pergunta no momento. Tente novamente em instantes.";
        setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
        setIsStreaming(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullText };
                return updated;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: err?.message || "Ocorreu um erro de conexão. Por favor, tente novamente.",
        }]);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, effectiveSaleId, currentMockTrip]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setIsStreaming(false);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow group"
          >
            <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-100px)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-accent/5 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                  <img src={logoNatleva} alt="NatLeva" className="h-5 dark:brightness-[1.8]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Concierge NatLeva</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Assistente de Viagem
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={clearChat} title="Limpar conversa">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-5">
                  {/* Welcome */}
                  <div className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                      <p className="text-sm text-foreground leading-relaxed font-medium">
                        Olá! Sou seu Concierge NatLeva ✨
                      </p>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        Tenho acesso completo ao seu itinerário — voos, hotéis, roteiro, pagamentos e documentos. Pergunte qualquer coisa sobre sua viagem!
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions Grid */}
                  <div className="pl-10">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2.5">Perguntas rápidas</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(action.question)}
                          className="flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-accent/5 hover:border-accent/30 transition-all group"
                        >
                          <action.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                          <span className="text-[11px] font-medium text-foreground leading-tight">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:my-1 [&>ol]:my-1 [&_strong]:text-foreground [&_strong]:font-bold [&>hr]:my-2 [&>hr]:border-border/40 leading-relaxed">
                        {msg.content ? <ReactMarkdown>{msg.content}</ReactMarkdown> : (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Consultando seu itinerário...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Consultando seu itinerário...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 shrink-0 bg-card">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre sua viagem..."
                  rows={1}
                  className="flex-1 resize-none bg-muted rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 max-h-[80px] min-h-[40px]"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl shrink-0"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground text-center mt-2 opacity-60">
                Concierge NatLeva • Respostas baseadas no seu itinerário
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
