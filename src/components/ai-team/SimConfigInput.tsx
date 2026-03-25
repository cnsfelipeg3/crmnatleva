import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface SimConfigInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  color: string;
  desc?: string;
  suffix?: string;
  format?: (v: number) => string;
  icon?: string;
  compact?: boolean;
}

export default function SimConfigInput({
  label, value, onChange, min, max, step = 1, color, desc, suffix = "", format, icon, compact = false,
}: SimConfigInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!focused) setDraft(String(value)); }, [value, focused]);

  const displayValue = format ? format(value) : `${value}${suffix}`;

  const commit = (raw: string) => {
    setFocused(false);
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    const n = step < 1 ? parseFloat(cleaned) : parseInt(cleaned, 10);
    if (!isNaN(n)) {
      onChange(Math.max(min, Math.min(max, n)));
    }
    setDraft(String(value));
  };

  const handleFocus = () => {
    setFocused(true);
    setDraft(String(value));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const nudge = (dir: 1 | -1) => {
    const next = value + step * dir;
    if (next >= min && next <= max) onChange(next);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg" style={{
        background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon && <span className="text-sm shrink-0">{icon}</span>}
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "#E2E8F0" }}>{label}</p>
            {desc && <p className="text-[10px] truncate" style={{ color: "#64748B" }}>{desc}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => nudge(-1)} className="w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Minus className="w-3 h-3" style={{ color: "#94A3B8" }} />
          </button>
          <input
            ref={inputRef}
            value={focused ? draft : displayValue}
            onChange={e => setDraft(e.target.value)}
            onFocus={handleFocus}
            onBlur={() => commit(draft)}
            onKeyDown={e => { if (e.key === "Enter") { commit(draft); inputRef.current?.blur(); } }}
            className="w-16 h-7 text-center text-sm font-extrabold rounded outline-none tabular-nums transition-all"
            style={{
              background: focused ? `${color}15` : `${color}10`,
              border: focused ? `1.5px solid ${color}` : `1px solid ${color}30`,
              color,
              caretColor: color,
            }}
          />
          <button onClick={() => nudge(1)} className="w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Plus className="w-3 h-3" style={{ color: "#94A3B8" }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 transition-all hover:border-opacity-60" style={{
      background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <span className="text-sm font-semibold" style={{ color: "#E2E8F0" }}>{label}</span>
        </div>
        <input
          ref={!compact ? inputRef : undefined}
          value={focused ? draft : displayValue}
          onChange={e => setDraft(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => commit(draft)}
          onKeyDown={e => { if (e.key === "Enter") { commit(draft); (e.target as HTMLInputElement).blur(); } }}
          className="w-24 h-9 text-center text-[22px] font-extrabold rounded-lg outline-none tabular-nums transition-all cursor-text"
          style={{
            background: focused ? `${color}12` : `${color}06`,
            border: focused ? `2px solid ${color}` : `1px solid transparent`,
            color,
            textShadow: `0 0 20px ${color}20`,
            caretColor: color,
          }}
        />
      </div>
      {desc && <p className="text-[11px] mb-3" style={{ color: "#94A3B8" }}>{desc}</p>}
      <div className="flex items-center gap-2">
        <button onClick={() => nudge(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Minus className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
        </button>
        <div className="flex-1 h-2 rounded-full overflow-hidden relative cursor-pointer" style={{ background: "rgba(255,255,255,0.04)" }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const raw = min + pct * (max - min);
            const snapped = Math.round(raw / step) * step;
            onChange(Math.max(min, Math.min(max, snapped)));
          }}>
          <div className="h-full rounded-full transition-all duration-300" style={{
            width: `${Math.min(100, ((value - min) / (max - min)) * 100)}%`,
            background: `linear-gradient(90deg, ${color}60, ${color})`,
          }} />
        </div>
        <button onClick={() => nudge(1)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Plus className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
        </button>
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] tabular-nums" style={{ color: "#475569" }}>{min}{suffix}</span>
        <span className="text-[10px] tabular-nums" style={{ color: "#475569" }}>{max}{suffix}</span>
      </div>
    </div>
  );
}
