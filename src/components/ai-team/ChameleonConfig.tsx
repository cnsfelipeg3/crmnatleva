/**
 * Chameleon Configuration Panel
 * NatLeva v4.3 — Isolated component
 */

import { useState } from "react";
import { Dice5, Target, Skull, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import {
  generateRandomProfile,
  CHALLENGE_PROFILES,
  AVAILABLE_DESTINATIONS,
  AVAILABLE_PERSONALITIES,
  AVAILABLE_COMPOSITIONS,
  BUDGET_OPTIONS,
  type ChameleonProfile,
  type ChallengeProfile,
} from "./chameleonUtils";

export type SessionType = "random" | "custom" | "challenge";

interface Props {
  onStart: (profile: ChameleonProfile, agents: string[], maxExchanges: number, sessionType: SessionType, challengeId?: string) => void;
  loading?: boolean;
}

export default function ChameleonConfig({ onStart, loading }: Props) {
  const isMobile = useIsMobile();
  const [sessionType, setSessionType] = useState<SessionType>("random");
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["maya", "atlas"]);
  const [maxExchanges, setMaxExchanges] = useState(20);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("fantasma");

  // Custom config
  const [customDestino, setCustomDestino] = useState("");
  const [customPersonalidade, setCustomPersonalidade] = useState<string[]>([]);
  const [customComposicao, setCustomComposicao] = useState("");
  const [customOrcamento, setCustomOrcamento] = useState("");
  const [customDificuldade, setCustomDificuldade] = useState("médio");

  const commercialAgents = AGENTS_V4.filter(a => a.squadId === "comercial");

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const togglePersonalidade = (p: string) => {
    setCustomPersonalidade(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleStart = () => {
    if (selectedAgents.length === 0) return;

    let profile = generateRandomProfile();

    if (sessionType === "custom") {
      if (customDestino) profile.destino = customDestino;
      if (customPersonalidade.length > 0) profile.personalidade = customPersonalidade;
      if (customComposicao) {
        profile.composicao = customComposicao;
        profile.composicaoLabel = customComposicao;
      }
      if (customOrcamento) {
        profile.orcamento = customOrcamento;
        profile.orcamentoLabel = customOrcamento;
      }
    }

    if (sessionType === "challenge") {
      const ch = CHALLENGE_PROFILES.find(c => c.id === selectedChallenge);
      if (ch) {
        // Use challenge personality traits
        profile.personalidade = [ch.name];
      }
    }

    onStart(profile, selectedAgents, maxExchanges, sessionType, sessionType === "challenge" ? selectedChallenge : undefined);
  };

  const typeCards: Array<{ type: SessionType; icon: typeof Dice5; label: string; desc: string; color: string }> = [
    { type: "random", icon: Dice5, label: "Aleatório", desc: "Sistema gera tudo", color: "#10B981" },
    { type: "custom", icon: Target, label: "Personalizado", desc: "Configure alguns campos", color: "#3B82F6" },
    { type: "challenge", icon: Skull, label: "Desafio", desc: "Perfis difíceis", color: "#EF4444" },
  ];

  return (
    <div className="space-y-5">
      {/* Session type selector */}
      <div className="grid grid-cols-3 gap-3">
        {typeCards.map(({ type, icon: Icon, label, desc, color }) => (
          <button
            key={type}
            onClick={() => setSessionType(type)}
            className={cn(
              "rounded-xl p-4 text-left transition-all",
                  sessionType === type ? "scale-[1.02]" : "hover:scale-[1.01]"
                )}
                style={{
                  background: sessionType === type
                    ? `linear-gradient(135deg, ${color}15, ${color}08)`
                    : "rgba(15,23,42,0.6)",
                  border: `1px solid ${sessionType === type ? color + "40" : "rgba(255,255,255,0.06)"}`,
                  boxShadow: sessionType === type ? `0 0 0 2px ${color}50` : "none",
            }}
          >
            <Icon className="w-5 h-5 mb-2" style={{ color }} />
            <p className="text-sm font-bold" style={{ color: "#E2E8F0" }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#64748B" }}>{desc}</p>
          </button>
        ))}
      </div>

      {/* Custom config */}
      {sessionType === "custom" && (
        <div className="rounded-xl p-4 space-y-4" style={{
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(59,130,246,0.15)",
        }}>
          <p className="text-xs font-bold" style={{ color: "#93C5FD" }}>Configuração Personalizada</p>

          <div>
            <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Destino</label>
            <select
              value={customDestino}
              onChange={e => setCustomDestino(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(0,0,0,0.3)", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <option value="">🎲 Aleatório</option>
              {AVAILABLE_DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Personalidade</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PERSONALITIES.map(p => (
                <button
                  key={p}
                  onClick={() => togglePersonalidade(p)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                    customPersonalidade.includes(p)
                      ? "text-white"
                      : "hover:opacity-80"
                  )}
                  style={{
                    background: customPersonalidade.includes(p) ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${customPersonalidade.includes(p) ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)"}`,
                    color: customPersonalidade.includes(p) ? "#93C5FD" : "#94A3B8",
                  }}
                >{p}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Composição</label>
              <select
                value={customComposicao}
                onChange={e => setCustomComposicao(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs"
                style={{ background: "rgba(0,0,0,0.3)", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <option value="">🎲 Aleatório</option>
                {AVAILABLE_COMPOSITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1.5" style={{ color: "#94A3B8" }}>Orçamento</label>
              <select
                value={customOrcamento}
                onChange={e => setCustomOrcamento(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs"
                style={{ background: "rgba(0,0,0,0.3)", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <option value="">🎲 Aleatório</option>
                {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Challenge config */}
      {sessionType === "challenge" && (
        <div className="rounded-xl p-4 space-y-3" style={{
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(239,68,68,0.15)",
        }}>
          <p className="text-xs font-bold" style={{ color: "#FCA5A5" }}>Perfis Desafio</p>
          <div className="grid grid-cols-2 gap-2">
            {CHALLENGE_PROFILES.map(ch => (
              <button
                key={ch.id}
                onClick={() => setSelectedChallenge(ch.id)}
                className="rounded-lg p-3 text-left transition-all"
                style={{
                  background: selectedChallenge === ch.id ? "rgba(239,68,68,0.08)" : "rgba(0,0,0,0.2)",
                  border: `1px solid ${selectedChallenge === ch.id ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.05)"}`,
                  boxShadow: selectedChallenge === ch.id ? "0 0 0 1px rgba(239,68,68,0.4)" : "none",
                }}
              >
                <span className="text-lg">{ch.emoji}</span>
                <p className="text-xs font-bold mt-1" style={{ color: "#E2E8F0" }}>{ch.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#64748B" }}>{ch.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent selection */}
      <div className="rounded-xl p-4" style={{
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p className="text-xs font-bold mb-3" style={{ color: "#94A3B8" }}>Agentes Testados</p>
        <div className="flex flex-wrap gap-2">
          {commercialAgents.map(a => (
            <button
              key={a.id}
              onClick={() => toggleAgent(a.id)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                selectedAgents.includes(a.id)
                  ? "text-white"
                  : ""
              )}
              style={{
                background: selectedAgents.includes(a.id) ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selectedAgents.includes(a.id) ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: selectedAgents.includes(a.id) ? "#C4B5FD" : "#64748B",
              }}
            >
              {a.emoji} {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Max exchanges */}
      <div className="rounded-xl p-4" style={{
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold" style={{ color: "#94A3B8" }}>Máximo de Trocas</p>
          <span className="text-xs font-mono font-bold" style={{ color: "#A78BFA" }}>{maxExchanges}</span>
        </div>
        <input
          type="range"
          min={10}
          max={40}
          value={maxExchanges}
          onChange={e => setMaxExchanges(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-[10px] mt-1" style={{ color: "#475569" }}>
          <span>10</span>
          <span>40</span>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={loading || selectedAgents.length === 0}
        className={cn(
          "w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
          loading || selectedAgents.length === 0 ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.01]"
        )}
        style={{
          background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
          color: "#fff",
          boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
        }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {loading ? "Preparando sessão..." : "Iniciar Sessão"}
      </button>
    </div>
  );
}
