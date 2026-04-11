import { NegotiationCard } from "./NegotiationCard";
import type { GroupedNegotiations } from "@/hooks/useNegotiationPriority";
import type { NegotiationItem } from "@/lib/negotiationNarrative";
import { AlertTriangle, CalendarDays, Clock, Archive, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<string, typeof Clock> = {
  now: AlertTriangle,
  today: Clock,
  yesterday: CalendarDays,
  this_week: CalendarDays,
  older: Archive,
  closed: CheckCircle2,
};

const GROUP_COLORS: Record<string, string> = {
  now: "text-red-500",
  today: "text-foreground",
  yesterday: "text-muted-foreground",
  this_week: "text-muted-foreground",
  older: "text-muted-foreground/60",
  closed: "text-muted-foreground/60",
};

interface Props {
  groups: GroupedNegotiations[];
  generating: string | null;
  onGenerate: (item: NegotiationItem) => void;
  onSelect: (item: NegotiationItem) => void;
}

export function NegotiationTimeline({ groups, generating, onGenerate, onSelect }: Props) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Nenhuma negociação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.key] || Clock;
        return (
          <div key={group.key}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                "w-2 h-2 rounded-full",
                group.key === "now" ? "bg-red-500 animate-pulse" :
                group.key === "today" ? "bg-accent" :
                "bg-muted-foreground/30"
              )} />
              <Icon className={cn("w-4 h-4", GROUP_COLORS[group.key])} />
              <span className={cn("text-xs font-bold uppercase tracking-wider", GROUP_COLORS[group.key])}>
                {group.label}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                — {group.items.length} negociaç{group.items.length === 1 ? "ão" : "ões"}
              </span>
            </div>

            {/* Cards */}
            <div className={cn(
              "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pl-4 border-l-2 ml-1",
              group.key === "now" ? "border-l-red-500/40" : "border-border/30"
            )}>
              {group.items.map((item) => (
                <NegotiationCard
                  key={item.id}
                  item={item}
                  generating={generating}
                  onGenerate={onGenerate}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
