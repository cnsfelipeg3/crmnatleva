import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  threshold = 70,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const ready = pullDistance >= threshold;
  const visible = pullDistance > 6 || refreshing;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center"
      style={{
        top: "max(env(safe-area-inset-top), 0px)",
        transform: `translateY(${refreshing ? 16 : Math.min(pullDistance * 0.5, 40)}px)`,
        opacity: visible ? 1 : 0,
        transition: refreshing ? "opacity 150ms" : "opacity 150ms, transform 100ms",
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border shadow-lg",
          ready && !refreshing && "ring-2 ring-primary/40",
        )}
      >
        {refreshing ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <ArrowDown
            className="w-4 h-4 text-foreground transition-transform"
            style={{
              transform: `rotate(${ready ? 180 : progress * 180}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
