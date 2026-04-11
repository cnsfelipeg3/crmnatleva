import { cn } from "@/lib/utils";
import { Flame, Thermometer, Snowflake, Trophy, XCircle } from "lucide-react";
import type { Temperature } from "@/lib/negotiationNarrative";

const CONFIG: Record<Temperature, { icon: typeof Flame; label: string; color: string; bg: string }> = {
  hot: { icon: Flame, label: "Quente", color: "text-white", bg: "bg-red-600" },
  warm: { icon: Thermometer, label: "Morno", color: "text-white", bg: "bg-amber-500" },
  cold: { icon: Snowflake, label: "Frio", color: "text-white", bg: "bg-blue-500" },
  won: { icon: Trophy, label: "Fechada", color: "text-white", bg: "bg-emerald-600" },
  lost: { icon: XCircle, label: "Perdida", color: "text-white", bg: "bg-gray-500" },
};

export function TemperatureScore({ temperature, showLabel = false }: { temperature: Temperature; showLabel?: boolean }) {
  const c = CONFIG[temperature];
  const Icon = c.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm", c.bg, c.color)}>
      <Icon className="w-3 h-3" />
      {showLabel && c.label}
    </span>
  );
}
