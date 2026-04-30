import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { Play, Pause } from "lucide-react";

interface AudioWaveformPlayerProps {
  src: string;
  isOutgoing?: boolean;
  msgId: string;
  waveformData?: string;
  durationSec?: number;
}

const SPEEDS = [1, 1.5, 2];

function decodeWaveform(b64: string, count: number): number[] {
  try {
    const raw = atob(b64);
    const samples: number[] = [];
    for (let i = 0; i < raw.length; i++) {
      samples.push(raw.charCodeAt(i) / 100);
    }
    if (samples.length === 0) return generateBars("", count);
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / count) * samples.length);
      result.push(Math.max(0.12, Math.min(1, samples[idx])));
    }
    return result;
  } catch {
    return generateBars("", count);
  }
}

function generateBars(id: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = ((hash << 5) - hash + i * 7 + 13) | 0;
    const val = Math.abs(hash % 100);
    bars.push(0.15 + (val / 100) * 0.85);
  }
  return bars;
}

export const AudioWaveformPlayer = forwardRef<HTMLDivElement, AudioWaveformPlayerProps>(function AudioWaveformPlayer({ src, isOutgoing = false, msgId, waveformData }, _ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const animFrameRef = useRef<number>();
  const bars = useRef(
    waveformData ? decodeWaveform(waveformData, 50) : generateBars(msgId, 50)
  ).current;

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && isFinite(audio.duration)) {
      setCurrentTime(audio.currentTime);
      setProgress(audio.currentTime / audio.duration);
    }
    if (!audio.paused) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); };
    const onPlay = () => { setIsPlaying(true); animFrameRef.current = requestAnimationFrame(updateProgress); };
    const onPause = () => { setIsPlaying(false); if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [updateProgress]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const displayTime = isPlaying || currentTime > 0 ? currentTime : duration;
  const speed = SPEEDS[speedIdx];

  return (
    <div className="flex items-center gap-2.5 min-w-[260px] py-1">
      <audio ref={audioRef} src={src} preload="metadata" />
      {/* Play button - WhatsApp style circle */}
      <button
        onClick={togglePlay}
        className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all ${
          isOutgoing
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            : "bg-foreground/10 hover:bg-foreground/15 text-foreground"
        }`}
      >
        {isPlaying
          ? <Pause className="h-5 w-5" />
          : <Play className="h-5 w-5 ml-0.5" />
        }
      </button>

      {/* Waveform + time */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="flex items-center gap-[1.5px] h-[28px] cursor-pointer"
          onClick={handleBarClick}
        >
          {bars.map((h, i) => {
            const barProgress = i / bars.length;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-75"
                style={{
                  height: `${Math.max(12, h * 100)}%`,
                  minWidth: 2.5,
                  maxWidth: 4,
                  backgroundColor: isActive
                    ? isOutgoing ? "rgba(255,255,255,0.9)" : "hsl(var(--primary))"
                    : isOutgoing ? "rgba(255,255,255,0.3)" : "hsl(var(--muted-foreground) / 0.3)",
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] leading-none ${isOutgoing ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {formatTime(displayTime)}
          </span>
          <button
            onClick={cycleSpeed}
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
              speed !== 1
                ? isOutgoing ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary/15 text-primary"
                : isOutgoing ? "bg-primary-foreground/10 text-primary-foreground/60 hover:bg-primary-foreground/20" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
            }`}
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
});
