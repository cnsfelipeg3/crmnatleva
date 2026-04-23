import { cn } from "@/lib/utils";

interface BetaBadgeProps {
  className?: string;
}

export function BetaBadge({ className }: BetaBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm",
        className,
      )}
    >
      BETA
    </span>
  );
}
