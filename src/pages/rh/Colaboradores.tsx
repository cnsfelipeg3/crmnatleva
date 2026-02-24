import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Download, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const POSITIONS = ["SDR", "Vendas", "Consultor", "Operação", "Financeiro", "Admin"];
const DEPARTMENTS = ["Comercial", "Operacional", "Financeiro", "Administrativo", "Marketing"];
const CONTRACT_TYPES = ["CLT", "PJ", "Freelancer", "Estágio"];
const STATUSES = ["ativo", "inativo", "afastado"];

export default function Colaboradores() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterDept, setFilterDept] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("full_name");
    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => {
    if (filterStatus !== "todos" && e.status !== filterStatus) return false;
    if (filterDept !== "todos" && e.department !== filterDept) return false;
    if (search && !e.full_name.toLowerCase().includes(search.toLowerCase()) && !e.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.full_name) { toast.error("Nome é obrigatório"); return; }
    const payload = {
      full_name: form.full_name,
      position: form.position || "Vendas",
      department: form.department || "Comercial",
      hire_date: form.hire_date || new Date().toISOString().slice(0, 10),
      contract_type: form.contract_type || "CLT",
      base_salary: Number(form.base_salary) || 0,
      email: form.email || null,
      phone: form.phone || null,
      work_regime: form.work_regime || "presencial",
      status: form.status || "ativo",
      observations: form.observations || null,
    };
    if (form.id) {
      await supabase.from("employees").update(payload).eq("id", form.id);
      toast.success("Colaborador atualizado");
    } else {
      await supabase.from("employees").insert(payload);
      toast.success("Colaborador criado");
    }
    setShowForm(false);
    setForm({});
    load();
  };

  const exportCSV = () => {
    const headers = "Nome,Cargo,Área,Contrato,Status,Salário,Admissão\n";
    const rows = filtered.map(e => `"${e.full_name}","${e.position}","${e.department}","${e.contract_type}","${e.status}",${e.base_salary},"${e.hire_date}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "colaboradores.csv"; a.click();
  };

  const statusColor = (s: string) => s === "ativo" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : s === "afastado" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-600 border-red-500/20";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} colaboradores encontrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button size="sm" onClick={() => { setForm({}); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Novo</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas Áreas</SelectItem>
            {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Salário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setForm(e); setShowForm(true); }}>
                  <TableCell className="font-medium">{e.full_name}</TableCell>
                  <TableCell>{e.position}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell><Badge variant="outline">{e.contract_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{e.hire_date}</TableCell>
                  <TableCell><Badge className={statusColor(e.status)}>{e.status}</Badge></TableCell>
                  <TableCell className="text-right font-mono">R$ {Number(e.base_salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} Colaborador</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome completo *</Label><Input value={form.full_name || ""} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cargo</Label>
                <Select value={form.position || "Vendas"} onValueChange={v => setForm({ ...form, position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Área</Label>
                <Select value={form.department || "Comercial"} onValueChange={v => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contrato</Label>
                <Select value={form.contract_type || "CLT"} onValueChange={v => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Admissão</Label><Input type="date" value={form.hire_date || ""} onChange={e => setForm({ ...form, hire_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Salário Base</Label><Input type="number" value={form.base_salary || ""} onChange={e => setForm({ ...form, base_salary: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status || "ativo"} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Email</Label><Input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Regime</Label>
              <Select value={form.work_regime || "presencial"} onValueChange={v => setForm({ ...form, work_regime: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                  <SelectItem value="remoto">Remoto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">{form.id ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
