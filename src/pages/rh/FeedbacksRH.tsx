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
import { Textarea } from "@/components/ui/textarea";
import { Plus, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { DatePartsInput } from "@/components/ui/date-parts-input";

const TYPES = [
  { value: "positivo", label: "Positivo", color: "bg-emerald-500/10 text-emerald-600" },
  { value: "ajuste", label: "Ajuste", color: "bg-amber-500/10 text-amber-600" },
  { value: "pdi", label: "PDI", color: "bg-blue-500/10 text-blue-600" },
];

export default function FeedbacksRH() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [filterType, setFilterType] = useState("todos");
  const [search, setSearch] = useState("");

  const load = async () => {
    const [e, f] = await Promise.all([
      supabase.from("employees").select("*").eq("status", "ativo").order("full_name"),
      supabase.from("feedbacks").select("*, employees(full_name), given:given_by(full_name)").order("meeting_date", { ascending: false }),
    ]);
    setEmployees(e.data || []);
    setFeedbacks(f.data || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = feedbacks.filter(f => {
    if (filterType !== "todos" && f.feedback_type !== filterType) return false;
    if (search && !f.employees?.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.employee_id || !form.points) { toast.error("Preencha colaborador e pontos"); return; }
    const payload = {
      employee_id: form.employee_id, given_by: form.given_by || null,
      feedback_type: form.feedback_type || "positivo", context: form.context || null,
      points: form.points, action_plan: form.action_plan || null,
      next_followup: form.next_followup || null, meeting_date: form.meeting_date || new Date().toISOString().slice(0, 10),
      status: form.status || "aberto",
    };
    if (form.id) { await supabase.from("feedbacks").update(payload).eq("id", form.id); }
    else { await supabase.from("feedbacks").insert(payload); }
    toast.success("Feedback salvo"); setShowForm(false); setForm({}); load();
  };

  const typeInfo = (t: string) => TYPES.find(tt => tt.value === t) || TYPES[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display">Feedbacks & 1:1</h1></div>
        <Button size="sm" onClick={() => { setForm({}); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Novo Feedback</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TYPES.map(t => (
          <Card key={t.value} className="border-border/50 cursor-pointer hover:shadow-md" onClick={() => setFilterType(t.value)}>
            <CardContent className="p-4 flex items-center gap-3">
              <Badge className={t.color}>{t.label}</Badge>
              <span className="text-xl font-bold font-mono">{feedbacks.filter(f => f.feedback_type === t.value).length}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos</SelectItem>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
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
                <TableHead>Pontos</TableHead>
                <TableHead>Próximo Follow-up</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setForm(f); setShowForm(true); }}>
                  <TableCell className="font-mono text-xs">{f.meeting_date}</TableCell>
                  <TableCell className="font-medium">{f.employees?.full_name}</TableCell>
                  <TableCell><Badge className={typeInfo(f.feedback_type).color}>{typeInfo(f.feedback_type).label}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{f.points}</TableCell>
                  <TableCell className="font-mono text-xs">{f.next_followup || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{f.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} Feedback</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador</Label>
              <Select value={form.employee_id || ""} onValueChange={v => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Dado por</Label>
              <Select value={form.given_by || ""} onValueChange={v => setForm({ ...form, given_by: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo</Label>
              <Select value={form.feedback_type || "positivo"} onValueChange={v => setForm({ ...form, feedback_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><DatePartsInput value={form.meeting_date || ""} onChange={(iso) => setForm({ ...form, meeting_date: iso })} /></div>
            <div><Label>Contexto</Label><Textarea value={form.context || ""} onChange={e => setForm({ ...form, context: e.target.value })} rows={2} /></div>
            <div><Label>Pontos Abordados *</Label><Textarea value={form.points || ""} onChange={e => setForm({ ...form, points: e.target.value })} rows={3} /></div>
            <div><Label>Plano de Ação</Label><Textarea value={form.action_plan || ""} onChange={e => setForm({ ...form, action_plan: e.target.value })} rows={2} /></div>
            <div><Label>Próximo Follow-up</Label><DatePartsInput value={form.next_followup || ""} onChange={(iso) => setForm({ ...form, next_followup: iso })} /></div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
