import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Search, Loader2, X, User, Phone, UserPlus, Link as LinkIcon } from "lucide-react";

interface Companion {
  id: string;
  passenger_id: string;
  relationship: string | null;
  passenger: {
    id: string;
    full_name: string;
    phone: string | null;
    birth_date: string | null;
  } | null;
}

interface PassengerRow {
  id: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
}

interface Props {
  conversationDbId?: string | null;
  /** Telefone do titular da conversa · usado para sugerir passageiros que já viajaram com ele */
  ownerPhone?: string | null;
  /** ID do cliente vinculado · usado para puxar histórico de viagens */
  clientId?: string | null;
}

export function ConversationCompanions({ conversationDbId, ownerPhone, clientId }: Props) {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PassengerRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PassengerRow[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => { if (conversationDbId) loadCompanions(); }, [conversationDbId]);

  useEffect(() => {
    if (!open) return;
    loadSuggestions();
  }, [open, ownerPhone, clientId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchPassengers(search), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [open, search]);

  const loadCompanions = async () => {
    if (!conversationDbId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("conversation_companions")
      .select("id, passenger_id, relationship, passenger:passenger_id(id, full_name, phone, birth_date)")
      .eq("conversation_id", conversationDbId)
      .order("created_at", { ascending: true });
    setCompanions((data || []) as Companion[]);
    setLoading(false);
  };

  const loadSuggestions = async () => {
    // Sugestões: passageiros das vendas em que o cliente é payer/cliente
    if (!clientId) { setSuggestions([]); return; }
    try {
      const { data: sales } = await supabase
        .from("sales")
        .select("id")
        .eq("client_id", clientId)
        .limit(50);
      const saleIds = (sales || []).map((s: any) => s.id);
      if (!saleIds.length) { setSuggestions([]); return; }
      const { data: sp } = await (supabase as any)
        .from("sale_passengers")
        .select("passenger:passenger_id(id, full_name, phone, birth_date)")
        .in("sale_id", saleIds);
      const seen = new Set<string>();
      const list: PassengerRow[] = [];
      for (const row of (sp || [])) {
        const p = row.passenger;
        if (!p || seen.has(p.id)) continue;
        seen.add(p.id);
        list.push(p);
      }
      setSuggestions(list);
    } catch { setSuggestions([]); }
  };

  const searchPassengers = async (q: string) => {
    setSearching(true);
    let query = (supabase as any)
      .from("passengers")
      .select("id, full_name, phone, birth_date")
      .order("full_name")
      .limit(50);
    const term = q.trim();
    if (term) {
      const digits = term.replace(/\D/g, "");
      const ors = [`full_name.ilike.%${term}%`];
      if (digits.length >= 3) ors.push(`phone.ilike.%${digits}%`);
      query = query.or(ors.join(","));
    }
    const { data } = await query;
    setResults((data || []) as PassengerRow[]);
    setSearching(false);
  };

  const linkedIds = useMemo(() => new Set(companions.map(c => c.passenger_id)), [companions]);

  const addCompanion = async (paxId: string, relationship?: string) => {
    if (!conversationDbId) return;
    setAdding(paxId);
    try {
      const { error } = await (supabase as any)
        .from("conversation_companions")
        .insert({ conversation_id: conversationDbId, passenger_id: paxId, relationship: relationship || null });
      if (error) throw error;
      toast({ title: "Companheiro vinculado" });
      await loadCompanions();
    } catch (err: any) {
      toast({ title: "Erro ao vincular", description: err.message, variant: "destructive" });
    } finally {
      setAdding(null);
    }
  };

  const removeCompanion = async (id: string) => {
    const prev = companions;
    setCompanions(c => c.filter(x => x.id !== id));
    const { error } = await (supabase as any).from("conversation_companions").delete().eq("id", id);
    if (error) {
      setCompanions(prev);
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  };

  const updateRelationship = async (id: string, value: string) => {
    setCompanions(c => c.map(x => x.id === id ? { ...x, relationship: value } : x));
    await (supabase as any).from("conversation_companions").update({ relationship: value || null }).eq("id", id);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Companheiros de viagem
          </span>
        </div>
        <Button
          variant="ghost" size="sm"
          className="h-6 px-1.5 text-[10px] gap-0.5"
          onClick={() => setOpen(true)}
          disabled={!conversationDbId}
        >
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground py-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
        </div>
      ) : companions.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic py-1">
          Nenhum companheiro vinculado. Adicione familiares ou amigos que costumam viajar juntos.
        </p>
      ) : (
        <div className="space-y-1">
          {companions.map(c => (
            <div key={c.id} className="flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/30 px-2 py-1.5">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground truncate">
                  {c.passenger?.full_name || "Passageiro removido"}
                </p>
                <Input
                  value={c.relationship || ""}
                  onChange={e => updateRelationship(c.id, e.target.value)}
                  placeholder="Relação (ex.: filha, esposa, amiga)"
                  className="h-5 px-1 text-[10px] border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                />
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeCompanion(c.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" /> Vincular companheiros de viagem
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atrele passageiros (familiares · amigos) que costumam viajar com este cliente.
            </DialogDescription>
          </DialogHeader>

          {suggestions.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <p className="text-[10px] font-bold text-amber-600 mb-1.5 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" /> Já viajaram com este cliente
              </p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {suggestions.map(p => {
                  const linked = linkedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => !linked && addCompanion(p.id)}
                      disabled={linked || adding === p.id}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-amber-500/10 transition-colors disabled:opacity-60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="text-xs font-semibold truncate">{p.full_name}</p>
                          {p.phone && <p className="text-[10px] text-muted-foreground">{p.phone}</p>}
                        </div>
                      </div>
                      {linked ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5">Vinculado</Badge>
                      ) : adding === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar passageiro por nome ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
              autoFocus
            />
          </div>

          <div className="flex-1 min-h-0 max-h-[45vh] overflow-y-auto -mr-2 pr-2">
            {searching ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : results.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">Nenhum passageiro encontrado</p>
            ) : (
              <div className="space-y-0.5">
                {results.map(p => {
                  const linked = linkedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => !linked && addCompanion(p.id)}
                      disabled={linked || adding === p.id}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        linked ? "bg-primary/5 border border-primary/20" : "hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{p.full_name}</p>
                          {p.phone && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Phone className="h-2.5 w-2.5" />{p.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      {linked ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5">Vinculado</Badge>
                      ) : adding === p.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
