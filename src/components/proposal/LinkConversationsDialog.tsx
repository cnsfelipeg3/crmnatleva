import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, MessageSquare, Check, X } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phone";
import { WhatsAppAvatar } from "@/components/inbox/WhatsAppAvatar";
import { cn } from "@/lib/utils";

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

function fmtTime(d: string | null) {
  if (!d) return "";
  try {
    const date = new Date(d);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays < 7) return date.toLocaleDateString("pt-BR", { weekday: "short" });
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch { return ""; }
}

export function LinkConversationsDialog({ open, onOpenChange, proposalId, onChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: convs }, { data: links }] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, contact_name, display_name, phone, last_message_at, last_message_preview, profile_picture_url")
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(500),
        (supabase as any)
          .from("proposal_conversations")
          .select("conversation_id")
          .eq("proposal_id", proposalId),
      ]);
      setConversations((convs || []) as Conversation[]);
      const ids = new Set<string>((links || []).map((l: any) => l.conversation_id));
      setSelected(ids);
      setInitial(ids);
    } catch (e: any) {
      toast.error("Erro ao carregar conversas", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSearch("");
    loadData();
  }, [open, proposalId]);

  const convById = useMemo(() => {
    const m = new Map<string, Conversation>();
    conversations.forEach(c => m.set(c.id, c));
    return m;
  }, [conversations]);

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
      const removed = toRemove.length;
      const added = toAdd.length;
      if (added > 0 && removed === 0) toast.success(`${added} conversa${added > 1 ? "s" : ""} vinculada${added > 1 ? "s" : ""}`);
      else if (removed > 0 && added === 0) toast.success(`${removed} desvinculada${removed > 1 ? "s" : ""}`);
      else toast.success("Vínculos atualizados");
      onChanged?.(selected.size);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const selectedArr = useMemo(() => [...selected], [selected]);
  const dirty = selected.size !== initial.size || [...selected].some(id => !initial.has(id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-primary" />
            Vincular conversas
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione um ou mais chats. A proposta aparecerá no painel lateral de cada conversa.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/40 border-border/40"
            />
          </div>
        </div>

        {/* Selected chips */}
        {selectedArr.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {selectedArr.map(id => {
              const c = convById.get(id);
              if (!c) return null;
              const name = c.contact_name || c.display_name || formatPhoneDisplay(c.phone || "") || "Sem nome";
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="pl-1.5 pr-1 py-0.5 gap-1 max-w-[180px] bg-primary/10 text-primary hover:bg-primary/15 border-primary/20"
                >
                  <span className="truncate text-[11px] font-medium">{name}</span>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Remover"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <div className="px-5 pb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{filtered.length} conversa{filtered.length !== 1 ? "s" : ""}</span>
          <span>{selected.size} selecionada{selected.size !== 1 ? "s" : ""}</span>
        </div>

        {/* List */}
        <ScrollArea className="h-[420px] border-t border-border/40">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando conversas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</div>
          ) : (
            <ul className="divide-y divide-border/30">
              {filtered.map(c => {
                const isSel = selected.has(c.id);
                const name = c.contact_name || c.display_name || formatPhoneDisplay(c.phone || "") || "Sem nome";
                const phone = formatPhoneDisplay(c.phone || "") || "";
                const preview = (c.last_message_preview || "").replace(/\s+/g, " ").trim();
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40",
                        isSel && "bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      {/* Avatar com check overlay */}
                      <div className="relative shrink-0">
                        <WhatsAppAvatar
                          src={c.profile_picture_url}
                          name={name}
                          phone={c.phone}
                          size={42}
                          className="rounded-full"
                        />
                        {isSel && (
                          <span className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-background">
                            <Check className="w-2.5 h-2.5" strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(c.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {preview || phone || "—"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter className="px-5 py-3 border-t border-border/40 bg-muted/20 sm:justify-between gap-2">
          <span className="text-[11px] text-muted-foreground self-center">
            {dirty ? "Alterações não salvas" : "Sem alterações"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading || !dirty} size="sm" className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirmar vínculo{selected.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
