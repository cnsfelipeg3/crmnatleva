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
              "w-2 h-2 rounded-full transition-all",
              done ? "bg-emerald-500" : "bg-gray-300",
              isActive && "w-2.5 h-2.5 ring-2 ring-emerald-500/30 animate-pulse"
            )} />
            {i < STEPS.length - 1 && (
              <div className={cn(
                "w-4 h-0.5 rounded-full",
                i < current ? "bg-emerald-500" : "bg-gray-200"
              )} />
            )}
          </div>
        );
      })}
      <span className="text-[10px] font-semibold text-gray-700 ml-1.5">
        {STEPS[Math.min(current, STEPS.length - 1)]?.label}
      </span>
    </div>
  );
}
