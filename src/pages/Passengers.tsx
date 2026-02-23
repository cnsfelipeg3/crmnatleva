import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, AlertTriangle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Passenger {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  phone: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function isPassportExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  const exp = new Date(expiry);
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  return exp < sixMonths;
}

export default function Passengers() {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [form, setForm] = useState({
    full_name: "", cpf: "", birth_date: "", passport_number: "",
    passport_expiry: "", phone: "", address_cep: "", address_street: "",
    address_number: "", address_complement: "", address_neighborhood: "",
    address_city: "", address_state: "",
  });

  const fetchPassengers = async () => {
    const { data, error } = await supabase.from("passengers").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    setPassengers((data || []) as Passenger[]);
    setLoading(false);
  };

  useEffect(() => { fetchPassengers(); }, []);

  const handleCepLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(f => ({
          ...f,
          address_street: data.logradouro || f.address_street,
          address_neighborhood: data.bairro || f.address_neighborhood,
          address_city: data.localidade || f.address_city,
          address_state: data.uf || f.address_state,
        }));
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("passengers").insert({
      full_name: form.full_name,
      cpf: form.cpf || null,
      birth_date: form.birth_date || null,
      passport_number: form.passport_number || null,
      passport_expiry: form.passport_expiry || null,
      phone: form.phone || null,
      address_cep: form.address_cep || null,
      address_street: form.address_street || null,
      address_number: form.address_number || null,
      address_complement: form.address_complement || null,
      address_neighborhood: form.address_neighborhood || null,
      address_city: form.address_city || null,
      address_state: form.address_state || null,
      created_by: user?.id,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Passageiro cadastrado!" });
    setForm({ full_name: "", cpf: "", birth_date: "", passport_number: "", passport_expiry: "", phone: "", address_cep: "", address_street: "", address_number: "", address_complement: "", address_neighborhood: "", address_city: "", address_state: "" });
    setDialogOpen(false);
    fetchPassengers();
  };

  const filtered = passengers.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.cpf?.includes(search) ||
      p.phone?.includes(search)
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Passageiros</h1>
          <p className="text-sm text-muted-foreground">{passengers.length} passageiros cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Passageiro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Passageiro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={(e) => setForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => setForm(f => ({ ...f, birth_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Telefone com DDD</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Passaporte</Label>
                  <Input value={form.passport_number} onChange={(e) => setForm(f => ({ ...f, passport_number: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento Passaporte</Label>
                  <Input type="date" value={form.passport_expiry} onChange={(e) => setForm(f => ({ ...f, passport_expiry: e.target.value }))} />
                </div>
              </div>
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-3">Endereço</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={form.address_cep}
                      onChange={(e) => {
                        const v = formatCep(e.target.value);
                        setForm(f => ({ ...f, address_cep: v }));
                        if (v.replace(/\D/g, "").length === 8) handleCepLookup(v);
                      }}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Rua</Label>
                    <Input value={form.address_street} onChange={(e) => setForm(f => ({ ...f, address_street: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={form.address_number} onChange={(e) => setForm(f => ({ ...f, address_number: e.target.value }))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Complemento</Label>
                    <Input value={form.address_complement} onChange={(e) => setForm(f => ({ ...f, address_complement: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={form.address_neighborhood} onChange={(e) => setForm(f => ({ ...f, address_neighborhood: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.address_city} onChange={(e) => setForm(f => ({ ...f, address_city: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input value={form.address_state} onChange={(e) => setForm(f => ({ ...f, address_state: e.target.value }))} maxLength={2} />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full">Salvar Passageiro</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "Nenhum passageiro encontrado." : "Nenhum passageiro cadastrado ainda."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Card key={p.id} className="p-4 glass-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{p.full_name}</p>
                  {p.cpf && <p className="text-xs text-muted-foreground font-mono">{p.cpf}</p>}
                  {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                  {p.address_city && (
                    <p className="text-xs text-muted-foreground">{p.address_city}/{p.address_state}</p>
                  )}
                  <div className="flex gap-1 mt-2">
                    {p.passport_number && (
                      <Badge variant="outline" className="text-[10px]">
                        Passaporte: {p.passport_number}
                      </Badge>
                    )}
                    {isPassportExpiringSoon(p.passport_expiry) && (
                      <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Passaporte vencendo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
