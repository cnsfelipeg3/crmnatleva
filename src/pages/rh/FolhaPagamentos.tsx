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
import { Plus, Download, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function FolhaPagamentos() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    const [e, p] = await Promise.all([
      supabase.from("employees").select("*").eq("status", "ativo").order("full_name"),
      supabase.from("payroll").select("*, employees(full_name, position, department)").gte("reference_month", `${selectedMonth}-01`).lte("reference_month", `${selectedMonth}-31`).order("created_at", { ascending: false }),
    ]);
    setEmployees(e.data || []);
    setPayroll(p.data || []);
  };
  useEffect(() => { load(); }, [selectedMonth]);

  const filtered = payroll.filter(p => filterStatus === "todos" || p.status === filterStatus);

  const totals = filtered.reduce((acc, p) => ({
    salary: acc.salary + Number(p.base_salary),
    commission: acc.commission + Number(p.commission_value),
    bonus: acc.bonus + Number(p.bonus_value),
    deductions: acc.deductions + Number(p.deductions),
    net: acc.net + Number(p.net_total),
  }), { salary: 0, commission: 0, bonus: 0, deductions: 0, net: 0 });

  const handleSave = async () => {
    if (!form.employee_id) { toast.error("Selecione o colaborador"); return; }
    const net = Number(form.base_salary || 0) + Number(form.commission_value || 0) + Number(form.bonus_value || 0) + Number(form.overtime_value || 0) + Number(form.reimbursements || 0) - Number(form.deductions || 0) - Number(form.advances || 0);
    const payload = { ...form, reference_month: `${selectedMonth}-01`, net_total: net };
    if (form.id) {
      await supabase.from("payroll").update(payload).eq("id", form.id);
    } else {
      await supabase.from("payroll").insert(payload);
    }
    toast.success("Pagamento salvo");
    setShowForm(false); setForm({}); load();
  };

  const generateAll = async () => {
    const existing = payroll.map(p => p.employee_id);
    const missing = employees.filter(e => !existing.includes(e.id));
    if (missing.length === 0) { toast.info("Todos já possuem registro neste mês"); return; }
    const inserts = missing.map(e => ({
      employee_id: e.id, reference_month: `${selectedMonth}-01`, base_salary: e.base_salary || 0, net_total: e.base_salary || 0,
    }));
    await supabase.from("payroll").insert(inserts);
    toast.success(`${missing.length} registros gerados`);
    load();
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const statusColor = (s: string) => s === "pago" ? "bg-emerald-500/10 text-emerald-600" : s === "previsto" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display">Folha & Pagamentos</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateAll}><DollarSign className="w-4 h-4 mr-1" />Gerar Folha</Button>
          <Button size="sm" onClick={() => { setForm({}); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Novo</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[{ l: "Salários", v: totals.salary }, { l: "Comissões", v: totals.commission }, { l: "Bônus", v: totals.bonus }, { l: "Descontos", v: totals.deductions }, { l: "Líquido Total", v: totals.net }].map((c, i) => (
          <Card key={i} className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{c.l}</p><p className="text-lg font-bold font-mono">{fmt(c.v)}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-[160px]" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="previsto">Previsto</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Salário</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-right">Bônus</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setForm(p); setShowForm(true); }}>
                  <TableCell className="font-medium">{p.employees?.full_name}</TableCell>
                  <TableCell className="text-xs">{p.employees?.position}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(Number(p.base_salary))}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(Number(p.commission_value))}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(Number(p.bonus_value))}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmt(Number(p.deductions))}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(Number(p.net_total))}</TableCell>
                  <TableCell><Badge className={statusColor(p.status)}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador</Label>
              <Select value={form.employee_id || ""} onValueChange={v => { const emp = employees.find(e => e.id === v); setForm({ ...form, employee_id: v, base_salary: emp?.base_salary || 0 }); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {["base_salary", "commission_value", "bonus_value", "overtime_value", "deductions", "reimbursements", "advances"].map(f => (
              <div key={f}><Label>{f.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</Label><Input type="number" value={form[f] || ""} onChange={e => setForm({ ...form, [f]: e.target.value })} /></div>
            ))}
            <div><Label>Status</Label>
              <Select value={form.status || "previsto"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="previsto">Previsto</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
