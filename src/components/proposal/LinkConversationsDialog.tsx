import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, MessageSquare, Check } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";

interface Conversation {
  id: string;
  contact_name: string | null;
  display_name: string | null;
  phone: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  profile_picture_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  proposalId: string;
  onChanged?: (count: number) => void;
}

export function LinkConversationsDialog({ open, onOpenChange, proposalId, onChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: convs }, { data: links }] = await Promise.all([
          supabase
            .from("conversations")
            .select("id, contact_name, display_name, phone, last_message_at, last_message_preview, profile_picture_url")
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(300),
          (supabase as any)
            .from("proposal_conversations")
            .select("conversation_id")
            .eq("proposal_id", proposalId),
        ]);
        if (cancelled) return;
        setConversations((convs || []) as Conversation[]);
        const ids = new Set<string>((links || []).map((l: any) => l.conversation_id));
        setSelected(ids);
        setInitial(ids);
      } catch (e: any) {
        toast.error("Erro ao carregar conversas", { description: e.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, proposalId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c =>
      (c.contact_name || c.display_name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const toAdd = [...selected].filter(id => !initial.has(id));
      const toRemove = [...initial].filter(id => !selected.has(id));

      if (toRemove.length > 0) {
        const { error } = await (supabase as any)
          .from("proposal_conversations")
          .delete()
          .eq("proposal_id", proposalId)
          .in("conversation_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { data: userRes } = await supabase.auth.getUser();
        const rows = toAdd.map(cid => ({
          proposal_id: proposalId,
          conversation_id: cid,
          linked_by: userRes?.user?.id || null,
        }));
        const { error } = await (supabase as any).from("proposal_conversations").insert(rows);
        if (error) throw error;
      }
      toast.success("Vínculos atualizados");
      onChanged?.(selected.size);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const fmtTime = (d: string | null) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch { return ""; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Vincular conversas a esta proposta
          </DialogTitle>
          <DialogDescription>
            Selecione um ou mais chats. A proposta aparecerá no painel lateral de cada conversa vinculada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} conversa(s)</span>
            <Badge variant="secondary" className="font-normal">{selected.size} selecionada(s)</Badge>
          </div>

          <ScrollArea className="h-[380px] rounded-md border border-border/40">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</div>
            ) : (
              <ul className="divide-y divide-border/40">
                {filtered.map(c => {
                  const isSel = selected.has(c.id);
                  const name = c.contact_name || c.display_name || formatPhoneDisplay(c.phone || "") || "Sem nome";
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors ${isSel ? "bg-primary/5" : ""}`}
                      >
                        <Checkbox checked={isSel} onCheckedChange={() => toggle(c.id)} className="pointer-events-none" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(c.last_message_at)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatPhoneDisplay(c.phone || "") || "—"}
                            {c.last_message_preview ? ` · ${c.last_message_preview}` : ""}
                          </p>
                        </div>
                        {isSel && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar vínculos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
