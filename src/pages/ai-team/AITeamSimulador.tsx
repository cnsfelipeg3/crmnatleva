import { useState, useEffect, lazy, Suspense, memo } from "react";
import { MessageSquare, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import NatLevaLoader from "@/components/NatLevaLoader";

const SimuladorAutoMode = lazy(() => import("@/components/ai-team/SimuladorAutoMode"));
const SimuladorManualMode = lazy(() => import("@/components/ai-team/SimuladorManualMode"));
const SimuladorChameleonMode = lazy(() => import("@/components/ai-team/SimuladorChameleonMode"));

type Mode = "manual" | "auto" | "chameleon";

export default function AITeamSimulador() {
  const [mode, setMode] = useState<Mode>("manual");
  const [manualHasMessages, setManualHasMessages] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) return;
    if (mode === "manual" && manualHasMessages) {
      if (!confirm("Trocar de modo vai limpar a conversa atual. Continuar?")) return;
    }
    setMode(newMode);
  };

  const modeDescriptions: Record<Mode, string> = {
    manual: "Converse em tempo real com qualquer dos 21 agentes IA",
    auto: "Teste de estresse automático com IA juiz e múltiplos perfis",
    chameleon: "IA vs IA — Lead inteligente testa seus agentes automaticamente",
  };

  const modeButtons: Array<{ id: Mode; label: string; icon: typeof MessageSquare }> = [
    { id: "manual", label: "Manual", icon: MessageSquare },
    { id: "auto", label: "Automático", icon: Zap },
    { id: "chameleon", label: "🦎 Camaleão", icon: Sparkles },
  ];

  const activeIdx = modeButtons.findIndex(b => b.id === mode);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background" style={{ contain: "layout style paint" }}>
      {/* Ambient glow — brandbook green */}
      <div className="absolute inset-0 pointer-events-none" style={{ contain: "strict" }}>
        <div className="absolute rounded-full" style={{
          width: isMobile ? 250 : 400, height: isMobile ? 250 : 400,
          left: "10%", top: "-5%",
          background: "radial-gradient(circle, hsl(var(--primary) / 0.06), transparent 70%)",
          willChange: "transform", transform: "translateZ(0)",
        }} />
        <div className="absolute rounded-full" style={{
          width: isMobile ? 200 : 350, height: isMobile ? 200 : 350,
          left: "75%", top: "5%",
          background: "radial-gradient(circle, hsl(var(--champagne) / 0.04), transparent 70%)",
          willChange: "transform", transform: "translateZ(0)",
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.02) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }} />
      </div>

      <div className={cn(
        "relative z-10 flex flex-col mx-auto",
        isMobile ? "p-2 pb-4 gap-2" : "p-3 px-4 gap-3",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )} style={{ transition: "opacity 0.4s ease-out, transform 0.4s ease-out", height: isMobile ? "auto" : "calc(100vh - 64px)" }}>

        {/* Header */}
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border" style={{ contain: "layout style" }}>
          {/* Top shimmer — champagne */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div className="h-full w-1/3 shimmer-line" style={{
              background: "linear-gradient(90deg, transparent, hsl(var(--champagne) / 0.4), transparent)",
            }} />
          </div>

          <div className={cn(
            "flex items-center justify-between",
            isMobile ? "flex-col gap-3 px-4 py-3" : "px-5 py-3"
          )}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={cn("rounded-xl flex items-center justify-center", isMobile ? "w-9 h-9" : "w-10 h-10")} style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(154, 56%, 22%))",
                  boxShadow: "0 0 24px hsl(var(--primary) / 0.2), inset 0 1px 0 hsl(var(--foreground) / 0.1)",
                }}>
                  <Sparkles className={isMobile ? "w-4 h-4 text-primary-foreground" : "w-5 h-5 text-primary-foreground"} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card bg-primary">
                  <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
                </div>
              </div>
              <div>
                <h1 className={cn("font-display font-bold tracking-tight text-foreground", isMobile ? "text-[17px]" : "text-[22px]")} style={{ letterSpacing: "-0.02em" }}>
                  Simulador de Atendimento
                </h1>
                {!isMobile && (
                  <p className="text-[13px] mt-0.5 text-muted-foreground">
                    {modeDescriptions[mode]}
                  </p>
                )}
              </div>
            </div>

            {/* Pill selector */}
            <div className="relative rounded-2xl p-1 bg-muted/30 border border-border/50">
              {/* Active pill slider */}
              <div className="absolute top-1 bottom-1 rounded-xl transition-all duration-350" style={{
                left: `calc(${activeIdx * (100 / 3)}% + 4px)`,
                width: `calc(${100 / 3}% - 6px)`,
                background: "hsl(var(--primary))",
                boxShadow: "0 4px 16px hsl(var(--primary) / 0.3)",
                transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
              }} />
              <div className="relative flex">
                {modeButtons.map(btn => (
                  <button
                    key={btn.id}
                    onClick={() => handleModeSwitch(btn.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl font-semibold z-10 transition-colors duration-200",
                      isMobile ? "px-3 py-2 text-[11px]" : "px-5 py-2.5 text-[13px]",
                      mode === btn.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {btn.id === "chameleon" ? (
                      <span className="text-sm">🦎</span>
                    ) : (
                      <btn.icon className="w-3.5 h-3.5" />
                    )}
                    {btn.id === "chameleon" ? "Camaleão" : btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{
            background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), hsl(var(--champagne) / 0.1), transparent)",
          }} />
        </div>

        {/* Content */}
        <Suspense fallback={<NatLevaLoader />}>
          <div style={{ display: mode === "manual" ? "block" : "none", contain: "layout style" }}>
            <SimuladorManualMode />
          </div>
          {mode === "auto" && <SimuladorAutoMode />}
          {mode === "chameleon" && <SimuladorChameleonMode />}
        </Suspense>
      </div>

      <style>{`
        .shimmer-line {
          animation: shimmer-slide 4s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
