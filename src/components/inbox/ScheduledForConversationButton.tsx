import { useEffect, useState } from "react";
import { Clock, Pencil, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Scheduled = {
  id: string;
  scheduled_for: string;
  content: string | null;
  status: string;
  created_by: string;
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function localDateValue(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function localTimeValue(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

type Props = {
  conversationId: string | null;
  /** Quando true, mostra um botão compacto (relógio + número) mesmo se 0 estiver oculto. */
  inline?: boolean;
};

export function ScheduledForConversationButton({ conversationId, inline }: Props) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Scheduled[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const refreshCount = async () => {
    if (!conversationId) { setCount(0); return; }
    const { count: c } = await supabase
      .from("scheduled_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("status", "pending")
      .gte("scheduled_for", new Date().toISOString());
    setCount(c || 0);
  };

  useEffect(() => {
    refreshCount();
    if (!conversationId) return;
    const ch = supabase
      .channel(`scheduled-${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_messages", filter: `conversation_id=eq.${conversationId}` }, () => {
        refreshCount();
        if (open) loadList();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadList = async () => {
    if (!conversationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("scheduled_messages")
      .select("id, scheduled_for, content, status, created_by")
      .eq("conversation_id", conversationId)
      .eq("status", "pending")
      .gte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true });
    setItems((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { if (open) loadList(); /* eslint-disable-next-line */ }, [open]);

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_messages")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Falha ao cancelar"); return; }
    toast.success("Agendamento cancelado");
    loadList();
    refreshCount();
  };

  const startEdit = (item: Scheduled) => {
    const d = new Date(item.scheduled_for);
    setEditDate(localDateValue(d));
    setEditTime(localTimeValue(d));
    setEditingId(item.id);
  };

  const saveEdit = async () => {
    if (!editingId || !editDate || !editTime) return;
    const [y, m, d] = editDate.split("-").map(Number);
    const [hh, mm] = editTime.split(":").map(Number);
    const newDate = new Date(y, (m||1)-1, d||1, hh||0, mm||0, 0, 0);
    if (newDate.getTime() < Date.now() + 60_000) {
      toast.error("Escolha um horário pelo menos 1 minuto à frente");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("scheduled_messages")
      .update({ scheduled_for: newDate.toISOString(), updated_at: new Date().toISOString() })
      .eq("id", editingId)
      .eq("status", "pending");
    setSavingEdit(false);
    if (error) { toast.error("Falha ao reagendar"); return; }
    toast.success(`Reagendado para ${newDate.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`);
    setEditingId(null);
    loadList();
    refreshCount();
  };

  if (count === 0 && !inline) return null;
  if (count === 0 && inline) return null;

  const minDate = localDateValue(new Date());

  return (
    <>
      {inline ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${count} mensagem${count > 1 ? "s" : ""} agendada${count > 1 ? "s" : ""}`}
          title={`${count} agendada${count > 1 ? "s" : ""} · clique para gerenciar`}
          className="h-9 w-9 shrink-0 rounded-full hover:bg-foreground/5 active:scale-95 transition-transform relative"
          onClick={() => setOpen(true)}
        >
          <Clock className="h-4 w-4 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
            {count}
          </span>
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => setOpen(true)}>
          <Clock className="h-3 w-3" />
          {count} agendada{count > 1 ? "s" : ""}
        </Button>
      )}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Mensagens agendadas</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
            {!loading && items.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mensagem pendente.</p>}
            {items.map(item => {
              const isEditing = editingId === item.id;
              return (
                <div key={item.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {new Date(item.scheduled_for).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </Badge>
                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit(item)}>
                          <Pencil className="h-3 w-3" /> Reagendar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => cancel(item.id)}>
                          <X className="h-3 w-3" /> Cancelar
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm whitespace-pre-wrap break-words">{item.content || "(sem texto)"}</p>

                  {isEditing && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Nova data</Label>
                          <Input type="date" min={minDate} value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Novo horário</Label>
                          <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="h-9 text-sm" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={savingEdit}>Cancelar</Button>
                        <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                          {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Clock className="h-3.5 w-3.5 mr-1.5" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
