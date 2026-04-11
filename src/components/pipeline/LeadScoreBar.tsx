import { cn } from "@/lib/utils";

interface Props {
  score: number;
  className?: string;
}

export function LeadScoreBar({ score, className }: Props) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={cn("text-[10px] font-bold tabular-nums", textColor)}>{score}</span>
    </span>
  );
}
