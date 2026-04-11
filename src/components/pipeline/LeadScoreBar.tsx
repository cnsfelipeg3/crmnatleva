import { cn } from "@/lib/utils";

interface Props {
  score: number;
  className?: string;
}

export function LeadScoreBar({ score, className }: Props) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 70 ? "text-emerald-700" : score >= 40 ? "text-amber-700" : "text-red-700";

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="w-14 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={cn("text-[11px] font-extrabold tabular-nums", textColor)}>{score}</span>
    </span>
  );
}
