import { cn } from "@/lib/utils";

const STEPS = [
  { key: "nova", label: "Nova" },
  { key: "analise", label: "Análise" },
  { key: "proposta_criada", label: "Proposta" },
  { key: "enviada", label: "Enviada" },
] as const;

const STAGE_INDEX: Record<string, number> = {
  nova: 0,
  analise: 1,
  proposta_criada: 2,
  enviada: 3,
  aceita: 4,
  perdida: -1,
};

interface Props {
  stage: string;
  className?: string;
}

export function PipelineStepper({ stage, className }: Props) {
  const current = STAGE_INDEX[stage] ?? 0;

  if (stage === "aceita" || stage === "perdida") return null;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        const isActive = i === current;
        return (
          <div key={step.key} className="flex items-center gap-0.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              done ? "bg-primary" : "bg-muted-foreground/20",
              isActive && "w-2 h-2 ring-2 ring-primary/20"
            )} />
            {i < STEPS.length - 1 && (
              <div className={cn(
                "w-3 h-px",
                i < current ? "bg-primary" : "bg-muted-foreground/15"
              )} />
            )}
          </div>
        );
      })}
      <span className="text-[9px] text-muted-foreground ml-1.5">
        {STEPS[Math.min(current, STEPS.length - 1)]?.label}
      </span>
    </div>
  );
}
