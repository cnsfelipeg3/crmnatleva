import { useState, useMemo } from "react";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  /** Telefone normalizado (apenas dígitos) usado pelo Z-API */
  phone: string;
  /** UUID da conversation no banco (ou null se ainda virtual) */
  conversationId: string | null;
  /** Texto atual do composer */
  text: string;
  /** Callback após agendar com sucesso (ex: limpar input) */
  onScheduled?: () => void;
  /** Compact: usa botão menor para mobile */
  compact?: boolean;
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function localDateValue(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function localTimeValue(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export function ScheduleMessagePopover({ phone, conversationId, text, onScheduled, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Default: now + 1h
  const initial = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return { date: localDateValue(d), time: localTimeValue(d) };
  }, [open]);

  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  const scheduledFor = useMemo(() => {
    if (!date || !time) return null;
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, (m||1)-1, d||1, hh||0, mm||0, 0, 0);
  }, [date, time]);

  const isFuture = scheduledFor ? scheduledFor.getTime() > Date.now() + 60_000 : false;
  const hasContent = text.trim().length > 0;

  const setQuick = (preset: "1h" | "tomorrow9" | "monday9") => {
    const d = new Date();
    if (preset === "1h") {
      d.setTime(Date.now() + 60 * 60 * 1000);
    } else if (preset === "tomorrow9") {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (preset === "monday9") {
      const day = d.getDay();
      const offset = day === 1 ? 7 : ((8 - day) % 7) || 7;
      d.setDate(d.getDate() + offset);
      d.setHours(9, 0, 0, 0);
    }
    setDate(localDateValue(d));
    setTime(localTimeValue(d));
  };

  const handleSchedule = async () => {
    if (!isFuture || !hasContent || !scheduledFor) return;
    if (!phone) {
      toast.error("Telefone do contato indisponível");
      return;
    }
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { toast.error("Faça login novamente"); return; }

      const sendPayload = { phone, message: text.trim() };
      const original_payload = { action: "send-text", payload: sendPayload };

      const { error } = await supabase.from("scheduled_messages").insert({
        conversation_id: conversationId,
        scheduled_for: scheduledFor.toISOString(),
        status: "pending",
        content: text.trim(),
        original_payload,
        created_by: userId,
      });
      if (error) throw error;

      const formatted = scheduledFor.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      toast.success(`Mensagem agendada para ${formatted}`);
      setOpen(false);
      onScheduled?.();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao agendar mensagem");
    } finally {
      setIsSaving(false);
    }
  };

  const minDate = localDateValue(new Date());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Agendar mensagem"
              className={compact ? "h-9 w-9 shrink-0 rounded-full hover:bg-foreground/5 active:scale-95 transition-transform" : "h-9 w-9 shrink-0"}
            >
              <Clock className={compact ? "h-4 w-4 text-muted-foreground" : "h-5 w-5 text-muted-foreground"} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent><p className="text-xs">Agendar mensagem</p></TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-3" side="top" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm">Agendar mensagem</h4>
            <p className="text-[11px] text-muted-foreground">Será enviada automaticamente no horário escolhido.</p>
          </div>

          {!hasContent ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Digite uma mensagem antes de agendar.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Data</Label>
                  <Input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Horário</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setQuick("1h")}>+1h</Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setQuick("tomorrow9")}>Amanhã 9h</Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setQuick("monday9")}>Segunda 9h</Button>
              </div>

              {scheduledFor && (
                <p className={`text-[11px] ${isFuture ? "text-muted-foreground" : "text-destructive"}`}>
                  {isFuture
                    ? `Disparo em ${scheduledFor.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                    : "Escolha um horário pelo menos 1 minuto à frente"}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="button" size="sm" onClick={handleSchedule} disabled={!isFuture || isSaving}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Clock className="h-3.5 w-3.5 mr-1.5" />}
                  Agendar
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
