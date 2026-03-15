import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Search, User, Phone, Mail, MapPin, Plane, Star, Loader2,
  Link2, Unlink, AlertTriangle, CheckCircle2, X,
} from "lucide-react";

interface LinkClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string; // db UUID of the conversation
  conversationPhone: string;
  conversationName: string;
  currentClientId?: string | null;
  onLinked: (clientId: string, clientName: string) => void;
  onUnlinked: () => void;
}

interface ClientRow {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  client_type: string;
  city: string | null;
  state: string | null;
  tags: string[] | null;
}

export function LinkClientDialog({
  open, onOpenChange, conversationId, conversationPhone, conversationName,
  currentClientId, onLinked, onUnlinked,
}: LinkClientDialogProps) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [currentClient, setCurrentClient] = useState<ClientRow | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<ClientRow | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setConfirmReplace(null);
    loadClients();
    if (currentClientId) loadCurrentClient();
    else setCurrentClient(null);
  }, [open, currentClientId]);

  const loadClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("id, display_name, phone, email, client_type, city, state, tags")
      .order("display_name")
      .limit(500);
    setClients(data || []);
    setLoading(false);
  };

  const loadCurrentClient = async () => {
    if (!currentClientId) return;
    const { data } = await supabase
      .from("clients")
      .select("id, display_name, phone, email, client_type, city, state, tags")
      .eq("id", currentClientId)
      .maybeSingle();
    setCurrentClient(data as ClientRow | null);
  };

  const cleanPhone = (p: string | null) => (p || "").replace(/\D/g, "");

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase().trim();
    return clients.filter(c =>
      c.display_name?.toLowerCase().includes(q) ||
      cleanPhone(c.phone).includes(q.replace(/\D/g, "")) ||
      c.email?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // Find phone-based suggestions
  const suggestions = useMemo(() => {
    if (!conversationPhone) return [];
    const convClean = cleanPhone(conversationPhone);
    if (convClean.length < 8) return [];
    return clients.filter(c => {
      const cp = cleanPhone(c.phone);
      return cp.length >= 8 && (cp.includes(convClean) || convClean.includes(cp));
    });
  }, [clients, conversationPhone]);

  const handleLink = async (client: ClientRow) => {
    // Check if conversation already linked to another client
    if (currentClientId && currentClientId !== client.id) {
      setConfirmReplace(client);
      return;
    }
    await doLink(client);
  };

  const doLink = async (client: ClientRow) => {
    setLinking(true);
    setConfirmReplace(null);
    try {
      // Check if this client already has another conversation linked
      const { data: existingConvs } = await supabase
        .from("conversations")
        .select("id, phone, contact_name")
        .eq("client_id", client.id)
        .neq("id", conversationId)
        .limit(1);

      if (existingConvs && existingConvs.length > 0) {
        const existing = existingConvs[0];
        toast({
          title: "Aviso",
          description: `Este cliente já possui outra conversa vinculada (${existing.contact_name || existing.phone}). O vínculo será atualizado.`,
        });
      }

      const { error } = await supabase
        .from("conversations")
        .update({ client_id: client.id })
        .eq("id", conversationId);

      if (error) throw error;

      toast({ title: "Vínculo criado!", description: `${conversationName} → ${client.display_name}` });
      onLinked(client.id, client.display_name);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao vincular", description: err.message, variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ client_id: null })
        .eq("id", conversationId);
      if (error) throw error;
      toast({ title: "Vínculo removido" });
      onUnlinked();
      onOpenChange(false);
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
            <Link2 className="h-4 w-4 text-primary" /> Vincular Cliente
          </DialogTitle>
          <DialogDescription className="text-xs">
            Associe esta conversa ({conversationName}) a um cliente cadastrado.
          </DialogDescription>
        </DialogHeader>

        {/* Current Link */}
        {currentClient && (
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">{currentClient.display_name}</p>
                <p className="text-[10px] text-muted-foreground">{currentClient.phone || currentClient.email || "Sem contato"}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive hover:text-destructive" onClick={handleUnlink} disabled={unlinking}>
              {unlinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3 mr-1" />}
              Desvincular
            </Button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && !currentClient && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <p className="text-[10px] font-bold text-amber-600 mb-1.5 flex items-center gap-1">
              <Star className="h-3 w-3" /> Sugestão de vínculo encontrada
            </p>
            {suggestions.slice(0, 3).map(c => (
              <button
                key={c.id}
                onClick={() => handleLink(c)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">{c.display_name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.phone}</p>
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
                <p className="text-xs font-semibold text-foreground">Substituir vínculo atual?</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Atual: <strong>{currentClient?.display_name}</strong> → Novo: <strong>{confirmReplace.display_name}</strong>
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
            placeholder="Buscar por nome, telefone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs"
            autoFocus
          />
        </div>

        {/* Client List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[45vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">Nenhum cliente encontrado</p>
          ) : (
            <div className="space-y-0.5 pr-2">
              {filtered.map(c => {
                const isLinked = c.id === currentClientId;
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
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{c.display_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {c.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{c.phone}</span>}
                          {c.email && <span className="flex items-center gap-0.5 truncate"><Mail className="h-2.5 w-2.5" />{c.email}</span>}
                          {c.city && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{c.city}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.tags?.includes("VIP") && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] px-1.5">VIP</Badge>}
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
