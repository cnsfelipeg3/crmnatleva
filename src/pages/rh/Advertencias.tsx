import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

const WARNING_TYPES = ["atraso_recorrente", "falta", "conduta", "desempenho", "outro"];
const SEVERITIES = [
  { value: "verbal", label: "Verbal", color: "bg-amber-500/10 text-amber-600" },
  { value: "escrita", label: "Escrita", color: "bg-orange-500/10 text-orange-600" },
  { value: "suspensao", label: "Suspensão", color: "bg-red-500/10 text-red-600" },
];

export default function Advertencias() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [filterStatus, setFilterStatus] = useState("todos");
  const [search, setSearch] = useState("");

  const load = async () => {
    const [e, w] = await Promise.all([
      supabase.from("employees").select("*").order("full_name"),
      supabase.from("warnings").select("*, employees(full_name), issuer:issued_by(full_name)").order("date_issued", { ascending: false }),
    ]);
    setEmployees(e.data || []);
    setWarnings(w.data || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = warnings.filter(w => {
    if (filterStatus !== "todos" && w.status !== filterStatus) return false;
    if (search && !w.employees?.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.employee_id || !form.description) { toast.error("Preencha campos obrigatórios"); return; }
    const payload = {
      employee_id: form.employee_id, warning_type: form.warning_type || "outro",
      severity: form.severity || "verbal", description: form.description,
      date_issued: form.date_issued || new Date().toISOString().slice(0, 10),
      status: form.status || "aberta", issued_by: form.issued_by || null, notes: form.notes || null,
    };
    if (form.id) { await supabase.from("warnings").update(payload).eq("id", form.id); }
    else { await supabase.from("warnings").insert(payload); }
    toast.success("Advertência salva"); setShowForm(false); setForm({}); load();
  };

  const sevInfo = (s: string) => SEVERITIES.find(sv => sv.value === s) || SEVERITIES[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display">Advertências & Ocorrências</h1></div>
        <Button size="sm" onClick={() => { setForm({}); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Nova</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SEVERITIES.map(s => (
          <Card key={s.value} className="border-border/50"><CardContent className="p-4 flex items-center gap-3">
            <Badge className={s.color}>{s.label}</Badge>
            <span className="text-xl font-bold font-mono">{warnings.filter(w => w.severity === s.value).length}</span>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="aberta">Aberta</SelectItem><SelectItem value="encerrada">Encerrada</SelectItem></SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(w => (
                <TableRow key={w.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setForm(w); setShowForm(true); }}>
                  <TableCell className="font-mono text-xs">{w.date_issued}</TableCell>
                  <TableCell className="font-medium">{w.employees?.full_name}</TableCell>
                  <TableCell className="text-xs">{w.warning_type}</TableCell>
                  <TableCell><Badge className={sevInfo(w.severity).color}>{sevInfo(w.severity).label}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{w.description}</TableCell>
                  <TableCell><Badge variant="outline">{w.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} Advertência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador</Label>
              <Select value={form.employee_id || ""} onValueChange={v => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo</Label>
              <Select value={form.warning_type || "outro"} onValueChange={v => setForm({ ...form, warning_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WARNING_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nível</Label>
              <Select value={form.severity || "verbal"} onValueChange={v => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.date_issued || ""} onChange={e => setForm({ ...form, date_issued: e.target.value })} /></div>
            <div><Label>Descrição *</Label><Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label>Emitido por</Label>
              <Select value={form.issued_by || ""} onValueChange={v => setForm({ ...form, issued_by: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status || "aberta"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="aberta">Aberta</SelectItem><SelectItem value="encerrada">Encerrada</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
