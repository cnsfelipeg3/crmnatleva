import { useState, useEffect, lazy, Suspense, memo } from "react";
import { MessageSquare, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const SimuladorAutoMode = lazy(() => import("@/components/ai-team/SimuladorAutoMode"));
const SimuladorManualMode = lazy(() => import("@/components/ai-team/SimuladorManualMode"));

type Mode = "manual" | "auto";

const LoadingFallback = memo(() => (
  <div className="flex items-center justify-center py-32">
    <div className="flex flex-col items-center gap-3">
      <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-medium" style={{ color: "#64748B" }}>Carregando simulador…</span>
    </div>
  </div>
));
LoadingFallback.displayName = "LoadingFallback";

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

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#060A12", contain: "layout style paint" }}>
      {/* Lightweight ambient — no blur, GPU-composited */}
      <div className="absolute inset-0 pointer-events-none" style={{ contain: "strict" }}>
        <div className="absolute rounded-full" style={{
          width: isMobile ? 250 : 400, height: isMobile ? 250 : 400,
          left: "10%", top: "-5%",
          background: "radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)",
          willChange: "transform", transform: "translateZ(0)",
        }} />
        <div className="absolute rounded-full" style={{
          width: isMobile ? 200 : 350, height: isMobile ? 200 : 350,
          left: "75%", top: "5%",
          background: "radial-gradient(circle, rgba(139,92,246,0.05), transparent 70%)",
          willChange: "transform", transform: "translateZ(0)",
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.012) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }} />
      </div>

      <div className={cn(
        "relative z-10 space-y-3 mx-auto",
        isMobile ? "p-3 pb-6" : "p-3 px-4",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )} style={{ transition: "opacity 0.4s ease-out, transform 0.4s ease-out" }}>

        {/* Header */}
        <div className="relative rounded-2xl overflow-hidden" style={{
          background: "linear-gradient(135deg, #0A1628 0%, #0D1B2A 50%, #0A1628 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          contain: "layout style",
        }}>
          {/* Top shimmer — CSS-only */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div className="h-full w-1/3 shimmer-line" style={{
              background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)",
            }} />
          </div>

          <div className={cn(
            "flex items-center justify-between",
            isMobile ? "flex-col gap-3 px-4 py-3" : "px-5 py-3"
          )}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={cn("rounded-2xl flex items-center justify-center", isMobile ? "w-10 h-10" : "w-12 h-12")} style={{
                  background: "linear-gradient(135deg, #10B981, #06B6D4)",
                  boxShadow: "0 0 24px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}>
                  <Sparkles className={isMobile ? "w-4 h-4 text-white" : "w-5 h-5 text-white"} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "#10B981", borderColor: "#0A1628" }}>
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#10B981", opacity: 0.4 }} />
                </div>
              </div>
              <div>
                <h1 className={cn("font-bold tracking-tight", isMobile ? "text-[17px]" : "text-[22px]")} style={{ color: "#F8FAFC", letterSpacing: "-0.03em" }}>
                  Simulador de Atendimento
                </h1>
                {!isMobile && (
                  <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>
                    {mode === "manual"
                      ? "Converse em tempo real com qualquer dos 21 agentes IA"
                      : "Teste de estresse automático com IA juiz e múltiplos perfis"}
                  </p>
                )}
              </div>
            </div>

            {/* Pill selector */}
            <div className="relative rounded-2xl p-1" style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div className="absolute top-1 bottom-1 rounded-xl" style={{
                left: mode === "manual" ? "4px" : "calc(50% + 2px)",
                width: "calc(50% - 6px)",
                background: mode === "manual"
                  ? "linear-gradient(135deg, #10B981, #059669)"
                  : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                boxShadow: mode === "manual"
                  ? "0 4px 16px rgba(16,185,129,0.3)"
                  : "0 4px 16px rgba(139,92,246,0.3)",
                transition: "left 0.35s cubic-bezier(0.4,0,0.2,1), background 0.35s ease, box-shadow 0.35s ease",
              }} />
              <div className="relative flex">
                <button onClick={() => handleModeSwitch("manual")}
                  className={cn("flex items-center gap-1.5 rounded-xl font-bold z-10", isMobile ? "px-4 py-2 text-[12px]" : "px-6 py-2.5 text-[13px]")}
                  style={{ color: mode === "manual" ? "#fff" : "#64748B", transition: "color 0.25s ease" }}>
                  <MessageSquare className="w-3.5 h-3.5" /> Manual
                </button>
                <button onClick={() => handleModeSwitch("auto")}
                  className={cn("flex items-center gap-1.5 rounded-xl font-bold z-10", isMobile ? "px-4 py-2 text-[12px]" : "px-6 py-2.5 text-[13px]")}
                  style={{ color: mode === "auto" ? "#fff" : "#64748B", transition: "color 0.25s ease" }}>
                  <Zap className="w-3.5 h-3.5" /> Automático
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.12), rgba(139,92,246,0.12), transparent)" }} />
        </div>

        {/* Content — lazy loaded, no key remount */}
        <Suspense fallback={<LoadingFallback />}>
          <div style={{ display: mode === "manual" ? "block" : "none", contain: "layout style" }}>
            <SimuladorManualMode />
          </div>
          {mode === "auto" && <SimuladorAutoMode />}
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
