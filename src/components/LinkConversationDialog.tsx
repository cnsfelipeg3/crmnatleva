import { useState, useEffect, useMemo } from "react";
import { formatPhoneDisplay } from "@/lib/phone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Search, MessageSquare, Phone, Clock, Star, Loader2,
  Link2, Unlink, AlertTriangle, CheckCircle2,
} from "lucide-react";

interface LinkConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientPhone?: string | null;
  onLinked: (conversationId: string, conversationName: string) => void;
  onUnlinked: () => void;
}

interface ConvRow {
  id: string;
  phone: string | null;
  contact_name: string | null;
  display_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  client_id: string | null;
  source: string | null;
  unread_count: number | null;
}

function fmtDate(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()];
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function stripQuotes(text: string) {
  if (!text) return text;
  const t = text.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

export function LinkConversationDialog({
  open, onOpenChange, clientId, clientName, clientPhone, onLinked, onUnlinked,
}: LinkConversationDialogProps) {
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [linkedConv, setLinkedConv] = useState<ConvRow | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<ConvRow | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setConfirmReplace(null);
    loadConversations();
  }, [open, clientId]);

  const loadConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, phone, contact_name, display_name, last_message_preview, last_message_at, client_id, source, unread_count")
      .order("last_message_at", { ascending: false })
      .limit(500);
    const convs = (data || []) as ConvRow[];
    setConversations(convs);
    const linked = convs.find(c => c.client_id === clientId);
    setLinkedConv(linked || null);
    setLoading(false);
  };

  const cleanPhone = (p: string | null) => (p || "").replace(/\D/g, "");

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase().trim();
    return conversations.filter(c => {
      const name = (c.contact_name || c.display_name || "").toLowerCase();
      const phone = cleanPhone(c.phone);
      const preview = (c.last_message_preview || "").toLowerCase();
      return name.includes(q) || phone.includes(q.replace(/\D/g, "")) || preview.includes(q);
    });
  }, [conversations, search]);

  // Phone-based suggestions
  const suggestions = useMemo(() => {
    if (!clientPhone) return [];
    const cp = cleanPhone(clientPhone);
    if (cp.length < 8) return [];
    return conversations.filter(c => {
      const convPhone = cleanPhone(c.phone);
      return convPhone.length >= 8 && (convPhone.includes(cp) || cp.includes(convPhone));
    }).filter(c => c.client_id !== clientId);
  }, [conversations, clientPhone, clientId]);

  const handleLink = async (conv: ConvRow) => {
    // Check if conv is already linked to another client
    if (conv.client_id && conv.client_id !== clientId) {
      setConfirmReplace(conv);
      return;
    }
    await doLink(conv);
  };

  const doLink = async (conv: ConvRow) => {
    setLinking(true);
    setConfirmReplace(null);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ client_id: clientId })
        .eq("id", conv.id);
      if (error) throw error;

      const convName = conv.contact_name || conv.display_name || conv.phone || "Conversa";
      toast({ title: "Vínculo criado!", description: `${clientName} → ${convName}` });
      onLinked(conv.id, convName);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao vincular", description: err.message, variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkedConv) return;
    setUnlinking(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ client_id: null })
        .eq("id", linkedConv.id);
      if (error) throw error;
      toast({ title: "Vínculo removido" });
      onUnlinked();
      setLinkedConv(null);
    } catch (err: any) {
      toast({ title: "Erro ao desvincular", description: err.message, variant: "destructive" });
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" /> Vincular Conversa WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs">
            Associe uma conversa do WhatsApp ao cadastro de <strong>{clientName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Current Link */}
        {linkedConv && (
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">{linkedConv.contact_name || linkedConv.display_name || linkedConv.phone}</p>
                <p className="text-[10px] text-muted-foreground">{formatPhoneDisplay(linkedConv.phone)}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive hover:text-destructive" onClick={handleUnlink} disabled={unlinking}>
              {unlinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3 mr-1" />}
              Desvincular
            </Button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && !linkedConv && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <p className="text-[10px] font-bold text-amber-600 mb-1.5 flex items-center gap-1">
              <Star className="h-3 w-3" /> Sugestão de vínculo por telefone
            </p>
            {suggestions.slice(0, 3).map(c => (
              <button
                key={c.id}
                onClick={() => handleLink(c)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">{c.contact_name || c.display_name || c.phone}</p>
                    <p className="text-[10px] text-muted-foreground">{formatPhoneDisplay(c.phone)}</p>
                  </div>
                </div>
                <Link2 className="h-3.5 w-3.5 text-amber-600" />
              </button>
            ))}
          </div>
        )}

        {/* Confirm Replace */}
        {confirmReplace && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground">Esta conversa já está vinculada a outro cliente</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Deseja transferir o vínculo para <strong>{clientName}</strong>?
                </p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => doLink(confirmReplace)} disabled={linking}>
                    {linking ? <Loader2 className="h-3 w-3 animate-spin" /> : "Substituir"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setConfirmReplace(null)}>Cancelar</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, mensagem..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs"
            autoFocus
          />
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[45vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">Nenhuma conversa encontrada</p>
          ) : (
            <div className="space-y-0.5 pr-2">
              {filtered.map(c => {
                const isLinked = c.client_id === clientId;
                const name = c.contact_name || c.display_name || c.phone || "Sem nome";
                const preview = stripQuotes(c.last_message_preview || "");
                return (
                  <button
                    key={c.id}
                    onClick={() => !isLinked && handleLink(c)}
                    disabled={linking || isLinked}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      isLinked ? "bg-primary/5 border border-primary/20" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {c.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{formatPhoneDisplay(c.phone)}</span>}
                          {c.last_message_at && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{fmtDate(c.last_message_at)}</span>}
                        </div>
                        {preview && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5 max-w-[250px]">{preview.slice(0, 60)}{preview.length > 60 ? "…" : ""}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(c.unread_count || 0) > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 h-4">{c.unread_count}</Badge>
                      )}
                      {c.client_id && c.client_id !== clientId && (
                        <Badge variant="outline" className="text-[9px] px-1.5 border-amber-500/30 text-amber-600">Outro cliente</Badge>
                      )}
                      {isLinked ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5">Vinculado</Badge>
                      ) : (
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
