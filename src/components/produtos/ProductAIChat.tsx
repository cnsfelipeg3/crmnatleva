import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Mic, Square, Send, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant"; content: string };

interface Props {
  /** Rascunho atual já normalizado para o JSON do produto. */
  current: Record<string, any>;
  /** Recebe campos parciais retornados pela IA. */
  onApply: (product: Record<string, any>, coverSuggestions: string[]) => void;
}

export default function ProductAIChat({ current, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("product-from-chat", {
        body: { messages: next, current },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const assistant: string = data?.assistant ?? "Atualizei o rascunho.";
      setMessages((m) => [...m, { role: "assistant", content: assistant }]);
      if (data?.product && Object.keys(data.product).length) {
        onApply(data.product, data.cover_suggestions || []);
      }
    } catch (e: any) {
      toast.error("Falha na IA", { description: e?.message || "Tente novamente" });
    } finally {
      setBusy(false);
    }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribe(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast.error("Microfone indisponível", { description: e?.message });
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], "audio.webm", { type: "audio/webm" }));
      fd.append("type", "audio");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-media`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Falha na transcrição");
      const text = (j?.transcription || "").trim();
      if (!text) {
        toast.error("Não consegui entender o áudio");
        return;
      }
      await send(text);
    } catch (e: any) {
      toast.error("Falha ao transcrever", { description: e?.message });
    } finally {
      setTranscribing(false);
    }
  };

  if (!open) {
    return (
      <Card
        className="p-5 border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              Cadastrar com IA <Sparkles className="w-3.5 h-3.5 text-primary" />
            </h2>
            <p className="text-xs text-muted-foreground">
              Escreva ou grave um áudio descrevendo o produto · a IA interpreta destino, datas, preços, pagamento e busca fotos reais.
            </p>
          </div>
          <Button size="sm" variant="default">Abrir chat</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 border-primary/30 bg-primary/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/10">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="w-4 h-4 text-primary" /> Cadastrar com IA
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Fechar</Button>
      </div>

      <div ref={scrollRef} className="max-h-[340px] overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">
            Descreva o pacote em uma frase ou grave um áudio. Ex: "Cria um pacote pro Iberostar Selection Cancun, 7 noites, saindo de GRU em 12 de outubro voltando dia 19, R$ 6.890 por pessoa, entrada 30% no PIX e saldo em 10x no boleto."
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-background border border-border rounded-bl-md text-foreground",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {(busy || transcribing) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {transcribing ? "Transcrevendo áudio..." : "Pensando..."}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-primary/15 bg-background/60">
        {!recording ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={startRec}
            disabled={busy || transcribing}
            title="Gravar áudio"
          >
            <Mic className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={stopRec}
            title="Parar gravação"
          >
            <Square className="w-4 h-4" />
          </Button>
        )}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={recording ? "Gravando... fale o que quiser" : "Descreva o produto em texto..."}
          disabled={busy || recording || transcribing}
          className="flex-1"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => send(input)}
          disabled={busy || !input.trim() || recording || transcribing}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
