/**
 * SimulatorObservationsPanel
 * Sidebar panel for registering live observations during simulations.
 * - Click on a message → observation linked to that specific message
 * - Type without selecting → observation about the session as a whole
 */
import { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, X, Send, Eye, Lightbulb, AlertTriangle, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SelectedMessage {
  content: string;
  role: "agent" | "client";
  agentName?: string;
  leadId: string;
  leadName: string;
  timestamp: number;
}

export interface Observation {
  id: string;
  scope: "message" | "session";
  observationText: string;
  messageContent?: string;
  messageRole?: string;
  leadId?: string;
  leadName?: string;
  agentName?: string;
  createdAt: string;
}

interface Props {
  simulationId?: string;
  selectedMessage: SelectedMessage | null;
  onClearSelectedMessage: () => void;
  className?: string;
}

export default function SimulatorObservationsPanel({ simulationId, selectedMessage, onClearSelectedMessage, className }: Props) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [inputText, setInputText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Focus input when a message is selected
  useEffect(() => {
    if (selectedMessage && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedMessage]);

  const saveObservation = async () => {
    if (!inputText.trim()) return;
    setSaving(true);

    const newObs: Observation = {
      id: crypto.randomUUID(),
      scope: selectedMessage ? "message" : "session",
      observationText: inputText.trim(),
      messageContent: selectedMessage?.content,
      messageRole: selectedMessage?.role,
      leadId: selectedMessage?.leadId,
      leadName: selectedMessage?.leadName,
      agentName: selectedMessage?.agentName,
      createdAt: new Date().toISOString(),
    };

    setObservations(prev => [newObs, ...prev]);
    setInputText("");
    onClearSelectedMessage();

    // Persist to DB (fire-and-forget)
    supabase.from("simulation_observations" as any).insert({
      simulation_id: simulationId || null,
      lead_id: newObs.leadId || null,
      lead_name: newObs.leadName || null,
      agent_id: null,
      agent_name: newObs.agentName || null,
      scope: newObs.scope,
      message_content: newObs.messageContent || null,
      message_role: newObs.messageRole || null,
      observation_text: newObs.observationText,
    } as any).then(({ error }) => {
      if (error) console.warn("[Observations] Save failed:", error.message);
    });

    setSaving(false);
    toast({ title: "📝 Observação registrada", description: newObs.scope === "message" ? "Vinculada à mensagem selecionada" : "Observação geral da sessão" });
  };

  const removeObs = (id: string) => {
    setObservations(prev => prev.filter(o => o.id !== id));
  };

  return (
    <div className={cn("flex flex-col rounded-2xl overflow-hidden", className)} style={{ background: "rgba(13,18,32,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Eye className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>Observações ao Vivo</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
          {observations.length}
        </span>
      </div>

      {/* Selected message context */}
      {selectedMessage && (
        <div className="mx-3 mt-3 rounded-xl p-3 relative animate-in slide-in-from-top-2 duration-200" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <button onClick={onClearSelectedMessage} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="text-[9px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "#F59E0B" }}>
            📌 Mensagem selecionada
          </p>
          <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: "#E2E8F0" }}>
            "{selectedMessage.content.slice(0, 120)}{selectedMessage.content.length > 120 ? "..." : ""}"
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: selectedMessage.role === "agent" ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: selectedMessage.role === "agent" ? "#10B981" : "#3B82F6" }}>
              {selectedMessage.role === "agent" ? selectedMessage.agentName || "Agente" : selectedMessage.leadName || "Lead"}
            </span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-3">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveObservation(); } }}
            placeholder={selectedMessage ? "O que você observou nesta mensagem?" : "Observação geral sobre a sessão..."}
            className="w-full bg-secondary/30 text-sm text-foreground rounded-xl px-4 py-3 pr-12 resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
            rows={2}
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          />
          <button
            onClick={saveObservation}
            disabled={!inputText.trim() || saving}
            className="absolute bottom-3 right-3 p-1.5 rounded-lg transition-all disabled:opacity-30"
            style={{ background: inputText.trim() ? "rgba(245,158,11,0.2)" : "transparent", color: "#F59E0B" }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {!selectedMessage && (
          <p className="text-[10px] mt-1.5 px-1" style={{ color: "#64748B" }}>
            💡 Clique em uma mensagem no chat para vincular a observação
          </p>
        )}
      </div>

      {/* Observations list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 space-y-2">
        {observations.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquarePlus className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "#94A3B8" }} />
            <p className="text-[11px]" style={{ color: "#64748B" }}>Registre observações enquanto assiste</p>
          </div>
        ) : (
          observations.map(obs => (
            <div key={obs.id} className="group rounded-xl p-3 transition-all hover:brightness-110" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {obs.scope === "message" ? (
                    <Lightbulb className="w-3 h-3 shrink-0" style={{ color: "#F59E0B" }} />
                  ) : (
                    <Sparkles className="w-3 h-3 shrink-0" style={{ color: "#8B5CF6" }} />
                  )}
                  <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: obs.scope === "message" ? "#F59E0B" : "#8B5CF6" }}>
                    {obs.scope === "message" ? "Mensagem" : "Sessão"}
                  </span>
                </div>
                <button onClick={() => removeObs(obs.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
              {obs.messageContent && (
                <p className="text-[10px] italic mt-1.5 line-clamp-2 px-2 py-1 rounded" style={{ color: "#94A3B8", background: "rgba(255,255,255,0.02)" }}>
                  "{obs.messageContent.slice(0, 80)}{obs.messageContent.length > 80 ? "..." : ""}"
                </p>
              )}
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#E2E8F0" }}>{obs.observationText}</p>
              <div className="flex items-center gap-2 mt-2">
                {obs.leadName && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6" }}>{obs.leadName}</span>
                )}
                {obs.agentName && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>{obs.agentName}</span>
                )}
                <span className="text-[9px] ml-auto" style={{ color: "#64748B" }}>
                  {new Date(obs.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
