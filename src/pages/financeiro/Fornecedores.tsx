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
import { Plus, Search, Building2, Trash2, Pencil } from "lucide-react";

interface MilesProgram {
  id: string;
  supplier_id: string;
  program_name: string;
  price_per_thousand: number;
  is_active: boolean;
  notes: string | null;
}

export default function Fornecedores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [form, setForm] = useState({ name: "", cnpj: "", contact_name: "", phone: "", email: "", category: "", payment_conditions: "", bank_pix_key: "" });
  const [mpForm, setMpForm] = useState({ program_name: "", price_per_thousand: "" });

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
        .order("program_name");
      return (data || []) as MilesProgram[];
    },
  });

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
    const { error } = await supabase.from("supplier_miles_programs").insert({
      supplier_id: selectedSupplier.id,
      program_name: mpForm.program_name.trim(),
      price_per_thousand: price,
    });
    if (error) {
      if (error.code === "23505") toast.error("Programa já cadastrado para este fornecedor");
      else toast.error("Erro ao salvar");
      return;
    }
    toast.success("Programa adicionado!");
    setMpForm({ program_name: "", price_per_thousand: "" });
    refetchMiles();
  };

  const deleteMilesProgram = async (id: string) => {
    await supabase.from("supplier_miles_programs").delete().eq("id", id);
    toast.success("Programa removido");
    refetchMiles();
  };

  const toggleMilesProgram = async (mp: MilesProgram) => {
    await supabase.from("supplier_miles_programs").update({ is_active: !mp.is_active }).eq("id", mp.id);
    refetchMiles();
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

                {milesPrograms.length > 0 ? (
                  <div className="space-y-2">
                    {milesPrograms.map((mp) => (
                      <div key={mp.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Badge variant={mp.is_active ? "default" : "secondary"} className="cursor-pointer text-[10px]" onClick={() => toggleMilesProgram(mp)}>
                            {mp.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          <div>
                            <span className="text-sm font-medium">{mp.program_name}</span>
                            <p className="text-xs text-muted-foreground">
                              R$ {Number(mp.price_per_thousand).toFixed(2)} / milheiro
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMilesProgram(mp.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum programa cadastrado</p>
                )}

                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Programa</Label>
                    <Input placeholder="Ex: Smiles, Latam Pass..." value={mpForm.program_name} onChange={(e) => setMpForm({ ...mpForm, program_name: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">R$ / Milheiro</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={mpForm.price_per_thousand} onChange={(e) => setMpForm({ ...mpForm, price_per_thousand: e.target.value })} className="h-9 text-xs" />
                  </div>
                  <Button size="sm" className="h-9" onClick={addMilesProgram}>
                    <Plus className="w-4 h-4" />
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
