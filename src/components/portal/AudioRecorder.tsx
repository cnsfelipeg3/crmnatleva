import { useEffect, useRef, useState } from "react";
import { Mic, Trash2, Send, Pause, Play } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  onCancel: () => void;
  onSend: (audio: { dataUrl: string; mimeType: string; durationSec: number; waveform: number[] }) => void;
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioRecorder({ onCancel, onSend }: Props) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const waveformRef = useRef<number[]>([]);

  // Pick best mime type (Gemini handles webm/ogg/mp4 audio)
  const pickMime = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
    }
    return "audio/webm";
  };

  const start = async () => {
    // Make sure any leftover speech from the assistant is canceled —
    // some browsers (Chrome) keep the audio output channel busy and
    // can interfere with a fresh getUserMedia call.
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      /* ignore */
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Seu navegador não suporta gravação de áudio.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e: any) {
      console.error("[AudioRecorder] getUserMedia failed:", e?.name, e?.message);
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
        setError("Permissão do microfone negada. Libere o acesso no navegador.");
      } else if (e?.name === "NotFoundError") {
        setError("Nenhum microfone encontrado.");
      } else if (e?.name === "NotReadableError") {
        setError("O microfone está em uso por outro app. Feche e tente novamente.");
      } else {
        setError("Não consegui acessar o microfone. Tente novamente.");
      }
      return;
    }

    streamRef.current = stream;

    let mr: MediaRecorder;
    try {
      const mime = pickMime();
      mr = new MediaRecorder(stream, { mimeType: mime });
    } catch (e: any) {
      console.error("[AudioRecorder] MediaRecorder creation failed:", e);
      try {
        mr = new MediaRecorder(stream);
      } catch (e2: any) {
        console.error("[AudioRecorder] MediaRecorder fallback failed:", e2);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setError("Não consegui iniciar a gravação. Tente novamente.");
        return;
      }
    }

    mediaRecorderRef.current = mr;
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    try {
      mr.start(100);
    } catch (e: any) {
      console.error("[AudioRecorder] mr.start failed:", e);
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      setError("Não consegui iniciar a gravação. Tente novamente.");
      return;
    }

    startTimeRef.current = performance.now();
    accumulatedRef.current = 0;
    waveformRef.current = [];
    setWaveform([]);
    setElapsed(0);
    setRecording(true);
    setPaused(false);

    // Waveform analyser is OPTIONAL — failure here must not block recording
    let analyser: AnalyserNode | null = null;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") {
          try {
            await ctx.resume();
          } catch {
            /* ignore */
          }
        }
        const source = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;
      }
    } catch (e) {
      console.warn("[AudioRecorder] Waveform analyser unavailable:", e);
      analyserRef.current = null;
    }

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let lastSample = 0;
    const tick = () => {
      const now = performance.now();
      const total = accumulatedRef.current + (now - startTimeRef.current) / 1000;
      setElapsed(total);

      if (analyserRef.current && data) {
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        if (now - lastSample > 80) {
          lastSample = now;
          const amp = Math.min(1, rms * 3);
          waveformRef.current = [...waveformRef.current, amp].slice(-80);
          setWaveform(waveformRef.current);
        }
      } else if (now - lastSample > 80) {
        // No analyser → still show a small pulsing bar so the user sees activity
        lastSample = now;
        const amp = 0.25 + Math.random() * 0.25;
        waveformRef.current = [...waveformRef.current, amp].slice(-80);
        setWaveform(waveformRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const togglePause = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === "recording") {
      mr.pause();
      accumulatedRef.current += (performance.now() - startTimeRef.current) / 1000;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setPaused(true);
    } else if (mr.state === "paused") {
      mr.resume();
      startTimeRef.current = performance.now();
      setPaused(false);
      const data = new Uint8Array(analyserRef.current!.frequencyBinCount);
      let lastSample = 0;
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const now = performance.now();
        const total = accumulatedRef.current + (now - startTimeRef.current) / 1000;
        setElapsed(total);
        if (now - lastSample > 80) {
          lastSample = now;
          const amp = Math.min(1, rms * 3);
          waveformRef.current = [...waveformRef.current, amp].slice(-80);
          setWaveform(waveformRef.current);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
    streamRef.current = null;
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state !== "closed") {
      ctx.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const stopAndSend = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) {
      cleanup();
      onCancel();
      return;
    }
    const finalDuration = elapsed;
    const finalWaveform = [...waveformRef.current];
    const mime = mr.mimeType || "audio/webm";

    const blob: Blob = await new Promise((resolve) => {
      mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mime }));
      try {
        mr.stop();
      } catch {
        resolve(new Blob(chunksRef.current, { type: mime }));
      }
    });

    cleanup();
    setRecording(false);

    if (blob.size < 1000 || finalDuration < 0.4) {
      onCancel();
      return;
    }

    const dataUrl: string = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });

    onSend({ dataUrl, mimeType: mime, durationSec: finalDuration, waveform: finalWaveform });
  };

  const cancel = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {}
    }
    cleanup();
    setRecording(false);
    onCancel();
  };

  // Auto-start on mount
  useEffect(() => {
    start();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <p className="text-sm text-destructive flex-1">{error}</p>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl bg-muted text-foreground text-sm"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <button
        onClick={cancel}
        className="p-2.5 rounded-2xl hover:bg-destructive/10 text-destructive transition-colors"
        title="Cancelar"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-2xl bg-muted/40">
        {recording && !paused && (
          <motion.div
            className="w-2.5 h-2.5 rounded-full bg-destructive"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        {paused && <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />}

        {/* Waveform */}
        <div className="flex-1 flex items-center gap-[2px] h-7 overflow-hidden">
          {waveform.length === 0 ? (
            <div className="text-xs text-muted-foreground">Gravando...</div>
          ) : (
            waveform.map((amp, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full bg-accent/80"
                style={{ height: `${Math.max(3, amp * 28)}px` }}
              />
            ))
          )}
        </div>

        <span className="text-xs font-mono text-foreground tabular-nums">{formatTime(elapsed)}</span>
      </div>

      <button
        onClick={togglePause}
        disabled={!recording}
        className="p-2.5 rounded-2xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        title={paused ? "Retomar" : "Pausar"}
      >
        {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
      </button>

      <button
        onClick={stopAndSend}
        disabled={!recording}
        className="p-2.5 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-40"
        title="Enviar"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
