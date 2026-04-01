/**
 * Chameleon Debrief Card — Post-session analysis
 * NatLeva v4.3 — Isolated component
 */

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, MessageSquare, Lightbulb } from "lucide-react";
import type { ChameleonDebriefData } from "./chameleonUtils";

interface Props {
  debrief: ChameleonDebriefData;
}

const DIMENSION_LABELS: Record<string, string> = {
  escutaAtiva: "Escuta Ativa",
  memoria: "Memória",
  naturalidade: "Naturalidade",
  valorAgregado: "Valor Agregado",
  inteligenciaEmocional: "Inteligência Emocional",
  eficiencia: "Eficiência",
};

function scoreColor(score: number): string {
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function barColor(score: number): string {
  if (score >= 7) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-500";
  return "bg-red-500";
}

function barBg(score: number): string {
  if (score >= 7) return "bg-emerald-500/15";
  if (score >= 5) return "bg-amber-500/15";
  return "bg-red-500/15";
}

export default function ChameleonDebrief({ debrief }: Props) {
  const { scores, scoreGeral, momentosPositivos, errosCriticos, veredicto, sugestoes } = debrief;

  return (
    <div className="space-y-5">
      {/* Score geral */}
      <div className="rounded-2xl p-6 text-center" style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#94A3B8" }}>
          Score Geral do Camaleão
        </p>
        <p className={cn("text-6xl font-black", scoreColor(scoreGeral))}>
          {scoreGeral.toFixed(1)}
        </p>
        <p className="text-xs mt-2" style={{ color: "#64748B" }}>de 10.0</p>
      </div>

      {/* Dimensões */}
      <div className="rounded-xl p-5" style={{
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: "#E2E8F0" }}>📊 Avaliação por Dimensão</h3>
        <div className="space-y-3">
          {Object.entries(scores).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: "#CBD5E1" }}>
                  {DIMENSION_LABELS[key] || key}
                </span>
                <span className={cn("text-xs font-bold", scoreColor(value))}>{value}/10</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div
                  className={cn("h-full rounded-full transition-all duration-700", barColor(value))}
                  style={{ width: `${(value / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Momentos positivos */}
      {momentosPositivos.length > 0 && (
        <div className="rounded-xl p-5" style={{
          background: "rgba(15,23,42,0.7)",
          border: "1px solid rgba(16,185,129,0.15)",
        }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "#10B981" }}>
            <CheckCircle2 className="w-4 h-4" /> Momentos Positivos
          </h3>
          <div className="space-y-2.5">
            {momentosPositivos.slice(0, 3).map((m, i) => (
              <div key={i} className="rounded-lg p-3" style={{
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.1)",
              }}>
                <p className="text-xs italic mb-1" style={{ color: "#A7F3D0" }}>"{m.frase}"</p>
                <p className="text-[11px]" style={{ color: "#6EE7B7" }}>{m.motivo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Erros críticos */}
      {errosCriticos.length > 0 && (
        <div className="rounded-xl p-5" style={{
          background: "rgba(15,23,42,0.7)",
          border: "1px solid rgba(239,68,68,0.15)",
        }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "#EF4444" }}>
            <XCircle className="w-4 h-4" /> Erros Críticos
          </h3>
          <div className="space-y-2.5">
            {errosCriticos.slice(0, 3).map((m, i) => (
              <div key={i} className="rounded-lg p-3" style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.1)",
              }}>
                <p className="text-xs italic mb-1" style={{ color: "#FCA5A5" }}>"{m.frase}"</p>
                <p className="text-[11px]" style={{ color: "#F87171" }}>{m.motivo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Veredicto */}
      <div className="rounded-xl p-5" style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.85))",
        border: "1px solid rgba(139,92,246,0.2)",
      }}>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "#A78BFA" }}>
          <MessageSquare className="w-4 h-4" /> Veredicto Final
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "#E2E8F0" }}>{veredicto}</p>
      </div>

      {/* Sugestões */}
      {sugestoes.length > 0 && (
        <div className="rounded-xl p-5" style={{
          background: "rgba(15,23,42,0.7)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "#FBBF24" }}>
            <Lightbulb className="w-4 h-4" /> Sugestões de Melhoria
          </h3>
          <div className="space-y-2">
            {sugestoes.map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded" style={{
                  background: "rgba(251,191,36,0.1)",
                  color: "#FBBF24",
                }}>{s.agente}</span>
                <p className="text-xs" style={{ color: "#CBD5E1" }}>{s.sugestao}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
