import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Trash2, Send, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

type State = "idle" | "recording" | "preview" | "transcribing";

const MAX_SECONDS = 60;
const BAR_COUNT = 28;

export function AudioRecorder({ onTranscribed, disabled, className }: Props) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0.05));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedMimeRef = useRef<string>("audio/webm");
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const cleanupStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [cleanupStream]);

  function pickMime(): string {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
    }
    return "audio/webm";
  }

  const startRecording = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const mime = pickMime();
      recordedMimeRef.current = mime;
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        recordedBlobRef.current = blob;
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = URL.createObjectURL(blob);
        setState("preview");
        cleanupStream();
      };

      // Waveform analyser
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        // shift bars left, push new level on right
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        const lvl = Math.min(1, Math.max(0.05, avg * 1.8));
        setLevels((prev) => {
          const next = prev.slice(1);
          next.push(lvl);
          return next;
        });
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      setSeconds(0);
      setLevels(Array(BAR_COUNT).fill(0.05));
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);

      mr.start(100);
      setState("recording");
    } catch (err) {
      console.error("mic error", err);
      toast.error("Não consegui acessar o microfone. Verifique a permissão.");
      cleanupStream();
      setState("idle");
    }
  }, [cleanupStream, disabled]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {}
    }
  }, []);

  const cancel = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    recordedBlobRef.current = null;
    setSeconds(0);
    setLevels(Array(BAR_COUNT).fill(0.05));
    setState("idle");
  }, []);

  async function blobToBase64(blob: Blob): Promise<string> {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
    }
    return btoa(binary);
  }

  const sendForTranscription = useCallback(async () => {
    const blob = recordedBlobRef.current;
    if (!blob) return;
    setState("transcribing");
    try {
      const base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("gflights-transcribe-audio", {
        body: { audioBase64: base64, mimeType: recordedMimeRef.current },
      });
      if (error) throw error;
      const transcript = (data?.transcript || "").trim();
      if (!transcript) {
        toast.error("Não consegui entender o áudio. Tente de novo.");
        setState("preview");
        return;
      }
      onTranscribed(transcript);
      cancel();
    } catch (err: any) {
      console.error("transcribe error", err);
      toast.error(err?.message || "Erro ao transcrever áudio.");
      setState("preview");
    }
  }, [cancel, onTranscribed]);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  // ========= UI =========
  if (state === "idle") {
    return (
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={startRecording}
        disabled={disabled}
        className={cn(
          "h-9 w-9 rounded-full border-primary/30 hover:bg-primary/10 hover:border-primary/60 transition",
          className,
        )}
        title="Gravar áudio"
      >
        <Mic className="h-4 w-4 text-primary" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border bg-background pl-2 pr-1 py-1 shadow-sm",
        state === "recording" && "border-red-500/40 bg-red-500/5",
        state === "preview" && "border-primary/30",
        state === "transcribing" && "border-primary/30 bg-primary/5",
        className,
      )}
    >
      {/* Cancel */}
      {state !== "transcribing" && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={cancel}
          className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Descartar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Recording dot */}
      {state === "recording" && (
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
      )}

      {/* Waveform */}
      <div className="flex items-center gap-[2px] h-6 flex-1 min-w-[120px] max-w-[240px]">
        {levels.map((l, i) => (
          <div
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-all duration-75",
              state === "recording" ? "bg-red-500/80" : "bg-primary/60",
            )}
            style={{ height: `${Math.max(10, l * 100)}%` }}
          />
        ))}
      </div>

      {/* Time */}
      <span
        className={cn(
          "tabular-nums text-xs font-medium px-1 shrink-0",
          state === "recording" ? "text-red-600" : "text-muted-foreground",
        )}
      >
        {state === "transcribing" ? "transcrevendo…" : fmt(seconds)}
      </span>

      {/* Action */}
      {state === "recording" && (
        <Button
          type="button"
          size="icon"
          onClick={stopRecording}
          className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white"
          title="Parar"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </Button>
      )}
      {state === "preview" && (
        <>
          <audio ref={audioElRef} src={previewUrlRef.current ?? undefined} className="hidden" />
          <Button
            type="button"
            size="icon"
            onClick={sendForTranscription}
            className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
            title="Enviar áudio"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      {state === "transcribing" && (
        <div className="h-8 w-8 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
