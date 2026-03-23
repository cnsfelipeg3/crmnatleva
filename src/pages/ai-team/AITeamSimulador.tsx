import { useState, useEffect } from "react";
import { MessageSquare, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import SimuladorAutoMode from "@/components/ai-team/SimuladorAutoMode";
import SimuladorManualMode from "@/components/ai-team/SimuladorManualMode";

type Mode = "manual" | "auto";

function FloatingOrb({ color, size, x, y, delay }: { color: string; size: number; x: string; y: string; delay: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, left: x, top: y,
        background: `radial-gradient(circle, ${color}18, transparent 70%)`,
        filter: "blur(40px)",
        animation: `float-orb ${8 + delay}s ease-in-out infinite alternate`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export default function AITeamSimulador() {
  const [mode, setMode] = useState<Mode>("manual");
  const [manualHasMessages, setManualHasMessages] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) return;
    if (mode === "manual" && manualHasMessages) {
      if (!confirm("Trocar de modo vai limpar a conversa atual. Continuar?")) return;
    }
    setMode(newMode);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#060A12" }}>
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <FloatingOrb color="#10B981" size={400} x="10%" y="-5%" delay={0} />
        <FloatingOrb color="#8B5CF6" size={350} x="75%" y="5%" delay={2} />
        <FloatingOrb color="#06B6D4" size={300} x="50%" y="60%" delay={4} />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.015) 1px, transparent 0)`,
          backgroundSize: "48px 48px",
        }} />
      </div>

      <style>{`
        @keyframes float-orb {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(20px, -30px) scale(1.1); opacity: 0.8; }
          100% { transform: translate(-10px, 15px) scale(0.95); opacity: 0.5; }
        }
        @keyframes shimmer-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div className={cn(
        "relative z-10 p-6 space-y-6 max-w-7xl mx-auto transition-all duration-700",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        {/* Hero Header */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0D1B2A 50%, #0A1628 100%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div className="h-full w-1/3" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)", animation: "shimmer-line 4s ease-in-out infinite" }} />
          </div>

          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, #10B981, #06B6D4)",
                  boxShadow: "0 0 30px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "#10B981", borderColor: "#0A1628" }}>
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#10B981", opacity: 0.4 }} />
                </div>
              </div>
              <div>
                <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#F8FAFC", letterSpacing: "-0.03em" }}>
                  Simulador de Atendimento
                </h1>
                <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>
                  {mode === "manual"
                    ? "Converse em tempo real com qualquer dos 21 agentes IA"
                    : "Teste de estresse automático com IA juiz e múltiplos perfis"}
                </p>
              </div>
            </div>

            {/* Premium pill selector */}
            <div className="relative rounded-2xl p-1.5" style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
            }}>
              {/* Sliding indicator */}
              <div className="absolute top-1.5 bottom-1.5 rounded-xl transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{
                  left: mode === "manual" ? "6px" : "calc(50% + 2px)",
                  width: "calc(50% - 8px)",
                  background: mode === "manual"
                    ? "linear-gradient(135deg, #10B981, #059669)"
                    : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                  boxShadow: mode === "manual"
                    ? "0 4px 20px rgba(16,185,129,0.35)"
                    : "0 4px 20px rgba(139,92,246,0.35)",
                }}
              />
              <div className="relative flex">
                <button onClick={() => handleModeSwitch("manual")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-colors duration-300 z-10"
                  style={{ color: mode === "manual" ? "#fff" : "#64748B" }}>
                  <MessageSquare className="w-4 h-4" /> Manual
                </button>
                <button onClick={() => handleModeSwitch("auto")}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-colors duration-300 z-10"
                  style={{ color: mode === "auto" ? "#fff" : "#64748B" }}>
                  <Zap className="w-4 h-4" /> Automático
                </button>
              </div>
            </div>
          </div>

          {/* Bottom shimmer line */}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.15), rgba(139,92,246,0.15), transparent)" }} />
        </div>

        {/* Content */}
        <div className="transition-all duration-500" key={mode}>
          {mode === "manual" && <SimuladorManualMode />}
          {mode === "auto" && <SimuladorAutoMode />}
        </div>
      </div>
    </div>
  );
}
