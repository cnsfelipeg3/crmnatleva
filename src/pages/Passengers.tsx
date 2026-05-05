import { useState, useEffect } from "react";
import { formatPhoneDisplay } from "@/lib/phone";
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
import { Search, Plus, AlertTriangle, User, RefreshCw, Loader2, Plane, ShoppingCart, CheckSquare, Pencil, Save, X, Link2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import PassengerLinkDialog from "@/components/passengers/PassengerLinkDialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AIExtractButton from "@/components/AIExtractButton";
import { useNavigate } from "react-router-dom";
import { smartCapitalizeName } from "@/lib/nameUtils";
import { DatePartsInput } from "@/components/ui/date-parts-input";

interface Passenger {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  phone: string | null;
  rg: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_notes: string | null;
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
  const [stateFilter, setStateFilter] = useState("all");
  const [docFilter, setDocFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [detailPax, setDetailPax] = useState<Passenger | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [editingDetail, setEditingDetail] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | null>("created_desc");
  const [editForm, setEditForm] = useState<Partial<Passenger>>({});
  const [savingEdit, setSavingEdit] = useState(false);
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
    try {
      const data = await fetchAllRows("passengers", "*", { order: { column: "created_at", ascending: false } });
      setPassengers(data as Passenger[]);
      setLoading(false);

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
    } catch (err) {
      console.error("Passengers fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    // if (!user) return; // TEMP: bypass auth
    fetchPassengers();
  }, [user]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-passengers");
      if (error) throw error;
      toast({ title: "Sincronização concluída!", description: `${data.created} criados, ${data.linked} vinculados, ${data.skipped} atualizados` });
      await fetchPassengers();
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally { setSyncing(false); }
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

  const handleEditCepLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEditForm(f => ({
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
    const capitalizedName = smartCapitalizeName(form.full_name);
    if (!capitalizedName || capitalizedName.length < 2) {
      toast({ title: "Nome inválido", description: "O nome deve ter pelo menos 2 caracteres.", variant: "destructive" });
      return;
    }
    if (/\d/.test(capitalizedName)) {
      toast({ title: "Nome inválido", description: "O nome não deve conter números.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("passengers").insert({
      full_name: capitalizedName,
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

  const startEditDetail = () => {
    if (!detailPax) return;
    setEditForm({ ...detailPax });
    setEditingDetail(true);
  };

  const handleSaveEdit = async () => {
    if (!detailPax) return;
    setSavingEdit(true);
    const capitalizedName = smartCapitalizeName(editForm.full_name || "");
    if (!capitalizedName || capitalizedName.length < 2) {
      toast({ title: "Nome inválido", variant: "destructive" });
      setSavingEdit(false);
      return;
    }
    const { error } = await supabase.from("passengers").update({
      full_name: capitalizedName,
      cpf: editForm.cpf || null,
      birth_date: editForm.birth_date || null,
      passport_number: editForm.passport_number || null,
      passport_expiry: editForm.passport_expiry || null,
      phone: editForm.phone || null,
      rg: editForm.rg || null,
      address_cep: editForm.address_cep || null,
      address_street: editForm.address_street || null,
      address_number: editForm.address_number || null,
      address_complement: editForm.address_complement || null,
      address_neighborhood: editForm.address_neighborhood || null,
      address_city: editForm.address_city || null,
      address_state: editForm.address_state || null,
    }).eq("id", detailPax.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Passageiro atualizado!" });
    const updated = { ...detailPax, ...editForm, full_name: capitalizedName } as Passenger;
    setDetailPax(updated);
    setPassengers(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditingDetail(false);
  };

  const states = [...new Set(passengers.map(p => p.address_state).filter(Boolean))].sort() as string[];

  const filtered = passengers.filter((p) => {
    const matchSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.cpf?.includes(search) || p.phone?.includes(search);
    const matchState = stateFilter === "all" || p.address_state === stateFilter;
    const matchDoc = docFilter === "all" ||
      (docFilter === "sem-cpf" && !p.cpf) ||
      (docFilter === "sem-phone" && !p.phone) ||
      (docFilter === "sem-passaporte" && !p.passport_number) ||
      (docFilter === "passaporte-vencendo" && isPassportExpiringSoon(p.passport_expiry));
    return matchSearch && matchState && matchDoc;
  }).sort((a, b) => {
    if (!sortBy) return 0;
    const da = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
    const db = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
    return sortBy === "created_desc" ? db - da : da - db;
  });

  const navigateToNewSaleWithPassengers = (paxIds: string[]) => {
    const paxList = passengers.filter(p => paxIds.includes(p.id)).map(p => ({
      id: p.id, full_name: p.full_name, cpf: p.cpf, birth_date: p.birth_date,
      passport_number: p.passport_number, passport_expiry: p.passport_expiry,
      phone: p.phone, incomplete: !p.cpf && !p.passport_number,
    }));
    navigate("/sales/new", { state: { preSelectedPassengers: paxList } });
  };

  const toggleBulk = (id: string) => {
    setBulkSelection(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground">Passageiros</h1>
          <p className="text-sm text-muted-foreground">{passengers.length} passageiros cadastrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={bulkMode ? "secondary" : "outline"} size="sm" onClick={() => { setBulkMode(!bulkMode); setBulkSelection(new Set()); }}>
            <CheckSquare className="w-4 h-4 mr-1" /> {bulkMode ? "Cancelar seleção" : "Selecionar"}
          </Button>
          {bulkMode && bulkSelection.size > 0 && (
            <Button size="sm" onClick={() => navigateToNewSaleWithPassengers([...bulkSelection])}>
              <ShoppingCart className="w-4 h-4 mr-1" /> Criar venda ({bulkSelection.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Sincronizar das Vendas
          </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Passageiro <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    <div>
                      <div className="text-sm font-medium">Cadastrar manualmente</div>
                      <div className="text-xs text-muted-foreground">Preencher os dados aqui</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLinkDialogOpen(true)}>
                    <Link2 className="w-4 h-4 mr-2" />
                    <div>
                      <div className="text-sm font-medium">Gerar link de auto-cadastro</div>
                      <div className="text-xs text-muted-foreground">Cliente preenche pelo celular</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <PassengerLinkDialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Passageiro</DialogTitle>
              </DialogHeader>
              <AIExtractButton onExtracted={handleAIExtract} compact />
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} onBlur={(e) => setForm(f => ({ ...f, full_name: smartCapitalizeName(e.target.value) }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input value={form.cpf} onChange={(e) => setForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <DatePartsInput value={form.birth_date} onChange={(iso) => setForm(f => ({ ...f, birth_date: iso }))} />
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
                    <DatePartsInput value={form.passport_expiry} onChange={(iso) => setForm(f => ({ ...f, passport_expiry: iso }))} />
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-3">Endereço</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input value={form.address_cep} onChange={(e) => { const v = formatCep(e.target.value); setForm(f => ({ ...f, address_cep: v })); if (v.replace(/\D/g, "").length === 8) handleCepLookup(v); }} placeholder="00000-000" />
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

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Todos estados</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={docFilter} onChange={(e) => setDocFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Todos documentos</option>
          <option value="sem-cpf">Sem CPF</option>
          <option value="sem-phone">Sem telefone</option>
          <option value="sem-passaporte">Sem passaporte</option>
          <option value="passaporte-vencendo">Passaporte vencendo</option>
        </select>
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
        <>
          <Card className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {bulkMode && <TableHead className="w-10"></TableHead>}
                    <TableHead className="min-w-[220px]">Nome Completo</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Passaporte</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => setSortBy(sortBy === "created_desc" ? "created_asc" : "created_desc")}
                      title="Ordenar por data de cadastro"
                    >
                      Cliente desde {sortBy === "created_desc" ? "↓" : sortBy === "created_asc" ? "↑" : ""}
                    </TableHead>
                    <TableHead className="text-center">Viagens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, visibleCount).map((p) => {
                    const expiring = isPassportExpiringSoon(p.passport_expiry);
                    const tripCount = saleLinks[p.id]?.length || 0;
                    return (
                      <TableRow
                        key={p.id}
                        className={`cursor-pointer ${bulkMode && bulkSelection.has(p.id) ? "bg-primary/5" : ""}`}
                        onClick={() => bulkMode ? toggleBulk(p.id) : navigate(`/passengers/${p.id}`)}
                      >
                        {bulkMode && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={bulkSelection.has(p.id)}
                              onChange={() => toggleBulk(p.id)}
                              className="rounded border-input"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium text-foreground">{p.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.cpf || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.birth_date ? formatDateBR(p.birth_date) : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.phone ? formatPhoneDisplay(p.phone) : "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.passport_number || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {p.passport_expiry ? (
                            expiring ? (
                              <Badge variant="destructive" className="text-[10px] flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" /> {formatDateBR(p.passport_expiry)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{formatDateBR(p.passport_expiry)}</span>
                            )
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.address_city ? `${p.address_city}/${p.address_state || ""}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(p as any).created_at ? formatDateBR((p as any).created_at) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {tripCount > 0 ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <Plane className="w-3 h-3 mr-0.5" /> {tripCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
          {visibleCount < filtered.length && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setVisibleCount(v => v + 60)}>
                Carregar mais ({filtered.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail/Edit dialog */}
      <Dialog open={!!detailPax} onOpenChange={(open) => { if (!open) { setDetailPax(null); setEditingDetail(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {editingDetail ? "Editar Passageiro" : detailPax?.full_name}
            </DialogTitle>
          </DialogHeader>
          {detailPax && !editingDetail && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={startEditDetail}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar Cadastro
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {detailPax.cpf && <><span className="text-muted-foreground">CPF</span><span className="font-mono">{detailPax.cpf}</span></>}
                {detailPax.rg && <><span className="text-muted-foreground">RG</span><span className="font-mono">{detailPax.rg}</span></>}
                {detailPax.birth_date && <><span className="text-muted-foreground">Nascimento</span><span>{formatDateBR(detailPax.birth_date)}</span></>}
                {detailPax.phone && <><span className="text-muted-foreground">Telefone</span><span>{formatPhoneDisplay(detailPax.phone)}</span></>}
                {detailPax.passport_number && <><span className="text-muted-foreground">Passaporte</span><span className="font-mono">{detailPax.passport_number}</span></>}
                {detailPax.passport_expiry && <><span className="text-muted-foreground">Validade</span><span>{formatDateBR(detailPax.passport_expiry)}</span></>}
                {detailPax.address_city && <><span className="text-muted-foreground">Cidade</span><span>{detailPax.address_city}/{detailPax.address_state}</span></>}
                {detailPax.address_street && <><span className="text-muted-foreground">Endereço</span><span>{detailPax.address_street}, {detailPax.address_number}</span></>}
              </div>

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

              <div className="border-t pt-3">
                <Button className="w-full" size="sm" onClick={() => { setDetailPax(null); navigateToNewSaleWithPassengers([detailPax.id]); }}>
                  <ShoppingCart className="w-4 h-4 mr-1" /> Criar venda para este passageiro
                </Button>
              </div>
            </div>
          )}

          {/* Edit mode */}
          {detailPax && editingDetail && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={editForm.full_name || ""} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={editForm.cpf || ""} onChange={(e) => setEditForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input value={editForm.rg || ""} onChange={(e) => setEditForm(f => ({ ...f, rg: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <DatePartsInput value={editForm.birth_date || ""} onChange={(iso) => setEditForm(f => ({ ...f, birth_date: iso }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={editForm.phone || ""} onChange={(e) => setEditForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Passaporte</Label>
                  <Input value={editForm.passport_number || ""} onChange={(e) => setEditForm(f => ({ ...f, passport_number: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Validade Passaporte</Label>
                  <DatePartsInput value={editForm.passport_expiry || ""} onChange={(iso) => setEditForm(f => ({ ...f, passport_expiry: iso }))} />
                </div>
              </div>
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-3">Endereço</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input value={editForm.address_cep || ""} onChange={(e) => { const v = formatCep(e.target.value); setEditForm(f => ({ ...f, address_cep: v })); if (v.replace(/\D/g, "").length === 8) handleEditCepLookup(v); }} placeholder="00000-000" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Rua</Label>
                    <Input value={editForm.address_street || ""} onChange={(e) => setEditForm(f => ({ ...f, address_street: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={editForm.address_number || ""} onChange={(e) => setEditForm(f => ({ ...f, address_number: e.target.value }))} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Complemento</Label>
                    <Input value={editForm.address_complement || ""} onChange={(e) => setEditForm(f => ({ ...f, address_complement: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={editForm.address_neighborhood || ""} onChange={(e) => setEditForm(f => ({ ...f, address_neighborhood: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={editForm.address_city || ""} onChange={(e) => setEditForm(f => ({ ...f, address_city: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input value={editForm.address_state || ""} onChange={(e) => setEditForm(f => ({ ...f, address_state: e.target.value }))} maxLength={2} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingDetail(false)}>
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
