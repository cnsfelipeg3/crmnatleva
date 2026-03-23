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
    <div className="min-h-screen" style={{ background: "#080C14" }}>
      <div className="p-6 space-y-5 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}>
            <MessageSquare className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "#F1F5F9" }}>Simulador</h1>
            <p className="text-xs" style={{ color: "#64748B" }}>
              {mode === "manual" ? "Converse com qualquer dos 21 agentes em tempo real" : "Simulação automática com IA juiz e múltiplos perfis"}
            </p>
          </div>
        </div>

        {/* Premium pill mode selector */}
        <div
          className="inline-flex p-1 rounded-[10px]"
          style={{ background: "#0D1220", border: "1px solid #1E293B" }}
        >
          <button
            onClick={() => handleModeSwitch("manual")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
              mode === "manual"
                ? "shadow-md"
                : "hover:bg-white/[0.03]"
            )}
            style={mode === "manual"
              ? { background: "#10B981", color: "#000" }
              : { color: "#64748B" }
            }
          >
            <MessageSquare className="w-4 h-4" /> Conversa Manual
          </button>
          <button
            onClick={() => handleModeSwitch("auto")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
              mode === "auto"
                ? "shadow-md"
                : "hover:bg-white/[0.03]"
            )}
            style={mode === "auto"
              ? { background: "#8B5CF6", color: "#000" }
              : { color: "#64748B" }
            }
          >
            <Zap className="w-4 h-4" /> Simulação Automática
          </button>
        </div>

        {mode === "manual" && <SimuladorManualMode />}
        {mode === "auto" && <SimuladorAutoMode />}
      </div>
    </div>
  );
}
