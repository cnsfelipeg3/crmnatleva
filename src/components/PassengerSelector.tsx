import { useState, useEffect, useRef } from "react";
import { formatPhoneDisplay } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, X, User, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { formatDateBR } from "@/lib/dateFormat";
import { smartCapitalizeName } from "@/lib/nameUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface SelectedPassenger {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  phone: string | null;
  incomplete: boolean;
}

function isIncomplete(p: any): boolean {
  return !p.cpf && !p.passport_number;
}

function isPassportExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  const exp = new Date(expiry);
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  return exp < sixMonths;
}

interface Props {
  selected: SelectedPassenger[];
  onChange: (passengers: SelectedPassenger[]) => void;
}

export default function PassengerSelector({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCpf, setNewCpf] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("passengers")
        .select("id, full_name, cpf, birth_date, passport_number, passport_expiry, phone")
        .or(`full_name.ilike.%${query}%,cpf.ilike.%${query}%,phone.ilike.%${query}%,passport_number.ilike.%${query}%`)
        .limit(10);
      setResults(data || []);
      setSearching(false);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addPassenger = (p: any) => {
    if (selected.some(s => s.id === p.id)) return;
    onChange([...selected, { ...p, incomplete: isIncomplete(p) }]);
    setQuery("");
    setShowResults(false);
  };

  const removePassenger = (id: string) => {
    onChange(selected.filter(s => s.id !== id));
  };

  const handleCreate = async () => {
    const name = smartCapitalizeName(newName);
    if (!name || name.length < 2) {
      toast({ title: "Nome inválido", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.from("passengers").insert({
      full_name: name,
      cpf: newCpf.replace(/\D/g, "") || null,
      phone: newPhone || null,
      created_by: user?.id,
    }).select("id, full_name, cpf, birth_date, passport_number, passport_expiry, phone").single();
    setCreating(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      addPassenger(data);
      setCreateOpen(false);
      setNewName("");
      setNewCpf("");
      setNewPhone("");
      toast({ title: "Passageiro criado e adicionado!" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Passageiros desta Venda
        </h3>
      </div>

      {/* Search */}
      <div className="relative" ref={ref}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar passageiro por nome, CPF, telefone, passaporte..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="pl-9"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}

        {showResults && results.length > 0 && (
          <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg border">
            {results.map((p) => {
              const alreadySelected = selected.some(s => s.id === p.id);
              return (
                <button
                  key={p.id}
                  disabled={alreadySelected}
                  onClick={() => addPassenger(p)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 disabled:opacity-40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {[p.cpf, p.phone ? formatPhoneDisplay(p.phone) : null, p.passport_number].filter(Boolean).join(" · ") || "Sem documentos"}
                    </p>
                  </div>
                  {alreadySelected && <Badge variant="secondary" className="text-[10px] shrink-0">Adicionado</Badge>}
                </button>
              );
            })}
          </Card>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map((p) => (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.full_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {p.cpf && <span className="text-[10px] text-muted-foreground font-mono">{p.cpf}</span>}
                  {p.birth_date && <span className="text-[10px] text-muted-foreground">{formatDateBR(p.birth_date)}</span>}
                  {p.passport_number && <Badge variant="outline" className="text-[10px]">🛂 {p.passport_number}</Badge>}
                  {p.phone && <span className="text-[10px] text-muted-foreground">{formatPhoneDisplay(p.phone)}</span>}
                  {isPassportExpiringSoon(p.passport_expiry) && (
                    <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" /> Passaporte vencendo</Badge>
                  )}
                  {p.incomplete && (
                    <Badge variant="outline" className="text-[10px] text-warning border-warning">⚠️ Cadastro incompleto</Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removePassenger(p.id)} className="shrink-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum passageiro selecionado. Use a busca acima para adicionar.</p>
      )}

      {/* Quick create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastrar Passageiro Rápido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome Completo *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={newCpf} onChange={(e) => setNewCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Criar e Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
