import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Building2, Trash2, Pencil, ChevronDown, ChevronRight, Check, X } from "lucide-react";

interface MilesProgram {
  id: string;
  supplier_id: string;
  program_name: string;
  price_per_thousand: number;
  min_miles: number;
  max_miles: number | null;
  is_active: boolean;
  notes: string | null;
}

function formatMiles(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function Fornecedores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [form, setForm] = useState({ name: "", cnpj: "", contact_name: "", phone: "", email: "", category: "", payment_conditions: "", bank_pix_key: "" });
  const [mpForm, setMpForm] = useState({ program_name: "", price_per_thousand: "", min_miles: "", max_miles: "" });
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({});
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [editTierForm, setEditTierForm] = useState({ price_per_thousand: "", min_miles: "", max_miles: "" });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").order("name");
      return data || [];
    },
  });

  const { data: milesPrograms = [], refetch: refetchMiles } = useQuery({
    queryKey: ["supplier_miles_programs", selectedSupplier?.id],
    enabled: !!selectedSupplier,
    queryFn: async () => {
      const { data } = await supabase
        .from("supplier_miles_programs")
        .select("*")
        .eq("supplier_id", selectedSupplier.id)
        .order("program_name")
        .order("min_miles");
      return (data || []) as MilesProgram[];
    },
  });

  // Group miles programs by program_name
  const groupedPrograms = milesPrograms.reduce<Record<string, MilesProgram[]>>((acc, mp) => {
    if (!acc[mp.program_name]) acc[mp.program_name] = [];
    acc[mp.program_name].push(mp);
    return acc;
  }, {});

  const filtered = suppliers.filter((s: any) =>
    !search || (s.name || "").toLowerCase().includes(search.toLowerCase()) || (s.cnpj || "").includes(search)
  );

  const resetForm = () => setForm({ name: "", cnpj: "", contact_name: "", phone: "", email: "", category: "", payment_conditions: "", bank_pix_key: "" });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    if (editingSupplier) {
      const { error } = await supabase.from("suppliers").update(form).eq("id", editingSupplier.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Fornecedor atualizado!");
      if (selectedSupplier?.id === editingSupplier.id) setSelectedSupplier({ ...selectedSupplier, ...form });
    } else {
      const { error } = await supabase.from("suppliers").insert(form);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Fornecedor cadastrado!");
    }
    qc.invalidateQueries({ queryKey: ["suppliers"] });
    setShowForm(false);
    setEditingSupplier(null);
    resetForm();
  };

  const openEdit = (s: any) => {
    setEditingSupplier(s);
    setForm({ name: s.name || "", cnpj: s.cnpj || "", contact_name: s.contact_name || "", phone: s.phone || "", email: s.email || "", category: s.category || "", payment_conditions: s.payment_conditions || "", bank_pix_key: s.bank_pix_key || "" });
    setShowForm(true);
  };

  const addMilesProgram = async () => {
    if (!mpForm.program_name.trim()) { toast.error("Nome do programa obrigatório"); return; }
    const price = parseFloat(mpForm.price_per_thousand);
    if (isNaN(price) || price <= 0) { toast.error("Valor do milheiro inválido"); return; }
    const minMiles = parseInt(mpForm.min_miles) || 0;
    const maxMiles = mpForm.max_miles ? parseInt(mpForm.max_miles) : null;
    if (maxMiles !== null && maxMiles <= minMiles) { toast.error("Máximo deve ser maior que mínimo"); return; }

    const { error } = await supabase.from("supplier_miles_programs").insert({
      supplier_id: selectedSupplier.id,
      program_name: mpForm.program_name.trim(),
      price_per_thousand: price,
      min_miles: minMiles,
      max_miles: maxMiles,
    });
    if (error) {
      if (error.code === "23505") toast.error("Faixa já cadastrada para este programa");
      else toast.error("Erro ao salvar");
      return;
    }
    toast.success("Faixa adicionada!");
    setMpForm({ program_name: "", price_per_thousand: "", min_miles: "", max_miles: "" });
    setExpandedPrograms(prev => ({ ...prev, [mpForm.program_name.trim()]: true }));
    refetchMiles();
  };

  const deleteMilesProgram = async (id: string) => {
    await supabase.from("supplier_miles_programs").delete().eq("id", id);
    toast.success("Faixa removida");
    refetchMiles();
  };

  const toggleMilesProgram = async (mp: MilesProgram) => {
    await supabase.from("supplier_miles_programs").update({ is_active: !mp.is_active }).eq("id", mp.id);
    refetchMiles();
  };

  const startEditTier = (mp: MilesProgram) => {
    setEditingTier(mp.id);
    setEditTierForm({
      price_per_thousand: String(mp.price_per_thousand),
      min_miles: String(mp.min_miles),
      max_miles: mp.max_miles ? String(mp.max_miles) : "",
    });
  };

  const saveEditTier = async (mp: MilesProgram) => {
    const price = parseFloat(editTierForm.price_per_thousand);
    if (isNaN(price) || price <= 0) { toast.error("Valor inválido"); return; }
    const minMiles = parseInt(editTierForm.min_miles) || 0;
    const maxMiles = editTierForm.max_miles ? parseInt(editTierForm.max_miles) : null;
    if (maxMiles !== null && maxMiles <= minMiles) { toast.error("Máximo deve ser maior que mínimo"); return; }
    const { error } = await supabase.from("supplier_miles_programs").update({
      price_per_thousand: price,
      min_miles: minMiles,
      max_miles: maxMiles,
    }).eq("id", mp.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Faixa atualizada!");
    setEditingTier(null);
    refetchMiles();
  };

  const toggleExpand = (name: string) => {
    setExpandedPrograms(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">{suppliers.length} cadastrados</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setEditingSupplier(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">CNPJ</TableHead>
                <TableHead className="text-xs">Contato</TableHead>
                <TableHead className="text-xs">Telefone</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Categoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedSupplier(s)}>
                  <TableCell className="text-xs font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" /> {s.name}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{s.cnpj || '-'}</TableCell>
                  <TableCell className="text-xs">{s.contact_name || '-'}</TableCell>
                  <TableCell className="text-xs">{s.phone || '-'}</TableCell>
                  <TableCell className="text-xs">{s.email || '-'}</TableCell>
                  <TableCell className="text-xs">{s.category || '-'}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhum fornecedor</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditingSupplier(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { key: "name", label: "Nome *" },
              { key: "cnpj", label: "CNPJ" },
              { key: "contact_name", label: "Contato" },
              { key: "phone", label: "Telefone" },
              { key: "email", label: "Email" },
              { key: "category", label: "Categoria" },
              { key: "payment_conditions", label: "Condições de Pagamento" },
              { key: "bank_pix_key", label: "Chave Pix" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <Button onClick={handleSave} className="w-full">{editingSupplier ? "Atualizar" : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Sheet */}
      <Sheet open={!!selectedSupplier} onOpenChange={(o) => { if (!o) setSelectedSupplier(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> {selectedSupplier?.name}
            </SheetTitle>
          </SheetHeader>

          {selectedSupplier && (
            <div className="mt-6 space-y-6">
              {/* Supplier Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Dados Cadastrais</h3>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(selectedSupplier)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["CNPJ", selectedSupplier.cnpj],
                    ["Contato", selectedSupplier.contact_name],
                    ["Telefone", selectedSupplier.phone],
                    ["Email", selectedSupplier.email],
                    ["Categoria", selectedSupplier.category],
                    ["Pagamento", selectedSupplier.payment_conditions],
                    ["Pix", selectedSupplier.bank_pix_key],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <span className="text-muted-foreground">{label}</span>
                      <p className="font-medium">{(val as string) || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Miles Programs */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Programas de Milhas</h3>

                {Object.keys(groupedPrograms).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(groupedPrograms).map(([programName, tiers]) => {
                      const isExpanded = expandedPrograms[programName] ?? true;
                      const allActive = tiers.every(t => t.is_active);
                      return (
                        <div key={programName} className="rounded-lg border bg-muted/20 overflow-hidden">
                          <button
                            onClick={() => toggleExpand(programName)}
                            className="flex items-center justify-between w-full p-3 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                              <span className="text-sm font-semibold">{programName}</span>
                              <Badge variant={allActive ? "default" : "secondary"} className="text-[10px]">
                                {tiers.length} {tiers.length === 1 ? "faixa" : "faixas"}
                              </Badge>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="border-t">
                              {tiers.map((mp) => (
                                <div key={mp.id} className="flex items-center justify-between px-3 py-2 border-b last:border-0 bg-background/50">
                                  {editingTier === mp.id ? (
                                    <>
                                      <div className="flex-1 grid grid-cols-3 gap-1.5 mr-2">
                                        <div>
                                          <Label className="text-[9px] text-muted-foreground">R$/Milheiro</Label>
                                          <Input type="number" step="0.01" value={editTierForm.price_per_thousand} onChange={e => setEditTierForm({ ...editTierForm, price_per_thousand: e.target.value })} className="h-7 text-xs" />
                                        </div>
                                        <div>
                                          <Label className="text-[9px] text-muted-foreground">De (milhas)</Label>
                                          <Input type="number" value={editTierForm.min_miles} onChange={e => setEditTierForm({ ...editTierForm, min_miles: e.target.value })} className="h-7 text-xs" />
                                        </div>
                                        <div>
                                          <Label className="text-[9px] text-muted-foreground">Até (milhas)</Label>
                                          <Input type="number" placeholder="∞" value={editTierForm.max_miles} onChange={e => setEditTierForm({ ...editTierForm, max_miles: e.target.value })} className="h-7 text-xs" />
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => saveEditTier(mp)}><Check className="w-3.5 h-3.5" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTier(null)}><X className="w-3.5 h-3.5" /></Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={mp.is_active ? "default" : "secondary"}
                                          className="cursor-pointer text-[10px] min-w-[48px] justify-center"
                                          onClick={() => toggleMilesProgram(mp)}
                                        >
                                          {mp.is_active ? "Ativo" : "Inativo"}
                                        </Badge>
                                        <div>
                                          <p className="text-xs font-medium">
                                            R$ {Number(mp.price_per_thousand).toFixed(2)} / milheiro
                                          </p>
                                          <p className="text-[10px] text-muted-foreground">
                                            {formatMiles(mp.min_miles)} {mp.max_miles ? `até ${formatMiles(mp.max_miles)}` : "+"} milhas
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-0.5">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditTier(mp)}><Pencil className="w-3 h-3" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMilesProgram(mp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum programa cadastrado</p>
                )}

                {/* Add new tier */}
                <div className="space-y-2 p-3 rounded-lg border border-dashed">
                  <p className="text-xs font-medium text-muted-foreground">Adicionar faixa de preço</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Programa</Label>
                      <Input
                        placeholder="Ex: Smiles, Latam Pass..."
                        value={mpForm.program_name}
                        onChange={(e) => setMpForm({ ...mpForm, program_name: e.target.value })}
                        className="h-8 text-xs"
                        list="program-suggestions"
                      />
                      <datalist id="program-suggestions">
                        {Object.keys(groupedPrograms).map(name => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">R$ / Milheiro</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={mpForm.price_per_thousand}
                        onChange={(e) => setMpForm({ ...mpForm, price_per_thousand: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">De (milhas)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={mpForm.min_miles}
                        onChange={(e) => setMpForm({ ...mpForm, min_miles: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Até (milhas)</Label>
                      <Input
                        type="number"
                        placeholder="Sem limite"
                        value={mpForm.max_miles}
                        onChange={(e) => setMpForm({ ...mpForm, max_miles: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs" onClick={addMilesProgram}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Faixa
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
