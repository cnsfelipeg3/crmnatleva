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
import { Progress } from "@/components/ui/progress";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

const KPI_FIELDS = [
  { key: "attendance_score", label: "Presença" },
  { key: "goals_score", label: "Metas" },
  { key: "quality_score", label: "Qualidade" },
  { key: "teamwork_score", label: "Trabalho em Equipe" },
  { key: "initiative_score", label: "Iniciativa" },
];

export default function Desempenho() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  const load = async () => {
    const [e, s] = await Promise.all([
      supabase.from("employees").select("*").eq("status", "ativo").order("full_name"),
      supabase.from("performance_scores").select("*, employees(full_name, position, department)").order("period_month", { ascending: false }),
    ]);
    setEmployees(e.data || []);
    setScores(s.data || []);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.employee_id) { toast.error("Selecione o colaborador"); return; }
    const overall = KPI_FIELDS.reduce((s, f) => s + (Number(form[f.key]) || 0), 0) / KPI_FIELDS.length;
    const payload = {
      employee_id: form.employee_id, period_month: form.period_month || new Date().toISOString().slice(0, 10),
      attendance_score: Number(form.attendance_score) || 0, goals_score: Number(form.goals_score) || 0,
      quality_score: Number(form.quality_score) || 0, teamwork_score: Number(form.teamwork_score) || 0,
      initiative_score: Number(form.initiative_score) || 0, overall_score: Math.round(overall), notes: form.notes || null,
    };
    if (form.id) { await supabase.from("performance_scores").update(payload).eq("id", form.id); }
    else { await supabase.from("performance_scores").insert(payload); }
    toast.success("Score salvo"); setShowForm(false); setForm({}); load();
  };

  const radarData = selectedEmp ? KPI_FIELDS.map(f => {
    const empScores = scores.filter(s => s.employee_id === selectedEmp.id);
    const avg = empScores.length > 0 ? empScores.reduce((s, sc) => s + Number(sc[f.key]), 0) / empScores.length : 0;
    return { subject: f.label, value: Math.round(avg) };
  }) : [];

  const latestScores = employees.map(e => {
    const latest = scores.find(s => s.employee_id === e.id);
    return { ...e, score: latest?.overall_score || 0, latest };
  }).sort((a, b) => b.score - a.score);

  const scoreColor = (s: number) => s >= 80 ? "text-emerald-500" : s >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display">Desempenho & KPIs</h1></div>
        <Button size="sm" onClick={() => { setForm({}); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Avaliar</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">Perfil de Competências</p>
            <Select value={selectedEmp?.id || ""} onValueChange={v => setSelectedEmp(employees.find(e => e.id === v))}>
              <SelectTrigger><SelectValue placeholder="Selecione um colaborador..." /></SelectTrigger>
              <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedEmp && (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                  <Radar name="Score" dataKey="value" stroke="hsl(160,60%,45%)" fill="hsl(160,60%,45%)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ranking */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Ranking Geral</p>
            <div className="space-y-2 max-h-[280px] overflow-auto">
              {latestScores.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedEmp(e)}>
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}°</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{e.full_name}</p>
                    <p className="text-xs text-muted-foreground">{e.position} · {e.department}</p>
                  </div>
                  <span className={`text-lg font-bold font-mono ${scoreColor(e.score)}`}>{e.score}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All scores table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Mês</TableHead>
                {KPI_FIELDS.map(f => <TableHead key={f.key} className="text-center">{f.label}</TableHead>)}
                <TableHead className="text-center">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.slice(0, 50).map(s => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setForm(s); setShowForm(true); }}>
                  <TableCell className="font-medium">{s.employees?.full_name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.period_month}</TableCell>
                  {KPI_FIELDS.map(f => <TableCell key={f.key} className="text-center font-mono text-xs">{s[f.key]}</TableCell>)}
                  <TableCell className={`text-center font-bold font-mono ${scoreColor(s.overall_score)}`}>{s.overall_score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>Avaliar Desempenho</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador</Label>
              <Select value={form.employee_id || ""} onValueChange={v => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Mês Referência</Label><Input type="date" value={form.period_month || ""} onChange={e => setForm({ ...form, period_month: e.target.value })} /></div>
            {KPI_FIELDS.map(f => (
              <div key={f.key}><Label>{f.label} (0-100)</Label><Input type="number" min={0} max={100} value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} /></div>
            ))}
            <div><Label>Observações</Label><Input value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
