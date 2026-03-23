import { useState } from "react";
import { MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import SimuladorAutoMode from "@/components/ai-team/SimuladorAutoMode";
import SimuladorManualMode from "@/components/ai-team/SimuladorManualMode";

type Mode = "manual" | "auto";

export default function AITeamSimulador() {
  const [mode, setMode] = useState<Mode>("manual");
  const [manualHasMessages, setManualHasMessages] = useState(false);

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) return;
    if (mode === "manual" && manualHasMessages) {
      if (!confirm("Trocar de modo vai limpar a conversa atual. Continuar?")) return;
    }
    setMode(newMode);
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Simulador</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "manual" ? "Converse com qualquer dos 21 agentes em tempo real" : "Simulação automática com IA juiz e múltiplos perfis"}
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => handleModeSwitch("manual")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            mode === "manual"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <MessageSquare className="w-4 h-4" /> Conversa Manual
        </button>
        <button
          onClick={() => handleModeSwitch("auto")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            mode === "auto"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <Zap className="w-4 h-4" /> Simulação Automática
        </button>
      </div>

      {mode === "manual" && <SimuladorManualMode />}
      {mode === "auto" && <SimuladorAutoMode />}
    </div>
  );
}
