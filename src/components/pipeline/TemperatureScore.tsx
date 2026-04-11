import { cn } from "@/lib/utils";
import { Flame, Thermometer, Snowflake, Trophy, XCircle } from "lucide-react";
import type { Temperature } from "@/lib/negotiationNarrative";

const CONFIG: Record<Temperature, { icon: typeof Flame; label: string; color: string; bg: string }> = {
  hot: { icon: Flame, label: "Quente", color: "text-red-500", bg: "bg-red-500/10" },
  warm: { icon: Thermometer, label: "Morno", color: "text-amber-500", bg: "bg-amber-500/10" },
  cold: { icon: Snowflake, label: "Frio", color: "text-blue-400", bg: "bg-blue-400/10" },
  won: { icon: Trophy, label: "Fechada", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  lost: { icon: XCircle, label: "Perdida", color: "text-muted-foreground", bg: "bg-muted/50" },
};

export function TemperatureScore({ temperature, showLabel = false }: { temperature: Temperature; showLabel?: boolean }) {
  const c = CONFIG[temperature];
  const Icon = c.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", c.bg, c.color)}>
      <Icon className="w-3 h-3" />
      {showLabel && c.label}
    </span>
  );
}
