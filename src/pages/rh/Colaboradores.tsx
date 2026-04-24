import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import EmployeeFormTabs from "@/components/rh/EmployeeFormTabs";

const DEPARTMENTS = ["Comercial", "Operacional", "Financeiro", "Administrativo", "Marketing", "Atendimento"];
const STATUSES = ["ativo", "inativo", "afastado"];

export default function Colaboradores() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterDept, setFilterDept] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

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
    
    // Auto-set termination date when status changes to inativo
    const termination_date = form.status === "inativo" && !form.termination_date
      ? new Date().toISOString().slice(0, 10)
      : form.termination_date || null;

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
      cpf: form.cpf || null,
      rg: form.rg || null,
      birth_date: form.birth_date || null,
      address_street: form.address_street || null,
      address_number: form.address_number || null,
      address_complement: form.address_complement || null,
      address_neighborhood: form.address_neighborhood || null,
      address_city: form.address_city || null,
      address_state: form.address_state || null,
      address_cep: form.address_cep || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      manager_id: form.manager_id || null,
      remuneration_type: form.remuneration_type || "fixo",
      commission_enabled: form.commission_enabled || false,
      commission_percent: Number(form.commission_percent) || 0,
      weekly_hours: Number(form.weekly_hours) || 44,
      work_schedule_start: form.work_schedule_start || "09:00",
      work_schedule_end: form.work_schedule_end || "18:00",
      lunch_duration_minutes: Number(form.lunch_duration_minutes) || 60,
      work_days: form.work_days || ["seg", "ter", "qua", "qui", "sex"],
      permissions: form.permissions || {},
      termination_date,
    };

    let employeeId = form.id;
    if (form.id) {
      await supabase.from("employees").update(payload).eq("id", form.id);
      toast.success("Colaborador atualizado");
    } else {
      const { data } = await supabase.from("employees").insert(payload).select().single();
      if (data) { setForm({ ...form, id: data.id }); employeeId = data.id; }
      toast.success("Colaborador criado");
    }

    // Sincroniza employee_permissions com o JSON granular
    if (employeeId && form.permissions && typeof form.permissions === "object") {
      const perms = form.permissions as Record<string, Partial<Record<"view"|"create"|"edit"|"delete", boolean>>>;
      // Limpa todas as permissões antigas e regrava
      await (supabase as any).from("employee_permissions").delete().eq("employee_id", employeeId);
      const rows = Object.entries(perms)
        .filter(([_, p]) => p && (p.view || p.create || p.edit || p.delete))
        .map(([menu_key, p]) => ({
          employee_id: employeeId,
          menu_key,
          can_view: !!p.view,
          can_create: !!p.create,
          can_edit: !!p.edit,
          can_delete: !!p.delete,
        }));
      if (rows.length > 0) {
        await (supabase as any).from("employee_permissions").insert(rows);
      }
    }

    setShowForm(false);
    setForm({});
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("employees").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success(`${deleteTarget.full_name} foi excluído`);
      setDeleteTarget(null);
      load();
    }
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
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium cursor-pointer" onClick={() => { setForm(e); setShowForm(true); }}>{e.full_name}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => { setForm(e); setShowForm(true); }}>{e.position}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => { setForm(e); setShowForm(true); }}>{e.department}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => { setForm(e); setShowForm(true); }}><Badge variant="outline">{e.contract_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs cursor-pointer" onClick={() => { setForm(e); setShowForm(true); }}>{e.hire_date ? e.hire_date.split('-').reverse().join('/') : '-'}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => { setForm(e); setShowForm(true); }}><Badge className={statusColor(e.status)}>{e.status}</Badge></TableCell>
                  <TableCell className="text-right font-mono cursor-pointer" onClick={() => { setForm(e); setShowForm(true); }}>R$ {Number(e.base_salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(ev) => { ev.stopPropagation(); setForm(e); setShowForm(true); }}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e); }}
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} Colaborador</DialogTitle></DialogHeader>
          <EmployeeFormTabs form={form} setForm={setForm} onSave={handleSave} employees={employees} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e vai remover <strong>{deleteTarget?.full_name}</strong> do sistema,
              junto com vínculos de permissões. Registros históricos (vendas, ponto, folha) ficam preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
