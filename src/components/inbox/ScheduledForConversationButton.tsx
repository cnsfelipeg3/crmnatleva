import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Scheduled = {
  id: string;
  scheduled_for: string;
  content: string | null;
  status: string;
  created_by: string;
};

export function ScheduledForConversationButton({ conversationId }: { conversationId: string | null }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Scheduled[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (count === 0) return null;

  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => setOpen(true)}>
        <Clock className="h-3 w-3" />
        {count} agendada{count > 1 ? "s" : ""}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Mensagens agendadas</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2">
            {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
            {!loading && items.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mensagem pendente.</p>}
            {items.map(item => (
              <div key={item.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    {new Date(item.scheduled_for).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => cancel(item.id)}>Cancelar</Button>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{item.content || "(sem texto)"}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
