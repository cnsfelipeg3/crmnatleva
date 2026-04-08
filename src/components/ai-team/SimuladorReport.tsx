/**
 * SimuladorReport — Post-simulation visual report
 * Renders after Auto or Chameleon simulations finish
 */

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock, MessageSquare, Users, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, RotateCcw, Download, Shield, User, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENTS_V4 } from "./agentsV4Data";

interface Message {
  role: string;
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp?: number;
}

interface Props {
  messages: Message[];
  agents: string[];
  durationSeconds: number;
  mode: "auto" | "chameleon";
  leadProfile?: {
    nome?: string;
    destino?: string;
    orcamento?: string;
    composicao?: string;
    motivacao?: string;
  };
  onNewSimulation: () => void;
}

export default function SimuladorReport({
  messages, agents, durationSeconds, mode, leadProfile, onNewSimulation,
}: Props) {
  const analysis = useMemo(() => {
    const agentMsgs = messages.filter(m => m.role === "agent" || m.role === "assistant");
    const leadMsgs = messages.filter(m => m.role === "lead" || m.role === "user");
    const totalMsgs = messages.length;

    // Pipeline traversed
    const agentIds = [...new Set(messages.filter(m => m.agentId).map(m => m.agentId!))];
    const agentSequence = agentIds.map(id => {
      const agent = AGENTS_V4.find(a => a.id === id);
      return agent ? { id, name: agent.name, emoji: agent.emoji } : { id, name: id, emoji: "🤖" };
    });

    // Detect result
    const allText = messages.map(m => m.content).join(" ").toLowerCase();
    const hasConversion = /fech|compro|aceito|vamos nessa|quero sim|pode reservar|vamos fechar|confirmar|pago|aceitar/i.test(allText);
    const hasLoss = /não\s*(quero|vou|preciso)|vou\s*pensar|talvez\s*depois|obrigad[ao]\s*mas|desist/i.test(
      leadMsgs.slice(-3).map(m => m.content).join(" ")
    );
    const result: "qualified" | "lost" | "in_progress" = hasConversion
      ? "qualified"
      : hasLoss ? "lost" : "in_progress";

    // Personalization: did agent use lead's info?
    const leadName = leadProfile?.nome || "";
    const leadDest = leadProfile?.destino || "";
    const nameUsed = leadName && agentMsgs.some(m => m.content.toLowerCase().includes(leadName.toLowerCase()));
    const destUsed = leadDest && agentMsgs.some(m => m.content.toLowerCase().includes(leadDest.toLowerCase()));
    const personalizationScore = (nameUsed ? 40 : 0) + (destUsed ? 40 : 0) + (agentMsgs.length > 3 ? 20 : 0);

    // Pipeline adherence: did agents follow correct order?
    const expectedOrder = ["maya", "atlas", "habibi", "nemo", "dante", "luna", "nero", "iris"];
    let adherenceScore = 100;
    for (let i = 1; i < agentIds.length; i++) {
      const prevIdx = expectedOrder.indexOf(agentIds[i - 1]);
      const currIdx = expectedOrder.indexOf(agentIds[i]);
      if (prevIdx >= 0 && currIdx >= 0 && currIdx <= prevIdx) {
        adherenceScore -= 25;
      }
    }
    adherenceScore = Math.max(0, adherenceScore);

    // Detect profile from lead messages
    const detectedProfile: Record<string, string> = {};
    const leadText = leadMsgs.map(m => m.content).join(" ");
    // Destination
    if (/dubai/i.test(leadText)) detectedProfile.destino = "Dubai";
    else if (/europa|paris|roma|madrid|londres/i.test(leadText)) detectedProfile.destino = "Europa";
    else if (/orlando|disney/i.test(leadText)) detectedProfile.destino = "Orlando";
    else if (/maldivas/i.test(leadText)) detectedProfile.destino = "Maldivas";
    else if (leadProfile?.destino) detectedProfile.destino = leadProfile.destino;
    // Budget
    if (/econômic|barato|orçamento\s*apertado/i.test(leadText)) detectedProfile.orcamento = "Econômico";
    else if (/luxo|premium|5\s*estrelas/i.test(leadText)) detectedProfile.orcamento = "Luxo";
    else if (leadProfile?.orcamento) detectedProfile.orcamento = leadProfile.orcamento;
    // Travelers
    if (/casal/i.test(leadText)) detectedProfile.viajantes = "Casal";
    else if (/famíli|filhos/i.test(leadText)) detectedProfile.viajantes = "Família";
    else if (/sozinho|solo/i.test(leadText)) detectedProfile.viajantes = "Solo";
    else if (leadProfile?.composicao) detectedProfile.viajantes = leadProfile.composicao;

    // Attention points
    const attentionPoints: string[] = [];
    if (agentMsgs.some(m => /r\$\s*\d/i.test(m.content))) {
      attentionPoints.push("Agente mencionou valor/preço (regra: só na proposta)");
    }
    if (agentMsgs.some(m => /compre|reserve\s*você|baixe/i.test(m.content))) {
      attentionPoints.push("Agente sugeriu ação manual ao cliente (regra: full service)");
    }
    if (agentMsgs.filter(m => m.content.split(/\s+/).length > 120).length > 0) {
      attentionPoints.push("Respostas excessivamente longas detectadas");
    }

    // Avg response time (simulated)
    const avgResponseTime = durationSeconds > 0 && agentMsgs.length > 0
      ? Math.round(durationSeconds / agentMsgs.length)
      : 0;

    return {
      totalMsgs,
      agentMsgCount: agentMsgs.length,
      leadMsgCount: leadMsgs.length,
      agentSequence,
      result,
      personalizationScore,
      adherenceScore,
      complianceViolations: attentionPoints.length,
      detectedProfile,
      attentionPoints,
      avgResponseTime,
    };
  }, [messages, agents, durationSeconds, leadProfile]);

  const resultConfig = {
    qualified: { label: "Qualificado ✅", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    lost: { label: "Perdido ❌", color: "text-red-400", bg: "bg-red-500/10" },
    in_progress: { label: "Em andamento ⏳", color: "text-amber-400", bg: "bg-amber-500/10" },
  };

  const rc = resultConfig[analysis.result];
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">📊 Relatório da Simulação</h2>
        <Badge variant="outline" className="text-xs">
          {mode === "auto" ? "Modo Automático" : "Modo Camaleão"}
        </Badge>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Clock, label: "Duração", value: formatDuration(durationSeconds), color: "#3B82F6" },
          { icon: MessageSquare, label: "Mensagens", value: `${analysis.agentMsgCount} / ${analysis.leadMsgCount}`, color: "#8B5CF6" },
          { icon: Users, label: "Agentes", value: String(analysis.agentSequence.length), color: "#10B981" },
          { icon: Target, label: "Aderência", value: `${analysis.adherenceScore}%`, color: "#F59E0B" },
          { icon: Shield, label: "Compliance", value: analysis.complianceViolations === 0 ? "✓ OK" : `${analysis.complianceViolations} alertas`, color: analysis.complianceViolations === 0 ? "#10B981" : "#EF4444" },
        ].map(k => (
          <Card key={k.label} className="p-3 glass-card text-center">
            <k.icon className="w-4 h-4 mx-auto mb-1" style={{ color: k.color }} />
            <p className="text-sm font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Result + Pipeline */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className={cn("p-4 glass-card", rc.bg)}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Resultado</h3>
          <p className={cn("text-xl font-bold", rc.color)}>{rc.label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Personalização: {analysis.personalizationScore}% • Tempo médio: {analysis.avgResponseTime}s/msg
          </p>
        </Card>

        <Card className="p-4 glass-card">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Pipeline Percorrido</h3>
          <div className="flex items-center gap-1 flex-wrap">
            {analysis.agentSequence.map((a, i) => (
              <span key={a.id} className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs py-0.5">{a.emoji} {a.name}</Badge>
                {i < analysis.agentSequence.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Quality Analysis + Profile */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 glass-card">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Análise de Qualidade</h3>
          <div className="space-y-2.5">
            {[
              { label: "Aderência ao Script", value: analysis.adherenceScore, color: analysis.adherenceScore >= 80 ? "#10B981" : "#F59E0B" },
              { label: "Personalização", value: analysis.personalizationScore, color: analysis.personalizationScore >= 60 ? "#10B981" : "#F59E0B" },
              { label: "Compliance", value: analysis.complianceViolations === 0 ? 100 : Math.max(0, 100 - analysis.complianceViolations * 30), color: analysis.complianceViolations === 0 ? "#10B981" : "#EF4444" },
            ].map(q => (
              <div key={q.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 shrink-0">{q.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${q.value}%`, background: q.color }} />
                </div>
                <span className="text-xs font-bold w-10 text-right" style={{ color: q.color }}>{q.value}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 glass-card">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Perfil Detectado do Lead
          </h3>
          <div className="space-y-1.5 text-sm">
            {Object.entries(analysis.detectedProfile).length > 0 ? (
              Object.entries(analysis.detectedProfile).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs capitalize w-20">{k}:</span>
                  <Badge variant="outline" className="text-xs">{v}</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Dados insuficientes para detecção</p>
            )}
          </div>
        </Card>
      </div>

      {/* Attention Points */}
      {analysis.attentionPoints.length > 0 && (
        <Card className="p-4 glass-card border-amber-500/20">
          <h3 className="text-xs font-semibold text-amber-400 uppercase mb-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Pontos de Atenção
          </h3>
          <ul className="space-y-1.5">
            {analysis.attentionPoints.map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span> {p}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onNewSimulation} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" /> Nova Simulação
        </Button>
        <Button
          variant="outline"
          onClick={() => alert("Exportação PDF será implementada em breve!")}
        >
          <Download className="w-4 h-4 mr-2" /> Exportar PDF
        </Button>
      </div>
    </div>
  );
}
