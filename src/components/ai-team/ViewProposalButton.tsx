/**
 * ViewProposalButton
 * Renders a "Visualizar Proposta" button for the simulator side panel.
 * Behavior:
 *  - Click → if a proposal already exists for this simulator session, opens it
 *    in a new tab. Otherwise calls the `simulator-create-proposal` edge function
 *    to extract the brief from the transcript, create a draft proposal, then
 *    opens it in a new tab.
 *  - The session→proposal mapping is cached in localStorage so that re-clicking
 *    always reopens the same proposal.
 *  - Disabled until there is enough conversation context (>= 4 messages).
 */
import { useState, useCallback, useMemo } from "react";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "natleva.simulator.proposalCache.v1";

type Cache = Record<string, string>; // sessionId → proposalId

function readCache(): Cache {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeCache(c: Cache) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* noop */ }
}

export interface ViewProposalButtonProps {
  /** Stable identifier for this simulator session (Manual: sessionId; Auto: lead.id; Chameleon: profile id+startTs) */
  sessionId: string;
  /** Which simulator originated the call */
  mode: "manual" | "auto" | "chameleon";
  /** Conversation messages (will be normalized server-side) */
  messages: Array<{ role: string; content: string; agentName?: string }>;
  /** Active agent name (for context) */
  agentName?: string;
  /** Optional destination hint (selected destino in the UI) */
  destinoHint?: string;
  /** Free-text context appended to the AI prompt */
  simulatorContext?: string;
  /** Visual variant */
  variant?: "full" | "compact";
  className?: string;
  /** Minimum messages to enable. Default 4. */
  minMessages?: number;
}

export default function ViewProposalButton({
  sessionId,
  mode,
  messages,
  agentName,
  destinoHint,
  simulatorContext,
  variant = "full",
  className,
  minMessages = 4,
}: ViewProposalButtonProps) {
  const [loading, setLoading] = useState(false);
  const cached = useMemo(() => readCache()[sessionId], [sessionId, loading]);
  const enabled = messages.length >= minMessages || !!cached;

  const handleClick = useCallback(async () => {
    if (!enabled || loading) return;

    // Fast path: reopen cached proposal
    if (cached) {
      window.open(`/propostas/${cached}`, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-create-proposal`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          sessionId,
          mode,
          agentName,
          destinoHint,
          simulatorContext,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            agentName: m.agentName,
          })),
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const msg =
          resp.status === 429
            ? "IA temporariamente indisponível. Aguarde alguns segundos."
            : resp.status === 402
              ? "Créditos da IA esgotados."
              : data?.error || "Falha ao gerar proposta";
        toast({ title: "Erro", description: msg, variant: "destructive" });
        return;
      }

      const data = await resp.json();
      const proposalId = data.proposalId as string;
      if (!proposalId) {
        toast({ title: "Erro", description: "Resposta inválida do servidor", variant: "destructive" });
        return;
      }

      const cache = readCache();
      cache[sessionId] = proposalId;
      writeCache(cache);

      toast({
        title: data.reused ? "Proposta reaberta" : "Proposta criada!",
        description: data.reused ? "Abrindo em nova aba…" : "Briefing extraído da conversa. Abrindo em nova aba…",
      });
      window.open(`/propostas/${proposalId}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[ViewProposalButton] error", err);
      toast({
        title: "Erro inesperado",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [enabled, loading, cached, sessionId, mode, agentName, destinoHint, simulatorContext, messages]);

  const tooltip = !enabled
    ? `Converse pelo menos ${minMessages} mensagens para gerar a proposta`
    : cached
      ? "Abrir proposta deste lead em nova aba"
      : "Extrair briefing da conversa e criar proposta";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!enabled || loading}
        title={tooltip}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all",
          "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-700",
          "hover:from-emerald-700 hover:to-teal-700 hover:shadow-md shadow-sm shadow-emerald-500/30",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className,
        )}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : cached ? <ExternalLink className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
        <span>{loading ? "Gerando..." : cached ? "Ver Proposta" : "Visualizar Proposta"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!enabled || loading}
      title={tooltip}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[12px] font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
        "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-700/60",
        "hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/40",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
        className,
      )}
      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Gerando proposta...
        </>
      ) : cached ? (
        <>
          <ExternalLink className="w-4 h-4" />
          Abrir Proposta
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Visualizar Proposta
        </>
      )}
    </button>
  );
}
