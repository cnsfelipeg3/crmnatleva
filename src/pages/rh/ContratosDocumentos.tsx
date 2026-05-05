import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, FileText, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DatePartsInput } from "@/components/ui/date-parts-input";

const DOC_TYPES = ["contrato", "aditivo", "documento_pessoal", "confidencialidade", "politica", "comprovante", "advertencia", "outro"];

export default function ContratosDocumentos() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [filterEmp, setFilterEmp] = useState("todos");
  const [filterType, setFilterType] = useState("todos");
  const [search, setSearch] = useState("");

  const load = async () => {
    const [e, d] = await Promise.all([
      supabase.from("employees").select("*").order("full_name"),
      supabase.from("employee_documents").select("*, employees(full_name)").order("created_at", { ascending: false }),
    ]);
    setEmployees(e.data || []);
    setDocs(d.data || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = docs.filter(d => {
    if (filterEmp !== "todos" && d.employee_id !== filterEmp) return false;
    if (filterType !== "todos" && d.document_type !== filterType) return false;
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const expiring = docs.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 30 * 86400000));

  const handleSave = async () => {
    if (!form.employee_id || !form.title) { toast.error("Preencha campos obrigatórios"); return; }
    const payload = {
      employee_id: form.employee_id, document_type: form.document_type || "outro",
      title: form.title, file_url: form.file_url || null, file_name: form.file_name || null,
      expiry_date: form.expiry_date || null, notes: form.notes || null,
    };
    if (form.id) { await supabase.from("employee_documents").update(payload).eq("id", form.id); }
    else { await supabase.from("employee_documents").insert(payload); }
    toast.success("Documento salvo"); setShowForm(false); setForm({}); load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display">Contratos & Documentos</h1></div>
        <Button size="sm" onClick={() => { setForm({}); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Novo</Button>
      </div>

      {expiring.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-amber-600"><AlertTriangle className="w-4 h-4" />Documentos a vencer em 30 dias</p>
            <div className="mt-2 space-y-1">
              {expiring.map(d => (
                <p key={d.id} className="text-xs">{d.employees?.full_name} — {d.title} (vence {d.expiry_date})</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar título..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos Tipos</SelectItem>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setForm(d); setShowForm(true); }}>
                  <TableCell className="font-medium">{d.employees?.full_name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{d.document_type.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>{d.title}</TableCell>
                  <TableCell className="font-mono text-xs">{d.expiry_date || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{d.created_at?.slice(0, 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} Documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador</Label>
              <Select value={form.employee_id || ""} onValueChange={v => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo</Label>
              <Select value={form.document_type || "outro"} onValueChange={v => setForm({ ...form, document_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Título *</Label><Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Validade</Label><DatePartsInput value={form.expiry_date || ""} onChange={(iso) => setForm({ ...form, expiry_date: iso })} /></div>
            <div><Label>Observações</Label><Input value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
