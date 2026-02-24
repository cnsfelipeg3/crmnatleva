import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, LogIn, Coffee, UtensilsCrossed, LogOut, Search, Download, Calendar } from "lucide-react";
import { toast } from "sonner";

type PunchType = "clock_in" | "lunch_out" | "lunch_in" | "clock_out";
const PUNCH_LABELS: Record<PunchType, { label: string; icon: any; color: string }> = {
  clock_in: { label: "Entrada", icon: LogIn, color: "bg-emerald-500" },
  lunch_out: { label: "Saída Almoço", icon: Coffee, color: "bg-amber-500" },
  lunch_in: { label: "Volta Almoço", icon: UtensilsCrossed, color: "bg-blue-500" },
  clock_out: { label: "Saída", icon: LogOut, color: "bg-red-500" },
};

export default function Ponto() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState("todos");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [punchDialog, setPunchDialog] = useState(false);
  const [punchEmpId, setPunchEmpId] = useState("");
  const [justification, setJustification] = useState("");
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustEntry, setAdjustEntry] = useState<any>(null);

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    const [e, t] = await Promise.all([
      supabase.from("employees").select("*").eq("status", "ativo").order("full_name"),
      supabase.from("time_entries").select("*, employees(full_name, work_schedule_start, work_schedule_end)").gte("entry_date", `${selectedMonth}-01`).lte("entry_date", `${selectedMonth}-31`).order("entry_date", { ascending: false }),
    ]);
    setEmployees(e.data || []);
    setEntries(t.data || []);
  };

  useEffect(() => { load(); }, [selectedMonth]);

  const handlePunch = async (type: PunchType) => {
    if (!punchEmpId) { toast.error("Selecione o colaborador"); return; }
    const now = new Date().toISOString();
    
    // Get or create today's entry
    let { data: existing } = await supabase.from("time_entries").select("*").eq("employee_id", punchEmpId).eq("entry_date", today).single();
    
    if (!existing) {
      const { data: created } = await supabase.from("time_entries").insert({ employee_id: punchEmpId, entry_date: today, [type]: now, justification: justification || null, device_info: navigator.userAgent }).select().single();
      existing = created;
    } else {
      await supabase.from("time_entries").update({ [type]: now, justification: justification || existing.justification }).eq("id", existing.id);
    }

    // Calculate late minutes if clock_in
    if (type === "clock_in") {
      const emp = employees.find(e => e.id === punchEmpId);
      if (emp?.work_schedule_start) {
        const [h, m] = emp.work_schedule_start.split(":").map(Number);
        const scheduled = new Date(); scheduled.setHours(h, m, 0, 0);
        const late = Math.max(0, Math.floor((Date.now() - scheduled.getTime()) / 60000));
        if (late > 0) {
          await supabase.from("time_entries").update({ late_minutes: late }).eq("id", existing?.id || "");
        }
      }
    }

    // Calculate worked minutes if clock_out
    if (type === "clock_out" && existing?.clock_in) {
      const clockIn = new Date(existing.clock_in).getTime();
      const clockOut = Date.now();
      const lunchMin = existing.lunch_out && existing.lunch_in ? Math.floor((new Date(existing.lunch_in).getTime() - new Date(existing.lunch_out).getTime()) / 60000) : 0;
      const worked = Math.floor((clockOut - clockIn) / 60000) - (lunchMin > 0 ? 0 : 60);
      await supabase.from("time_entries").update({ worked_minutes: Math.max(0, worked), status: "completo" }).eq("id", existing.id);
    }

    toast.success(`${PUNCH_LABELS[type].label} registrada!`);
    setPunchDialog(false);
    setJustification("");
    load();
  };

  const getNextPunch = (empId: string): PunchType | null => {
    const todayEntry = entries.find(e => e.employee_id === empId && e.entry_date === today);
    if (!todayEntry) return "clock_in";
    if (!todayEntry.clock_in) return "clock_in";
    if (!todayEntry.lunch_out) return "lunch_out";
    if (!todayEntry.lunch_in) return "lunch_in";
    if (!todayEntry.clock_out) return "clock_out";
    return null;
  };

  const filtered = entries.filter(e => {
    if (selectedEmp !== "todos" && e.employee_id !== selectedEmp) return false;
    if (search && !e.employees?.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatTime = (ts: string | null) => ts ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
  const statusColor = (s: string) => s === "completo" ? "bg-emerald-500/10 text-emerald-600" : s === "falta" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600";

  const exportCSV = () => {
    const headers = "Data,Colaborador,Entrada,Saída Almoço,Volta Almoço,Saída,Trabalhado(min),Atraso(min),Status\n";
    const rows = filtered.map(e => `"${e.entry_date}","${e.employees?.full_name}","${formatTime(e.clock_in)}","${formatTime(e.lunch_out)}","${formatTime(e.lunch_in)}","${formatTime(e.clock_out)}",${e.worked_minutes},${e.late_minutes},"${e.status}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ponto-${selectedMonth}.csv`; a.click();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Controle de Ponto</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} registros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button size="sm" onClick={() => setPunchDialog(true)}><Clock className="w-4 h-4 mr-1" />Bater Ponto</Button>
        </div>
      </div>

      {/* Punch Cards for today */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(PUNCH_LABELS).map(([key, val]) => {
          const Icon = val.icon;
          const count = entries.filter(e => e.entry_date === today && e[key]).length;
          return (
            <Card key={key} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${val.color} text-white`}><Icon className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{val.label} Hoje</p>
                  <p className="text-xl font-bold font-mono">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-[160px]" />
        <Select value={selectedEmp} onValueChange={setSelectedEmp}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Almoço</TableHead>
                <TableHead>Volta</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Trabalhado</TableHead>
                <TableHead>Atraso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setAdjustEntry(e); setAdjustDialog(true); }}>
                  <TableCell className="font-mono text-xs">{e.entry_date}</TableCell>
                  <TableCell className="font-medium">{e.employees?.full_name}</TableCell>
                  <TableCell className="font-mono text-xs">{formatTime(e.clock_in)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatTime(e.lunch_out)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatTime(e.lunch_in)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatTime(e.clock_out)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.worked_minutes ? `${Math.floor(e.worked_minutes / 60)}h${(e.worked_minutes % 60).toString().padStart(2, "0")}` : "—"}</TableCell>
                  <TableCell>{e.late_minutes > 0 ? <Badge variant="outline" className="bg-amber-500/10 text-amber-600">{e.late_minutes}min</Badge> : "—"}</TableCell>
                  <TableCell><Badge className={statusColor(e.status)}>{e.status}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Punch Dialog */}
      <Dialog open={punchDialog} onOpenChange={setPunchDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Bater Ponto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador</Label>
              <Select value={punchEmpId} onValueChange={setPunchEmpId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Justificativa (opcional)</Label><Textarea value={justification} onChange={e => setJustification(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PUNCH_LABELS) as [PunchType, any][]).map(([key, val]) => {
                const Icon = val.icon;
                const next = punchEmpId ? getNextPunch(punchEmpId) : null;
                return (
                  <Button key={key} variant={next === key ? "default" : "outline"} className="flex items-center gap-2" onClick={() => handlePunch(key)} disabled={!punchEmpId}>
                    <Icon className="w-4 h-4" />{val.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Ponto</DialogTitle></DialogHeader>
          {adjustEntry && (
            <div className="space-y-2 text-sm">
              <p><strong>Colaborador:</strong> {adjustEntry.employees?.full_name}</p>
              <p><strong>Data:</strong> {adjustEntry.entry_date}</p>
              <p><strong>Entrada:</strong> {formatTime(adjustEntry.clock_in)}</p>
              <p><strong>Saída Almoço:</strong> {formatTime(adjustEntry.lunch_out)}</p>
              <p><strong>Volta Almoço:</strong> {formatTime(adjustEntry.lunch_in)}</p>
              <p><strong>Saída:</strong> {formatTime(adjustEntry.clock_out)}</p>
              <p><strong>Trabalhado:</strong> {adjustEntry.worked_minutes}min</p>
              <p><strong>Atraso:</strong> {adjustEntry.late_minutes}min</p>
              {adjustEntry.justification && <p><strong>Justificativa:</strong> {adjustEntry.justification}</p>}
              {adjustEntry.device_info && <p className="text-xs text-muted-foreground truncate"><strong>Dispositivo:</strong> {adjustEntry.device_info}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
