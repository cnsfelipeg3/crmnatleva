import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Mic, Square, Send, Loader2, Wand2, ImagePlus, X, Link as LinkIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant"; content: string; images?: string[] };
type UrlPreview = {
  url: string;
  status: "loading" | "ready" | "error";
  title?: string;
  markdown?: string;
  images?: string[];
  error?: string;
};

interface Props {
  /** Rascunho atual já normalizado para o JSON do produto. */
  current: Record<string, any>;
  /** Recebe campos parciais retornados pela IA. */
  onApply: (product: Record<string, any>, coverSuggestions: string[]) => void;
}

const MAX_IMAGES = 20;
const MAX_IMAGE_MB = 8;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ProductAIChat({ current, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const slots = MAX_IMAGES - pendingImages.length;
    if (slots <= 0) {
      toast.error(`Limite de ${MAX_IMAGES} imagens atingido`);
      return;
    }
    const arr = Array.from(files).slice(0, slots);
    const urls: string[] = [];
    for (const f of arr) {
      if (!f.type.startsWith("image/")) {
        toast.warning(`${f.name} não é imagem`);
        continue;
      }
      if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
        toast.warning(`${f.name} acima de ${MAX_IMAGE_MB}MB`);
        continue;
      }
      try {
        urls.push(await fileToDataUrl(f));
      } catch {
        toast.warning(`Falha ao ler ${f.name}`);
      }
    }
    if (urls.length) setPendingImages((cur) => [...cur, ...urls]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePending = (idx: number) =>
    setPendingImages((cur) => cur.filter((_, i) => i !== idx));

  const send = async (text: string, imagesOverride?: string[]) => {
    const images = imagesOverride ?? pendingImages;
    const hasText = text.trim().length > 0;
    const hasImgs = images.length > 0;
    if ((!hasText && !hasImgs) || busy) return;

    // 1) Detecta URLs no texto e faz scraping antes de enviar pra IA.
    const urlRe = /\bhttps?:\/\/[^\s<>"')]+/gi;
    const foundUrls = Array.from(new Set(text.match(urlRe) || []));
    let enrichedText = text.trim();
    let scrapedImages: string[] = [];
    if (foundUrls.length) {
      setScrapingUrl(true);
      const t = toast.loading(`Lendo ${foundUrls.length === 1 ? "página" : `${foundUrls.length} páginas`}...`);
      try {
        for (const u of foundUrls.slice(0, 3)) {
          try {
            const { data, error } = await supabase.functions.invoke("scrape-url-for-product", { body: { url: u } });
            if (error || !data || data.error) continue;
            const md = (data.markdown || "").trim();
            const title = data.title || "";
            if (md) {
              enrichedText += `\n\n=== CONTEÚDO EXTRAÍDO DA PÁGINA ===\nURL: ${u}\nTítulo: ${title}\n\n${md}`;
            }
            if (Array.isArray(data.images)) scrapedImages.push(...data.images.slice(0, 12));
          } catch {/* segue */}
        }
        toast.dismiss(t);
      } catch {
        toast.dismiss(t);
      } finally {
        setScrapingUrl(false);
      }
      if (scrapedImages.length) {
        enrichedText += `\n\n=== IMAGENS CANDIDATAS DA PÁGINA (use as melhores como capa/galeria) ===\n${Array.from(new Set(scrapedImages)).join("\n")}`;
      }
    }

    const fallbackText = hasText
      ? text.trim()
      : `Anexei ${images.length} ${images.length === 1 ? "print" : "prints"} · extraia tudo que conseguir.`;

    const userVisible = hasText ? text.trim() : fallbackText;
    const next: ChatMsg[] = [
      ...messages,
      { role: "user", content: userVisible, images: hasImgs ? images : undefined },
    ];
    // Mensagem enviada pra IA carrega o conteúdo enriquecido (scraping), mas a UI mostra só o texto do usuário.
    const apiMessages: ChatMsg[] = [
      ...messages,
      { role: "user", content: enrichedText || fallbackText, images: hasImgs ? images : undefined },
    ];
    setMessages(next);
    setInput("");
    setPendingImages([]);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("product-from-chat", {
        body: { messages: apiMessages, current },
      });
      if (error) throw error;
      if (data?.fallback) {
        const assistant: string = data?.assistant ?? "A IA ficou indisponível por alguns instantes. Tente novamente em seguida.";
        setMessages((m) => [...m, { role: "assistant", content: assistant }]);
        toast.warning("IA temporariamente indisponível");
        return;
      }
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
              Escreva, grave áudio, anexe até {MAX_IMAGES} prints ou cole o link de um anúncio · arraste arquivos e URLs · a IA lê tudo, extrai dados e busca fotos reais.
            </p>
          </div>
          <Button size="sm" variant="default">Abrir chat</Button>
        </div>
      </Card>
    );
  }

  const disabled = busy || recording || transcribing || scrapingUrl;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    // Imagens
    const files = Array.from(dt.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      const tr = new DataTransfer();
      files.forEach((f) => tr.items.add(f));
      handleFiles(tr.files);
    }
    // URL solta
    const droppedText = dt.getData("text/uri-list") || dt.getData("text/plain");
    if (droppedText && /^https?:\/\//i.test(droppedText.trim())) {
      const u = droppedText.trim();
      setInput((cur) => (cur ? `${cur} ${u}` : u));
      toast.info("Link adicionado · clique enviar para a IA ler a página");
    }
  };

  return (
    <Card
      className={cn(
        "p-0 border-primary/30 bg-primary/5 overflow-hidden relative transition-colors",
        dragOver && "ring-2 ring-primary ring-offset-2 bg-primary/10",
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
      onDrop={onDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/15 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary font-semibold text-sm">
            <Upload className="w-8 h-8" />
            Solte aqui · prints ou link
          </div>
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/10">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="w-4 h-4 text-primary" /> Cadastrar com IA
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Fechar</Button>
      </div>

      <div ref={scrollRef} className="max-h-[340px] overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">
            Descreva o pacote, grave áudio, anexe prints (até {MAX_IMAGES}) ou cole o link de um anúncio/cotação · arraste arquivos ou URLs aqui dentro · a IA lê tudo e monta o produto sozinha.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap space-y-2",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-background border border-border rounded-bl-md text-foreground",
              )}
            >
              {m.images && m.images.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.images.map((src, k) => (
                    <img
                      key={k}
                      src={src}
                      alt={`anexo ${k + 1}`}
                      className="w-16 h-16 rounded-md object-cover border border-white/20"
                    />
                  ))}
                </div>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {(busy || transcribing || scrapingUrl) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {scrapingUrl ? "Lendo a página..." : transcribing ? "Transcrevendo áudio..." : "Pensando..."}
          </div>
        )}
      </div>

      {pendingImages.length > 0 && (
        <div className="px-3 pt-2 pb-1 border-t border-primary/15 bg-background/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground">
              {pendingImages.length} / {MAX_IMAGES} {pendingImages.length === 1 ? "imagem anexada" : "imagens anexadas"}
            </span>
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => setPendingImages([])}
            >
              Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingImages.map((src, i) => (
              <div key={i} className="relative group">
                <img
                  src={src}
                  alt={`anexo ${i + 1}`}
                  className="w-14 h-14 rounded-md object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => removePending(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remover imagem"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 border-t border-primary/15 bg-background/60">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || pendingImages.length >= MAX_IMAGES}
          title={`Anexar prints (até ${MAX_IMAGES})`}
        >
          <ImagePlus className="w-4 h-4" />
        </Button>
        {!recording ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={startRec}
            disabled={disabled}
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            const u = window.prompt("Cole a URL da página (anúncio, hotel, cotação, anúncio Decolar/Booking, etc):");
            if (!u) return;
            const trimmed = u.trim();
            if (!/^https?:\/\//i.test(trimmed)) {
              toast.error("URL inválida · use http:// ou https://");
              return;
            }
            setInput((cur) => (cur ? `${cur} ${trimmed}` : trimmed));
          }}
          disabled={disabled}
          title="Colar URL para a IA extrair"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          onPaste={(e) => {
            const items = Array.from(e.clipboardData?.items || []);
            const imgs = items.filter((it) => it.type.startsWith("image/")).map((it) => it.getAsFile()).filter(Boolean) as File[];
            if (imgs.length) {
              e.preventDefault();
              const dt = new DataTransfer();
              imgs.forEach((f) => dt.items.add(f));
              handleFiles(dt.files);
            }
          }}
          placeholder={recording ? "Gravando... fale o que quiser" : pendingImages.length > 0 ? "Mensagem opcional · ou clique enviar" : "Descreva, cole uma URL ou arraste prints aqui..."}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => send(input)}
          disabled={disabled || (!input.trim() && pendingImages.length === 0)}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
