import type { Agent } from "./mockData";
import { cn } from "@/lib/utils";

const statusConfig: Record<Agent["status"], { label: string; color: string; animation: string }> = {
  idle: { label: "Aguardando", color: "bg-muted-foreground/40", animation: "" },
  analyzing: { label: "Analisando", color: "bg-blue-500", animation: "animate-pulse" },
  suggesting: { label: "Sugerindo", color: "bg-emerald-500", animation: "animate-[pulse_3s_ease-in-out_infinite]" },
};

interface Props {
  agent: Agent;
  taskCount: number;
  onSelect: () => void;
}

export default function AgentDesk({ agent, taskCount, onSelect }: Props) {
  const st = statusConfig[agent.status];

  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-lg hover:border-primary/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Floor shadow */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[60%] h-3 rounded-full bg-foreground/5 blur-sm" />

      {/* Avatar */}
      <div className="relative">
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-muted/60 border-2 border-border/60 transition-all duration-200 ease-out",
            agent.status !== "idle" && "shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]"
          )}
        >
          {agent.emoji}
        </div>
        {/* Status dot */}
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
            st.color,
            st.animation
          )}
        />
        {/* Task badge */}
        {taskCount > 0 && (
          <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {taskCount}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="text-sm font-semibold text-foreground">{agent.name}</span>

      {/* Status label */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", st.color, st.animation)} />
        {st.label}
      </div>

      {/* Desk surface */}
      <div className="absolute inset-x-3 bottom-0 h-1.5 rounded-b-2xl bg-gradient-to-r from-border/30 via-border/60 to-border/30" />
    </button>
  );
}
