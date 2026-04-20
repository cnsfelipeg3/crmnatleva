/**
 * Chameleon Configuration Panel
 * NatLeva v4.4 — Theme-aware design (semantic tokens)
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

  const commercialAgents = AGENTS_V4.filter(a => a.squadId === "comercial");

  const toggleAgent = (id: string) =>
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const togglePersonalidade = (p: string) =>
    setCustomPersonalidade(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleStart = () => {
    if (selectedAgents.length === 0) return;
    const profile = generateRandomProfile();

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
      if (ch) profile.personalidade = [ch.name];
    }

    onStart(profile, selectedAgents, maxExchanges, sessionType, sessionType === "challenge" ? selectedChallenge : undefined);
  };

  const typeCards: Array<{ type: SessionType; icon: typeof Dice5; label: string; desc: string }> = [
    { type: "random", icon: Dice5, label: "Aleatório", desc: "Sistema gera tudo" },
    { type: "custom", icon: Target, label: "Personalizado", desc: "Configure alguns campos" },
    { type: "challenge", icon: Skull, label: "Desafio", desc: "Perfis difíceis" },
  ];

  return (
    <div className="space-y-4">
      {/* Session type selector */}
      <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-3")}>
        {typeCards.map(({ type, icon: Icon, label, desc }) => {
          const active = sessionType === type;
          return (
            <button
              key={type}
              onClick={() => setSessionType(type)}
              className={cn(
                "rounded-xl p-4 text-left transition-all border",
                active
                  ? "bg-primary/8 border-primary/40 ring-1 ring-primary/30"
                  : "bg-card border-border hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-2", active ? "text-primary" : "text-muted-foreground")} />
              <p className={cn("text-sm font-bold", active ? "text-primary" : "text-foreground")}>{label}</p>
              <p className="text-[11px] mt-0.5 text-muted-foreground">{desc}</p>
            </button>
          );
        })}
      </div>

      {/* Custom config */}
      {sessionType === "custom" && (
        <div className="rounded-xl p-4 space-y-4 bg-card border border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Configuração Personalizada</p>

          <div>
            <label className="text-[11px] font-semibold block mb-1.5 text-foreground/80">Destino</label>
            <select
              value={customDestino}
              onChange={e => setCustomDestino(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs bg-background text-foreground border border-border focus:border-primary outline-none"
            >
              <option value="">🎲 Aleatório</option>
              {AVAILABLE_DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold block mb-1.5 text-foreground/80">Personalidade</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PERSONALITIES.map(p => {
                const on = customPersonalidade.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePersonalidade(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border",
                      on
                        ? "bg-primary/10 text-primary border-primary/40"
                        : "bg-muted/30 text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
                    )}
                  >{p}</button>
                );
              })}
            </div>
          </div>

          <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-2")}>
            <div>
              <label className="text-[11px] font-semibold block mb-1.5 text-foreground/80">Composição</label>
              <select
                value={customComposicao}
                onChange={e => setCustomComposicao(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs bg-background text-foreground border border-border focus:border-primary outline-none"
              >
                <option value="">🎲 Aleatório</option>
                {AVAILABLE_COMPOSITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1.5 text-foreground/80">Orçamento</label>
              <select
                value={customOrcamento}
                onChange={e => setCustomOrcamento(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs bg-background text-foreground border border-border focus:border-primary outline-none"
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
        <div className="rounded-xl p-4 space-y-3 bg-card border border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-destructive">Perfis Desafio</p>
          <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2")}>
            {CHALLENGE_PROFILES.map(ch => {
              const active = selectedChallenge === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChallenge(ch.id)}
                  className={cn(
                    "rounded-lg p-3 text-left transition-all border",
                    active
                      ? "bg-destructive/8 border-destructive/40 ring-1 ring-destructive/30"
                      : "bg-muted/20 border-border hover:border-destructive/30"
                  )}
                >
                  <span className="text-lg">{ch.emoji}</span>
                  <p className={cn("text-xs font-bold mt-1", active ? "text-destructive" : "text-foreground")}>{ch.name}</p>
                  <p className="text-[10px] mt-0.5 text-muted-foreground">{ch.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Agent selection */}
      <div className="rounded-xl p-4 bg-card border border-border">
        <p className="text-xs font-bold uppercase tracking-wider mb-3 text-foreground/70">Agentes Testados</p>
        <div className="flex flex-wrap gap-2">
          {commercialAgents.map(a => {
            const on = selectedAgents.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleAgent(a.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  on
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-muted/30 text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
                )}
              >
                {a.emoji} {a.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Max exchanges */}
      <div className="rounded-xl p-4 bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/70">Máximo de Trocas</p>
          <span className="text-sm font-mono font-bold text-primary">{maxExchanges}</span>
        </div>
        <input
          type="range"
          min={10}
          max={40}
          value={maxExchanges}
          onChange={e => setMaxExchanges(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
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
          "bg-primary text-primary-foreground shadow-md hover:shadow-lg",
          loading || selectedAgents.length === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-primary/90"
        )}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {loading ? "Preparando sessão..." : "Iniciar Sessão"}
      </button>
    </div>
  );
}
