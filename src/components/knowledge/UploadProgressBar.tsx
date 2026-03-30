import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadPhase = "uploading" | "extracting" | "orion" | "done" | "error";

interface UploadProgressBarProps {
  phase: UploadPhase;
  progress: number; // 0-100
  fileName?: string;
  error?: string;
}

const PHASE_LABELS: Record<UploadPhase, string> = {
  uploading: "Enviando arquivo...",
  extracting: "Extraindo conteúdo com IA...",
  orion: "ÓRION processando taxonomia...",
  done: "Concluído!",
  error: "Erro no processamento",
};

export default function UploadProgressBar({ phase, progress, fileName, error }: UploadProgressBarProps) {
  const isDone = phase === "done";
  const isError = phase === "error";

  return (
    <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/30">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          {isError ? (
            <AlertCircle className="w-3 h-3 text-destructive" />
          ) : isDone ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          ) : (
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
          )}
          <span className={cn(
            "font-medium",
            isError && "text-destructive",
            isDone && "text-emerald-600",
          )}>
            {PHASE_LABELS[phase]}
          </span>
        </span>
        {fileName && <span className="text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
      </div>
      <Progress value={progress} className="h-1.5" />
      {isError && error && (
        <p className="text-[10px] text-destructive">{error}</p>
      )}
    </div>
  );
}
