import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, Send, FileText, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Message {
  text: string;
  sender_type: "cliente" | "atendente" | "sistema";
  created_at?: string;
}

interface BuyingMomentAlertProps {
  messages: Message[];
  onGenerateProposal: () => void;
  onDismiss: () => void;
}

// Buying signal patterns with weights
const BUYING_SIGNALS: { pattern: RegExp; weight: number; label: string }[] = [
  // Direct closing signals (high weight)
  { pattern: /\b(podemos?\s+fechar|vamos?\s+fechar|quero\s+fechar|fecha\s+p(ra|ara)\s+mim)\b/i, weight: 30, label: "Intenção de fechamento" },
  { pattern: /\b(pode\s+reservar|reserva\s+p(ra|ara)\s+mim|quero\s+reservar|faz\s+a\s+reserva)\b/i, weight: 28, label: "Pedido de reserva" },
  { pattern: /\b(como\s+fa[çc]o\s+p(ra|ara)\s+pagar|forma\s+de\s+pagamento|parcela(r|mento)?|pix|cart[aã]o)\b/i, weight: 25, label: "Interesse em pagamento" },
  
  // Strong interest signals
  { pattern: /\b(quanto\s+(fica(ria)?|custa|sai)|qual\s+o?\s*(valor|pre[çc]o)|me\s+passa\s+o\s+valor)\b/i, weight: 20, label: "Pedido de preço" },
  { pattern: /\b(tem\s+disponibilidade|tem\s+vaga|ainda\s+tem|est[aá]\s+dispon[ií]vel)\b/i, weight: 18, label: "Verificação de disponibilidade" },
  { pattern: /\b(manda\s+a?\s*proposta|envia\s+a?\s*proposta|me\s+envia|pode\s+mandar)\b/i, weight: 22, label: "Pedido de proposta" },

  // Medium interest signals
  { pattern: /\b(gostei|adorei|amei|perfeito|maravilh|incr[ií]vel|lindo)\b/i, weight: 12, label: "Aprovação emocional" },
  { pattern: /\b(faz\s+sentido|parece\s+bom|t[aá]\s+[oó]timo|show|top|massa)\b/i, weight: 10, label: "Validação positiva" },
  { pattern: /\b(quando\s+preciso\s+(pagar|decidir)|at[eé]\s+quando|prazo)\b/i, weight: 15, label: "Urgência temporal" },
  { pattern: /\b(j[aá]\s+decidi|vou\s+querer|pode\s+confirmar|confirma\s+p(ra|ara)\s+mim)\b/i, weight: 28, label: "Decisão tomada" },

  // Soft signals
  { pattern: /\b(inclui\s+o?\s*que|o\s+que\s+(est[aá]\s+inclu[ií]do|vem\s+junto))\b/i, weight: 8, label: "Detalhamento" },
  { pattern: /\b(meu\s+(marido|esposa|namorad|fam[ií]lia)\s+(gostou|aprovou|concordou))\b/i, weight: 15, label: "Aprovação familiar" },
];

const THRESHOLD = 25; // Minimum score to trigger alert

export function BuyingMomentAlert({ messages, onGenerateProposal, onDismiss }: BuyingMomentAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const [lastDismissedAt, setLastDismissedAt] = useState<number>(0);

  // Analyze only the last N client messages
  const analysis = useMemo(() => {
    const recentClientMsgs = messages
      .filter(m => m.sender_type === "cliente" && m.text)
      .slice(-8);

    if (recentClientMsgs.length === 0) return { score: 0, signals: [] as string[], topSignal: "" };

    let totalScore = 0;
    const detectedSignals: string[] = [];

    // Weight recent messages more heavily
    recentClientMsgs.forEach((msg, idx) => {
      const recencyMultiplier = 0.5 + (idx / recentClientMsgs.length) * 0.5; // 0.5 to 1.0
      
      BUYING_SIGNALS.forEach(signal => {
        if (signal.pattern.test(msg.text)) {
          const weighted = signal.weight * recencyMultiplier;
          totalScore += weighted;
          if (!detectedSignals.includes(signal.label)) {
            detectedSignals.push(signal.label);
          }
        }
      });
    });

    // Check if the last message is from the client (more relevant)
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.sender_type === "cliente") {
      totalScore *= 1.3; // Boost if last message is from client
    }

    return {
      score: Math.round(totalScore),
      signals: detectedSignals.slice(0, 3),
      topSignal: detectedSignals[detectedSignals.length - 1] || "",
    };
  }, [messages]);

  // Reset dismissed when new messages arrive
  useEffect(() => {
    const now = Date.now();
    if (now - lastDismissedAt > 60000) { // Re-show after 60s if new signals
      setDismissed(false);
    }
  }, [messages.length, lastDismissedAt]);

  const shouldShow = analysis.score >= THRESHOLD && !dismissed;

  const handleDismiss = () => {
    setDismissed(true);
    setLastDismissedAt(Date.now());
    onDismiss();
  };

  const intensity = analysis.score >= 50 ? "critical" : analysis.score >= 35 ? "high" : "medium";

  const intensityConfig = {
    critical: {
      bg: "bg-red-500/10 border-red-500/30",
      icon: "text-red-500",
      label: "Momento crítico de decisão",
      pulse: true,
    },
    high: {
      bg: "bg-amber-500/10 border-amber-500/30",
      icon: "text-amber-500",
      label: "Cliente em momento de decisão",
      pulse: true,
    },
    medium: {
      bg: "bg-primary/10 border-primary/30",
      icon: "text-primary",
      label: "Sinais de interesse detectados",
      pulse: false,
    },
  };

  const config = intensityConfig[intensity];

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className={`px-4 py-3 border-t ${config.bg} relative`}>
            {/* Dismiss */}
            <button onClick={handleDismiss} className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="relative shrink-0">
                <Flame className={`h-5 w-5 ${config.icon}`} />
                {config.pulse && (
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={`absolute inset-0 rounded-full ${intensity === "critical" ? "bg-red-500/30" : "bg-amber-500/30"}`}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-foreground">{config.label}</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                    Score {analysis.score}
                  </Badge>
                </div>

                {/* Detected signals */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {analysis.signals.map((signal, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 bg-background/50">
                      {signal}
                    </Badge>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] px-3 gap-1"
                    onClick={(e) => { e.stopPropagation(); onGenerateProposal(); }}
                  >
                    <Sparkles className="h-3 w-3" />
                    Gerar Proposta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] px-3 gap-1"
                    onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                  >
                    <FileText className="h-3 w-3" />
                    Já tenho proposta
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
