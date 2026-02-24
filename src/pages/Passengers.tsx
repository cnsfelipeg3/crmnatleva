import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAll";
import { formatDateBR } from "@/lib/dateFormat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, AlertTriangle, User, RefreshCw, Loader2, Plane } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AIExtractButton from "@/components/AIExtractButton";
import { useNavigate } from "react-router-dom";

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

interface SaleLink {
  sale_id: string;
  sale_name: string;
  sale_display_id: string;
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
  const [saleLinks, setSaleLinks] = useState<Record<string, SaleLink[]>>({});
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailPax, setDetailPax] = useState<Passenger | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "", cpf: "", birth_date: "", passport_number: "",
    passport_expiry: "", phone: "", address_cep: "", address_street: "",
    address_number: "", address_complement: "", address_neighborhood: "",
    address_city: "", address_state: "",
  });

  const fetchPassengers = async () => {
    const data = await fetchAllRows("passengers", "*", { order: { column: "created_at", ascending: false } });
    setPassengers(data as Passenger[]);
    setLoading(false);

    // Fetch sale links for all passengers (paginated)
    const links = await fetchAllRows("sale_passengers", "passenger_id, sale_id, sales:sale_id(name, display_id)");
    
    if (links) {
      const map: Record<string, SaleLink[]> = {};
      for (const link of links as any[]) {
        const pId = link.passenger_id;
        if (!map[pId]) map[pId] = [];
        map[pId].push({
          sale_id: link.sale_id,
          sale_name: link.sales?.name || "",
          sale_display_id: link.sales?.display_id || "",
        });
      }
      setSaleLinks(map);
    }
  };

  useEffect(() => { fetchPassengers(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-passengers");
      if (error) throw error;
      toast({
        title: "Sincronização concluída!",
        description: `${data.created} criados, ${data.linked} vinculados, ${data.skipped} atualizados`,
      });
      await fetchPassengers();
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

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

  const handleAIExtract = (fields: Record<string, any>) => {
    const get = (key: string) => {
      const v = fields[key];
      if (!v) return "";
      if (Array.isArray(v)) return v[0]?.value?.toString() || "";
      return v.value?.toString() || "";
    };
    setForm(f => ({
      ...f,
      full_name: get("passenger_names") || f.full_name,
      cpf: get("cpf") || f.cpf,
      phone: get("phone") || f.phone,
      passport_number: get("passport") || f.passport_number,
    }));
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Passageiros</h1>
          <p className="text-sm text-muted-foreground">{passengers.length} passageiros cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Sincronizar das Vendas
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Passageiro</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Passageiro</DialogTitle>
              </DialogHeader>
              <AIExtractButton onExtracted={handleAIExtract} compact />
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
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <User className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground">{search ? "Nenhum passageiro encontrado." : "Nenhum passageiro cadastrado ainda."}</p>
          {!search && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className="w-4 h-4 mr-1" /> Sincronizar das Vendas
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="p-4 glass-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setDetailPax(p)}
            >
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
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {(saleLinks[p.id]?.length || 0) > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Plane className="w-3 h-3 mr-0.5" /> {saleLinks[p.id].length} viagem(ns)
                      </Badge>
                    )}
                    {p.passport_number && (
                      <Badge variant="outline" className="text-[10px]">
                        Passaporte: {p.passport_number}
                      </Badge>
                    )}
                    {isPassportExpiringSoon(p.passport_expiry) && (
                      <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Vencendo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailPax} onOpenChange={(open) => !open && setDetailPax(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {detailPax?.full_name}
            </DialogTitle>
          </DialogHeader>
          {detailPax && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {detailPax.cpf && <><span className="text-muted-foreground">CPF</span><span className="font-mono">{detailPax.cpf}</span></>}
                {detailPax.birth_date && <><span className="text-muted-foreground">Nascimento</span><span>{formatDateBR(detailPax.birth_date)}</span></>}
                {detailPax.phone && <><span className="text-muted-foreground">Telefone</span><span>{detailPax.phone}</span></>}
                {detailPax.passport_number && <><span className="text-muted-foreground">Passaporte</span><span className="font-mono">{detailPax.passport_number}</span></>}
                {detailPax.passport_expiry && <><span className="text-muted-foreground">Validade</span><span>{formatDateBR(detailPax.passport_expiry)}</span></>}
                {detailPax.address_city && <><span className="text-muted-foreground">Cidade</span><span>{detailPax.address_city}/{detailPax.address_state}</span></>}
                {detailPax.address_street && <><span className="text-muted-foreground">Endereço</span><span>{detailPax.address_street}, {detailPax.address_number}</span></>}
              </div>

              {/* Linked sales */}
              {(saleLinks[detailPax.id]?.length || 0) > 0 && (
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <Plane className="w-4 h-4" /> Viagens Vinculadas
                  </h4>
                  <div className="space-y-1">
                    {saleLinks[detailPax.id].map((link) => (
                      <button
                        key={link.sale_id}
                        onClick={() => { setDetailPax(null); navigate(`/sales/${link.sale_id}`); }}
                        className="w-full text-left px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium">{link.sale_name}</span>
                        <Badge variant="outline" className="text-[10px]">{link.sale_display_id}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
