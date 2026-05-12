import { useEffect, useState } from "react";
import { Bot, Pause, Play, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AgentKey = "maya" | "atlas" | null;

interface AutopilotState {
  enabled: boolean;
  agent: AgentKey;
  pausedUntil: string | null;
}

interface Props {
  conversationId: string | null | undefined;
  conversationPhone?: string | null;
  className?: string;
}

const AGENT_LABELS: Record<NonNullable<AgentKey>, string> = {
  maya: "Maya · Acolhimento",
  atlas: "Atlas · Qualificação SDR",
};

export default function AutopilotControl({ conversationId, conversationPhone, className }: Props) {
  const [state, setState] = useState<AutopilotState>({ enabled: false, agent: null, pausedUntil: null });
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega estado inicial + allowlist
  useEffect(() => {
    if (!conversationId) {
      setState({ enabled: false, agent: null, pausedUntil: null });
      return;
    }
    let alive = true;
    (async () => {
      const [{ data: conv }, { data: cfg }] = await Promise.all([
        supabase
          .from("conversations")
          .select("ai_autopilot_enabled, ai_autopilot_agent, ai_autopilot_paused_until")
          .eq("id", conversationId)
          .maybeSingle(),
        supabase
          .from("ai_config")
          .select("config_value")
          .eq("config_key", "ai_autopilot_allowlist")
          .maybeSingle(),
      ]);
      if (!alive) return;
      if (conv) {
        setState({
          enabled: !!(conv as any).ai_autopilot_enabled,
          agent: ((conv as any).ai_autopilot_agent as AgentKey) ?? null,
          pausedUntil: (conv as any).ai_autopilot_paused_until ?? null,
        });
      }
      const allowRaw = String((cfg as any)?.config_value || "");
      const list = allowRaw.split(/[,\s;]+/).map(s => s.replace(/\D/g, "")).filter(Boolean);
      const phoneDigits = String(conversationPhone || "").replace(/\D/g, "");
      setAllowed(list.length > 0 && list.includes(phoneDigits));
    })();
    return () => { alive = false; };
  }, [conversationId, conversationPhone]);

  const isPaused = !!(state.pausedUntil && new Date(state.pausedUntil) > new Date());
  const active = state.enabled && state.agent && !isPaused;

  async function activate(agent: NonNullable<AgentKey>) {
    if (!conversationId) return;
    setLoading(true);
    const { error } = await supabase
      .from("conversations")
      .update({
        ai_autopilot_enabled: true,
        ai_autopilot_agent: agent,
        ai_autopilot_paused_until: null,
      })
      .eq("id", conversationId);
    setLoading(false);
    if (error) {
      toast.error("Não foi possível ativar o piloto IA");
      return;
    }
    setState({ enabled: true, agent, pausedUntil: null });
    toast.success(`Piloto IA ativado · ${AGENT_LABELS[agent]}`);
  }

  async function deactivate() {
    if (!conversationId) return;
    setLoading(true);
    const { error } = await supabase
      .from("conversations")
      .update({
        ai_autopilot_enabled: false,
        ai_autopilot_agent: null,
        ai_autopilot_paused_until: null,
      })
      .eq("id", conversationId);
    setLoading(false);
    if (error) {
      toast.error("Não foi possível desativar");
      return;
    }
    setState({ enabled: false, agent: null, pausedUntil: null });
    toast("Piloto IA desligado");
  }

  async function pauseFor(minutes: number) {
    if (!conversationId) return;
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    setLoading(true);
    const { error } = await supabase
      .from("conversations")
      .update({ ai_autopilot_paused_until: until })
      .eq("id", conversationId);
    setLoading(false);
    if (error) {
      toast.error("Não foi possível pausar");
      return;
    }
    setState(s => ({ ...s, pausedUntil: until }));
    toast(`Piloto IA pausado por ${minutes}min`);
  }

  async function resume() {
    if (!conversationId) return;
    setLoading(true);
    const { error } = await supabase
      .from("conversations")
      .update({ ai_autopilot_paused_until: null })
      .eq("id", conversationId);
    setLoading(false);
    if (error) {
      toast.error("Não foi possível retomar");
      return;
    }
    setState(s => ({ ...s, pausedUntil: null }));
    toast.success("Piloto IA retomado");
  }

  if (!conversationId) return null;

  // Disabled state (telefone não está na allowlist)
  if (allowed === false && !state.enabled) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn("h-7 px-2 gap-1.5 text-[11px] text-muted-foreground", className)}
        title="Conversa fora da allowlist do Piloto IA"
      >
        <Bot className="h-3.5 w-3.5" />
        Piloto IA · indisponível
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={active ? "default" : "ghost"}
          size="sm"
          disabled={loading}
          className={cn(
            "h-7 px-2.5 gap-1.5 text-[11px] font-medium",
            active && "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border border-emerald-500/30",
            isPaused && "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border border-amber-500/30",
            className,
          )}
        >
          {active ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {state.agent === "maya" ? "Maya respondendo" : "Atlas respondendo"}
            </>
          ) : isPaused ? (
            <>
              <Pause className="h-3.5 w-3.5" />
              Piloto IA · pausado
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Piloto IA · desligado
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Quem responde no WhatsApp
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => activate("maya")}
          className={cn(state.agent === "maya" && "bg-emerald-500/10")}
        >
          <Bot className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span className="text-xs font-medium">Ativar Maya</span>
            <span className="text-[10px] text-muted-foreground">Acolhimento e validação</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => activate("atlas")}
          className={cn(state.agent === "atlas" && "bg-emerald-500/10")}
        >
          <Bot className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span className="text-xs font-medium">Ativar Atlas</span>
            <span className="text-[10px] text-muted-foreground">Qualificação SDR (5 campos)</span>
          </div>
        </DropdownMenuItem>
        {active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => pauseFor(60)}>
              <Pause className="h-4 w-4 mr-2" />
              <span className="text-xs">Pausar por 1 hora</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => pauseFor(15)}>
              <Pause className="h-4 w-4 mr-2" />
              <span className="text-xs">Pausar por 15 min</span>
            </DropdownMenuItem>
          </>
        )}
        {isPaused && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resume}>
              <Play className="h-4 w-4 mr-2" />
              <span className="text-xs">Retomar agora</span>
            </DropdownMenuItem>
          </>
        )}
        {(state.enabled || isPaused) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={deactivate} className="text-destructive focus:text-destructive">
              <span className="text-xs">Desligar piloto IA</span>
            </DropdownMenuItem>
          </>
        )}
        {allowed === false && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-[10px] text-amber-600">
              ⚠ Telefone não está na allowlist · resposta automática só dispara quando estiver.
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
