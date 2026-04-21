import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

type Props = {
  src: string;
  durationSec?: number;
  waveform?: number[];
  variant?: "user" | "assistant";
};

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioBubble({ src, durationSec, waveform, variant = "user" }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec || 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onMeta = () => {
      if (isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  const progress = duration > 0 ? current / duration : 0;
  const bars = waveform && waveform.length > 0 ? waveform : Array.from({ length: 40 }, () => 0.3 + Math.random() * 0.6);

  const isUser = variant === "user";
  const activeColor = isUser ? "bg-accent-foreground" : "bg-accent";
  const inactiveColor = isUser ? "bg-accent-foreground/30" : "bg-muted-foreground/40";
  const textColor = isUser ? "text-accent-foreground/80" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2.5 min-w-[200px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80 ${
          isUser ? "bg-accent-foreground/15" : "bg-accent/15"
        }`}
      >
        {playing ? (
          <Pause className={`w-3.5 h-3.5 ${isUser ? "text-accent-foreground" : "text-accent"}`} />
        ) : (
          <Play className={`w-3.5 h-3.5 ml-0.5 ${isUser ? "text-accent-foreground" : "text-accent"}`} />
        )}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-7">
        {bars.map((amp, i) => {
          const isActive = i / bars.length <= progress;
          return (
            <div
              key={i}
              className={`w-[2px] rounded-full transition-colors ${isActive ? activeColor : inactiveColor}`}
              style={{ height: `${Math.max(3, amp * 24)}px` }}
            />
          );
        })}
      </div>
      <span className={`text-[11px] font-mono tabular-nums flex-shrink-0 ${textColor}`}>
        {formatTime(playing || current > 0 ? current : duration)}
      </span>
    </div>
  );
}
