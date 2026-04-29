import { useEffect, useRef, useState } from "react";
import PortalLayout from "@/components/portal/PortalLayout";
import AudioRecorder from "@/components/portal/AudioRecorder";
import AudioBubble from "@/components/portal/AudioBubble";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Image as ImageIcon, X, Loader2, Bot, User as UserIcon, Mic } from "lucide-react";
import ConciergeAnswer from "@/components/portal/ConciergeAnswer";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } };

type AudioMeta = { dataUrl: string; mimeType: string; durationSec: number; waveform: number[] };

type GeneratedAudio = {
  text: string;
  lang: string;
  status: "ready" | "speaking" | "translating" | "error";
  translations?: Record<string, string>; // lang -> translated text
  selectedLang?: string;
};

const AVAILABLE_LANGS: { code: string; label: string; flag: string }[] = [
  { code: "pt-BR", label: "Português", flag: "🇧🇷" },
  { code: "en-US", label: "English", flag: "🇺🇸" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
  { code: "fr-FR", label: "Français", flag: "🇫🇷" },
  { code: "it-IT", label: "Italiano", flag: "🇮🇹" },
  { code: "de-DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja-JP", label: "日本語", flag: "🇯🇵" },
  { code: "zh-CN", label: "中文", flag: "🇨🇳" },
  { code: "ar-SA", label: "العربية", flag: "🇸🇦" },
  { code: "ru-RU", label: "Русский", flag: "🇷🇺" },
];

type Message = {
  role: "user" | "assistant";
  content: string | ContentPart[];
  displayText?: string;
  displayImages?: string[];
  displayAudio?: AudioMeta;
  generatedAudio?: GeneratedAudio;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-concierge-ai`;

const AUDIO_TAG_RE = /\[AUDIO_REPLY(?:\s+lang="([^"]+)")?\]([\s\S]*?)\[\/AUDIO_REPLY\]/i;

// Pick the best available system voice for a given BCP-47 language code
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const target = lang.toLowerCase();
  const base = target.split("-")[0];
  // Prefer high-quality voices when present (Apple/Google premium ones contain these keywords)
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const n = (v.name || "").toLowerCase();
    if (v.lang?.toLowerCase() === target) s += 100;
    else if (v.lang?.toLowerCase().startsWith(base)) s += 50;
    if (/google|natural|premium|enhanced|neural|siri|samantha|luciana|joana|paulina/.test(n)) s += 20;
    if (v.localService) s += 5;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0] || null;
}

// Speak text using the browser's native TTS. Returns a Promise that resolves when speech ends.
function speakText(text: string, lang: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      reject(new Error("Seu navegador não suporta síntese de voz."));
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 1;
    utter.pitch = 1;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.onend = () => resolve();
    utter.onerror = (e) => reject(new Error(e.error || "Falha ao falar"));
    synth.speak(utter);
  });
}

// Convert a Blob/dataUrl to RAW base64 (no data URL prefix, no whitespace)
async function dataUrlToRawBase64(dataUrl: string): Promise<string> {
  // Fast path: if it's already a data URL, fetch it as a blob and re-encode reliably
  const blob = await (await fetch(dataUrl)).blob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

const SUGGESTIONS = [
  "Monta um roteiro de 3 dias em Lisboa focado em gastronomia",
  "Que passeio bate o pôr-do-sol mais bonito em Santorini?",
  "Vou para Orlando em maio, o que não pode faltar?",
  "Lugares fora do óbvio em Paris",
];

// Strip "data:audio/xxx;base64," prefix and return the format hint
function parseDataUrl(dataUrl: string): { base64: string; mime: string; format: string } {
  // Robust split: ignore optional codec params; only require ;base64, marker
  const commaIdx = dataUrl.indexOf("base64,");
  let mime = "audio/webm";
  let base64 = dataUrl;
  if (dataUrl.startsWith("data:") && commaIdx !== -1) {
    const header = dataUrl.slice(5, commaIdx); // "audio/webm;codecs=opus;"
    const cleanHeader = header.replace(/;$/, "");
    mime = cleanHeader.split(";")[0] || "audio/webm";
    base64 = dataUrl.slice(commaIdx + "base64,".length);
  }
  // Gemini-compatible format hints
  let format = "webm";
  const m = mime.toLowerCase();
  if (m.includes("mp3") || m.includes("mpeg")) format = "mp3";
  else if (m.includes("wav")) format = "wav";
  else if (m.includes("ogg")) format = "ogg";
  else if (m.includes("mp4") || m.includes("aac") || m.includes("m4a")) format = "mp4";
  else if (m.includes("webm")) format = "webm";
  return { base64, mime, format };
}

export default function PortalConcierge() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [input]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newImages: string[] = [];
    for (const file of Array.from(files).slice(0, 4 - attachedImages.length)) {
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: `${file.name} ultrapassa 8MB.`, variant: "destructive" });
        continue;
      }
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      newImages.push(dataUrl);
    }
    setAttachedImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (idx: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const sendAudioMessage = (audio: AudioMeta) => {
    setIsRecording(false);
    sendCore({ audio });
  };

  const translateText = async (text: string, targetLang: string): Promise<string> => {
    const langName = AVAILABLE_LANGS.find((l) => l.code === targetLang)?.label || targetLang;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Traduza o texto abaixo para ${langName} (${targetLang}). Responda APENAS com a tradução, sem aspas, sem comentários, sem explicações, mantendo o tom natural e falado.\n\nTexto:\n${text}`,
          },
        ],
      }),
    });
    if (!resp.ok || !resp.body) throw new Error("Falha ao traduzir");
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let acc = "";
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
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return acc.trim();
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) acc += delta;
        } catch {
          /* ignore */
        }
      }
    }
    return acc.trim();
  };

  const updateMessageAudio = (msgIndex: number, patch: Partial<GeneratedAudio>) => {
    setMessages((prev) => {
      const copy = [...prev];
      const m = copy[msgIndex];
      if (m?.role === "assistant" && m.generatedAudio) {
        copy[msgIndex] = { ...m, generatedAudio: { ...m.generatedAudio, ...patch } };
      }
      return copy;
    });
  };

  const playGeneratedAudio = async (msgIndex: number, langOverride?: string) => {
    const target = messages[msgIndex];
    if (!target?.generatedAudio) return;
    const ga = target.generatedAudio;
    const lang = langOverride || ga.selectedLang || ga.lang;
    const isOriginal = lang === ga.lang;
    let textToSpeak = isOriginal ? ga.text : ga.translations?.[lang];

    if (!textToSpeak) {
      updateMessageAudio(msgIndex, { status: "translating", selectedLang: lang });
      try {
        textToSpeak = await translateText(ga.text, lang);
        setMessages((prev) => {
          const copy = [...prev];
          const m = copy[msgIndex];
          if (m?.role === "assistant" && m.generatedAudio) {
            copy[msgIndex] = {
              ...m,
              generatedAudio: {
                ...m.generatedAudio,
                translations: { ...(m.generatedAudio.translations || {}), [lang]: textToSpeak! },
                selectedLang: lang,
                status: "ready",
              },
            };
          }
          return copy;
        });
      } catch (err: any) {
        updateMessageAudio(msgIndex, { status: "ready" });
        toast({ title: "Tradução falhou", description: err?.message || "Tente outro idioma.", variant: "destructive" });
        return;
      }
    } else {
      updateMessageAudio(msgIndex, { selectedLang: lang });
    }

    updateMessageAudio(msgIndex, { status: "speaking" });
    try {
      await speakText(textToSpeak!, lang);
    } catch (err: any) {
      toast({
        title: "Áudio indisponível",
        description: err?.message || "Seu navegador não conseguiu tocar o áudio.",
        variant: "destructive",
      });
    } finally {
      updateMessageAudio(msgIndex, { status: "ready" });
    }
  };



  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text && attachedImages.length === 0) return;
    sendCore({ text });
  };

  const sendCore = async ({ text, audio }: { text?: string; audio?: AudioMeta }) => {
    if (isLoading) return;
    const finalText = (text ?? "").trim();
    if (!finalText && !audio && attachedImages.length === 0) return;

    const displayImages = [...attachedImages];

    let content: string | ContentPart[];
    const parts: ContentPart[] = [];

    if (audio) {
      // Robustly extract RAW base64 from the recorded blob (no data URL prefix, no whitespace)
      const base64 = await dataUrlToRawBase64(audio.dataUrl);
      const mimeOnly = (audio.mimeType || "audio/webm").split(";")[0].toLowerCase();
      let format = "webm";
      if (mimeOnly.includes("mp3") || mimeOnly.includes("mpeg")) format = "mp3";
      else if (mimeOnly.includes("wav")) format = "wav";
      else if (mimeOnly.includes("ogg")) format = "ogg";
      else if (mimeOnly.includes("mp4") || mimeOnly.includes("aac") || mimeOnly.includes("m4a")) format = "mp4";
      parts.push({ type: "input_audio", input_audio: { data: base64, format } });
      parts.push({ type: "text", text: "Ouça este áudio e responda como concierge de viagens." });
    } else {
      if (finalText) parts.push({ type: "text", text: finalText });
      for (const img of attachedImages) {
        parts.push({ type: "image_url", image_url: { url: img } });
      }
    }

    if (parts.length === 1 && parts[0].type === "text" && !audio && attachedImages.length === 0) {
      content = finalText;
    } else {
      content = parts;
    }

    const userMsg: Message = {
      role: "user",
      content,
      displayText: audio ? "" : finalText,
      displayImages: !audio && displayImages.length ? displayImages : undefined,
      displayAudio: audio,
    };

    const payloadMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedImages([]);
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Erro de rede" }));
        if (resp.status === 429) {
          toast({ title: "Aguarde um momento", description: err.error || "Muitas requisições.", variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "Serviço indisponível", description: err.error || "Créditos esgotados.", variant: "destructive" });
        } else {
          toast({ title: "Erro", description: err.error || "Falha na comunicação.", variant: "destructive" });
        }
        setIsLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "", displayText: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let streamDone = false;

      // Helper: returns the visible text by stripping any (possibly partial) AUDIO_REPLY tag.
      // While the tag is being streamed but not yet closed, hide everything from the opening tag onward.
      const visibleText = (full: string): string => {
        const closed = full.replace(AUDIO_TAG_RE, "").trim();
        // Hide partial open tag (still streaming, not yet closed)
        const partialOpen = closed.search(/\[AUDIO_REPLY(?:\s+lang="[^"]*")?\]/i);
        if (partialOpen !== -1) return closed.slice(0, partialOpen).trim();
        // Also hide a lone "[AUDIO_R..." prefix while it's being typed
        const looseOpen = closed.search(/\[AUDIO_?R?E?P?L?Y?$/i);
        if (looseOpen !== -1 && closed.length - looseOpen < 30) return closed.slice(0, looseOpen).trim();
        return closed;
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              const display = visibleText(acc);
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: acc, displayText: display };
                }
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Detect [AUDIO_REPLY lang="..."]...[/AUDIO_REPLY] tag and speak natively
      const match = acc.match(AUDIO_TAG_RE);
      if (match) {
        const lang = match[1] || "pt-BR";
        const speech = match[2].trim();
        const cleanedText = acc.replace(AUDIO_TAG_RE, "").trim();
        let autoPlayIndex = -1;
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          const last = copy[lastIdx];
          if (last?.role === "assistant") {
            copy[lastIdx] = {
              ...last,
              content: cleanedText,
              displayText: cleanedText,
              generatedAudio: { text: speech, lang, status: "ready" },
            };
            autoPlayIndex = lastIdx;
          }
          return copy;
        });
        // Auto-play once the state has been committed
        if (autoPlayIndex >= 0) {
          setTimeout(() => playGeneratedAudio(autoPlayIndex), 80);
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não consegui conectar agora. Tenta de novo?", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSend = !isLoading && (input.trim().length > 0 || attachedImages.length > 0);

  return (
    <PortalLayout>
      {/*
        Mobile-first: ocupa a viewport visível real (dvh evita corte da barra do iOS).
        Em md+ volta ao layout centralizado tradicional.
      */}
      <div
        className="max-w-3xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-6 flex flex-col min-h-0"
        style={{ height: "calc(100dvh - 96px)" }}
      >
        {/* Header — compacto no mobile, expansivo no desktop */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-2 sm:mb-3">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-accent">Concierge.IA</span>
          </div>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight sm:tracking-tighter text-foreground leading-tight">
            Seu concierge pessoal de viagens
          </h1>
          <p className="hidden sm:block text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Pergunte por texto, foto ou áudio. Roteiros, restaurantes, dicas locais — ou descubra que lugar é aquele da sua foto.
          </p>
          <p className="sm:hidden text-xs text-muted-foreground mt-1.5 px-2">
            Texto, foto ou áudio. Roteiros, dicas locais e descobertas.
          </p>
        </motion.div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-5 pb-3 px-0.5 sm:px-1 overscroll-contain"
          style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
        >
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="py-4 sm:py-10"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left px-4 py-3.5 rounded-2xl border border-border/40 bg-card/40 hover:bg-card active:bg-card hover:border-accent/30 active:border-accent/30 transition-all text-sm text-foreground/80 hover:text-foreground min-h-[56px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 sm:gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                  </div>
                )}
                <div
                  className={`max-w-[92%] sm:max-w-[88%] break-words ${
                    msg.role === "user"
                      ? "rounded-2xl px-3.5 sm:px-4 py-2.5 bg-accent text-accent-foreground"
                      : "rounded-2xl rounded-tl-md px-4 sm:px-5 py-3 sm:py-3.5 bg-card/70 backdrop-blur-sm border border-border/40 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.08)] text-foreground"
                  }`}
                >
                  {msg.displayImages && msg.displayImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.displayImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="anexo"
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}
                  {msg.displayAudio && (
                    <AudioBubble
                      src={msg.displayAudio.dataUrl}
                      durationSec={msg.displayAudio.durationSec}
                      waveform={msg.displayAudio.waveform}
                      variant="user"
                    />
                  )}
                  {msg.role === "user" ? (
                    msg.displayText ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed mt-1">{msg.displayText}</p>
                    ) : null
                  ) : (
                    <div>
                      {msg.displayText ? (
                        <ConciergeAnswer
                          text={msg.displayText}
                          streaming={isLoading && i === messages.length - 1}
                        />
                      ) : (
                        <div className="flex items-center gap-2 py-1">
                          <Loader2 className="w-4 h-4 animate-spin text-accent" />
                          <span className="text-xs text-muted-foreground">Pensando...</span>
                        </div>
                      )}
                      {msg.generatedAudio && (
                        <div className="mt-3 not-prose">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-background/60 rounded-2xl p-2 border border-border/40">
                            <Select
                              value={msg.generatedAudio.selectedLang || msg.generatedAudio.lang}
                              onValueChange={(newLang) => {
                                updateMessageAudio(i, { selectedLang: newLang });
                              }}
                              disabled={msg.generatedAudio.status === "speaking" || msg.generatedAudio.status === "translating"}
                            >
                              <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-8 text-xs border-border/40 bg-card/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_LANGS.map((l) => (
                                  <SelectItem key={l.code} value={l.code} className="text-xs">
                                    <span className="mr-1.5">{l.flag}</span>
                                    {l.label}
                                    {l.code === msg.generatedAudio!.lang && (
                                      <span className="ml-1 text-[9px] text-muted-foreground">(original)</span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button
                              onClick={() => playGeneratedAudio(i)}
                              disabled={msg.generatedAudio.status === "speaking" || msg.generatedAudio.status === "translating"}
                              className="flex items-center justify-center gap-2 flex-1 px-3 py-2 sm:py-1.5 rounded-xl bg-accent/10 hover:bg-accent/20 active:bg-accent/20 text-accent text-xs font-semibold transition-all disabled:opacity-60 min-h-[36px]"
                            >
                              {msg.generatedAudio.status === "speaking" ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Falando...
                                </>
                              ) : msg.generatedAudio.status === "translating" ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Traduzindo...
                                </>
                              ) : (
                                <>
                                  <Mic className="w-3.5 h-3.5" />
                                  Ouvir
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 sm:gap-3 justify-start">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
              </div>
              <div className="bg-muted/60 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input — sticky no desktop, fixed bottom no mobile com safe-area */}
        <div
          className="sticky bottom-2 sm:bottom-4 mt-3 sm:mt-4"
          style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        >
          <div className="rounded-3xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-lg p-2 sm:p-2.5">
            {isRecording ? (
              <AudioRecorder
                onCancel={() => setIsRecording(false)}
                onSend={sendAudioMessage}
              />
            ) : (
              <>
                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 px-1">
                    {attachedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="preview" className="w-16 h-16 object-cover rounded-xl" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
                          aria-label="Remover imagem"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-1.5 sm:gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachedImages.length >= 4 || isLoading}
                    className="p-2.5 sm:p-2.5 rounded-2xl hover:bg-muted/60 active:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Anexar imagem"
                    aria-label="Anexar imagem"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleImageUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Pergunte sobre viagens..."
                    rows={1}
                    enterKeyHint="send"
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    className="flex-1 resize-none bg-transparent outline-none text-base sm:text-sm text-foreground placeholder:text-muted-foreground py-2 px-1 max-h-[140px] sm:max-h-[180px]"
                    style={{ fontSize: "16px" }}
                    disabled={isLoading}
                  />
                  {canSend ? (
                    <button
                      onClick={() => send()}
                      disabled={isLoading}
                      className="p-2.5 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Enviar"
                      aria-label="Enviar"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsRecording(true)}
                      disabled={isLoading}
                      className="p-2.5 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Gravar áudio"
                      aria-label="Gravar áudio"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1.5 sm:mt-2 px-2">
            Concierge.IA pode errar — confirme informações críticas antes de viajar.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
