import { cn } from "@/lib/utils";

export const PIPELINE_STAGES = [
  { key: "em_atendimento", label: "Chat", emoji: "💬" },
  { key: "extraindo", label: "Extraindo", emoji: "🔍" },
  { key: "aguardando_cotacao", label: "Aguard. Cotação", emoji: "📋" },
  { key: "proposta_criada", label: "Proposta", emoji: "📄" },
  { key: "enviada", label: "Enviada", emoji: "📨" },
] as const;

const STAGE_INDEX: Record<string, number> = {
  em_atendimento: 0,
  extraindo: 1,
  aguardando_cotacao: 2,
  proposta_criada: 3,
  enviada: 4,
  aceita: 5,
  perdida: -1,
};

interface Props {
  stage: string;
  extractionPct?: number;
  className?: string;
}

export function PipelineStepper({ stage, extractionPct, className }: Props) {
  const current = STAGE_INDEX[stage] ?? 0;

  if (stage === "aceita") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
          ✓ Fechada
        </span>
      </div>
    );
  }
  if (stage === "perdida") return null;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {PIPELINE_STAGES.map((step, i) => {
        const done = i < current;
        const isActive = i === current;
        return (
          <div key={step.key} className="flex items-center gap-0.5">
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                done && "bg-emerald-500",
                isActive && "w-2.5 h-2.5 ring-2 ring-accent/30 bg-accent animate-pulse",
                !done && !isActive && "bg-muted-foreground/20"
              )}
              title={step.label}
            />
            {i < PIPELINE_STAGES.length - 1 && (
              <div
                className={cn(
                  "w-3 h-0.5 rounded-full",
                  i < current ? "bg-emerald-500" : "bg-muted-foreground/15"
                )}
              />
            )}
          </div>
        );
      })}
      <span className="text-[10px] font-semibold text-muted-foreground ml-1.5">
        {PIPELINE_STAGES[Math.min(current, PIPELINE_STAGES.length - 1)]?.label}
        {stage === "extraindo" && extractionPct != null && (
          <span className="text-accent ml-1">{extractionPct}%</span>
        )}
      </span>
    </div>
  );
}
