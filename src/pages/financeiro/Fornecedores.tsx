import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Building2 } from "lucide-react";

export default function Fornecedores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", cnpj: "", contact_name: "", phone: "", email: "", category: "", payment_conditions: "", bank_pix_key: "" });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").order("name");
      return data || [];
    },
  });

  const filtered = suppliers.filter((s: any) =>
    !search || (s.name || "").toLowerCase().includes(search.toLowerCase()) || (s.cnpj || "").includes(search)
  );

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    const { error } = await supabase.from("suppliers").insert(form);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Fornecedor cadastrado!");
    qc.invalidateQueries({ queryKey: ["suppliers"] });
    setShowForm(false);
    setForm({ name: "", cnpj: "", contact_name: "", phone: "", email: "", category: "", payment_conditions: "", bank_pix_key: "" });
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">{suppliers.length} cadastrados</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
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
                <TableRow key={s.id} className="hover:bg-muted/50">
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
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
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
