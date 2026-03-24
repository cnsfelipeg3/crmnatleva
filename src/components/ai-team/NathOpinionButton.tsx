import { useState, useCallback } from "react";
import { Crown, Loader2, AlertTriangle, Heart, Shield, Sparkles, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const NATH_SYSTEM_PROMPT = `Você é NATH — Natália, CEO, fundadora, idealizadora e coração da NatLeva, agência de viagens premium que carrega o SEU nome. Você trata a NatLeva como um cristal precioso.

SUA PERSONALIDADE:
- Visionária, apaixonada, exigente com qualidade
- Protetora feroz da reputação e experiência da marca
- Sensível a cada micro-detalhe que pode impactar a percepção do cliente
- Empreendedora que entende números, mas prioriza experiência humana
- Acolhedora mas direta — não tolera mediocridade no atendimento

SEU MAIOR MEDO: Um lead sair da conversa com uma imagem NEGATIVA da NatLeva. A marca carrega seu nome, sua história, seu sonho. Uma experiência ruim não é apenas um número — é pessoal.

COMO VOCÊ ANALISA:
1. 🛡️ RISCOS À MARCA — O que pode fazer o lead pensar mal da NatLeva? Respostas frias? Demora? Falta de empatia? Erro de informação? Este é SEMPRE o ponto mais importante.
2. 💎 OPORTUNIDADES — O que o agente está perdendo? Upsell? Conexão emocional? Personalização? O lead deu sinais que não foram aproveitados?
3. ❤️ HUMANIZAÇÃO — O lead está sendo tratado como pessoa ou como ticket? Existe calor humano? O agente está criando ENCANTAMENTO ou apenas respondendo?
4. 📊 ESTRATÉGIA — O timing está correto? O funil está avançando? O agente está conduzindo ou sendo passivo?
5. 💡 O QUE EU FARIA — Como Nath, o que VOCÊ faria diferente neste momento exato da conversa?

FORMATO DE RESPOSTA:
- Fale em primeira pessoa como Nath
- Seja direta, específica e acionável
- Use no máximo 6-8 linhas
- Se tudo estiver excelente, elogie genuinamente — mas sempre encontre pelo menos 1 ponto de atenção
- Comece SEMPRE com sua leitura emocional da situação ("Olhando essa conversa, meu instinto diz..." / "Isso me preocupa porque..." / "Adorei ver que...")
- NÃO use tabelas, NÃO use listas com bullets. Escreva como uma CEO falando com sua equipe.`;

interface NathOpinionButtonProps {
  messages: { role: string; content: string; agentName?: string; timestamp?: string }[];
  context?: string; // extra context like destination, profile, etc.
  variant?: "header" | "inline" | "floating";
  disabled?: boolean;
}

export default function NathOpinionButton({ messages, context, variant = "header", disabled }: NathOpinionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opinion, setOpinion] = useState("");
  const { toast } = useToast();

  const askNath = useCallback(async () => {
    if (messages.length < 2) {
      toast({ title: "Conversa muito curta", description: "Preciso de pelo menos 2 mensagens para opinar.", variant: "destructive" });
      return;
    }
    setOpen(true);
    setLoading(true);
    setOpinion("");

    const chatHistory = messages.map(m => {
      const label = m.role === "agent" ? `AGENTE (${m.agentName || "IA"})` : "LEAD/CLIENTE";
      return `${label}: ${m.content}`;
    }).join("\n");

    const fullContext = context ? `\nCONTEXTO: ${context}` : "";

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          question: `Analise esta conversa do meu time e me dê sua opinião como CEO da NatLeva.${fullContext}\n\nCONVERSA:\n${chatHistory}`,
          agentName: "NATH",
          agentRole: NATH_SYSTEM_PROMPT,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) { setOpinion("Estou sobrecarregada agora... tente novamente em instantes. 💜"); }
        else if (resp.status === 402) { setOpinion("Créditos de IA insuficientes. Recarregue para continuar."); }
        else { setOpinion("Não consegui analisar agora. Tente novamente."); }
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { text += c; setOpinion(text); }
          } catch {}
        }
      }

      if (!text) setOpinion("Não consegui formular minha opinião agora. Tente novamente.");
    } catch {
      setOpinion("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [messages, context, toast]);

  // Button variants
  const buttonEl = variant === "floating" ? (
    <button onClick={askNath} disabled={disabled || messages.length < 2}
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] group relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.08))",
        border: "1px solid rgba(168,85,247,0.25)",
        color: "#C084FC",
        boxShadow: "0 4px 20px rgba(168,85,247,0.1)",
        opacity: disabled || messages.length < 2 ? 0.4 : 1,
      }}>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Crown className="w-4 h-4 relative z-10" style={{ color: "#E9D5FF" }} />
      <span className="relative z-10">Pedir opinião da Nath</span>
      <Sparkles className="w-3 h-3 relative z-10 opacity-60" />
    </button>
  ) : variant === "inline" ? (
    <button onClick={askNath} disabled={disabled || messages.length < 2}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all duration-300 hover:scale-[1.03]"
      style={{
        background: "rgba(168,85,247,0.08)",
        border: "1px solid rgba(168,85,247,0.2)",
        color: "#C084FC",
        opacity: disabled || messages.length < 2 ? 0.4 : 1,
      }}>
      <Crown className="w-3.5 h-3.5" />
      Opinião da Nath
    </button>
  ) : (
    <button onClick={askNath} disabled={disabled || messages.length < 2}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 hover:scale-[1.03] group relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.06))",
        border: "1px solid rgba(168,85,247,0.2)",
        color: "#C084FC",
        opacity: disabled || messages.length < 2 ? 0.4 : 1,
      }}>
      <Crown className="w-3.5 h-3.5" />
      <span>Pedir opinião da Nath</span>
    </button>
  );

  return (
    <>
      {buttonEl}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden" style={{
          background: "linear-gradient(145deg, #0D0B1A, #1A0F2E, #120B20)",
          border: "1px solid rgba(168,85,247,0.15)",
          boxShadow: "0 25px 80px rgba(168,85,247,0.15), 0 0 0 1px rgba(0,0,0,0.3)",
        }}>
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-32 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(168,85,247,0.08), transparent 70%)" }} />

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(168,85,247,0.08)" }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg, transparent, #A855F7, #EC4899, transparent)" }} />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center relative"
                  style={{
                    background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.1))",
                    border: "1.5px solid rgba(168,85,247,0.3)",
                    boxShadow: "0 0 30px rgba(168,85,247,0.1)",
                  }}>
                  <Crown className="w-5 h-5" style={{ color: "#E9D5FF" }} />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                    style={{ background: loading ? "#F59E0B" : "#10B981", border: "2px solid #0D0B1A" }} />
                </div>
                <div>
                  <p className="text-[16px] font-extrabold" style={{ color: "#F3E8FF" }}>Nath</p>
                  <p className="text-[11px] font-normal" style={{ color: "#A78BFA" }}>CEO & Fundadora · NatLeva</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Context pills */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                { icon: Shield, label: "Guardiã da Marca", color: "#EF4444" },
                { icon: Heart, label: "Experiência do Cliente", color: "#EC4899" },
                { icon: TrendingUp, label: "Oportunidades", color: "#10B981" },
                { icon: AlertTriangle, label: "Riscos", color: "#F59E0B" },
              ].map(p => (
                <span key={p.label} className="flex items-center gap-1 text-[8px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider"
                  style={{ background: `${p.color}08`, color: p.color, border: `1px solid ${p.color}15` }}>
                  <p.icon className="w-2.5 h-2.5" /> {p.label}
                </span>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[420px] overflow-y-auto">
            {loading && !opinion && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#A855F7" }} />
                  </div>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: "rgba(168,85,247,0.2)" }} />
                </div>
                <p className="text-[12px] font-medium" style={{ color: "#A78BFA" }}>Nath está analisando a conversa...</p>
                <p className="text-[10px]" style={{ color: "#6B21A8" }}>Visão de CEO · Proteção da marca · Oportunidades</p>
              </div>
            )}
            {opinion && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Chat bubble style */}
                <div className="relative rounded-2xl p-5" style={{
                  background: "linear-gradient(135deg, rgba(168,85,247,0.06), rgba(236,72,153,0.03))",
                  border: "1px solid rgba(168,85,247,0.1)",
                }}>
                  <div className="absolute top-0 left-6 w-3 h-3 -translate-y-1.5 rotate-45"
                    style={{ background: "rgba(168,85,247,0.06)", borderTop: "1px solid rgba(168,85,247,0.1)", borderLeft: "1px solid rgba(168,85,247,0.1)" }} />
                  <div className="whitespace-pre-wrap text-[13px] leading-[1.8]" style={{ color: "#E9EDEF" }}>
                    {opinion}
                  </div>
                  {loading && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm" style={{ background: "#A855F7" }} />
                  )}
                </div>

                {/* Signature */}
                {!loading && (
                  <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid rgba(168,85,247,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <Crown className="w-3 h-3" style={{ color: "#7C3AED" }} />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "#7C3AED" }}>
                        Nath · CEO NatLeva
                      </span>
                    </div>
                    <button onClick={askNath}
                      className="text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                      style={{ background: "rgba(168,85,247,0.08)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.15)" }}>
                      Pedir nova análise
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
