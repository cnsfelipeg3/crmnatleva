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
import { Plus, Target, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { DatePartsInput } from "@/components/ui/date-parts-input";

export default function MetasBonus() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [filterStatus, setFilterStatus] = useState("todos");

  const load = async () => {
    const [e, g] = await Promise.all([
      supabase.from("employees").select("*").eq("status", "ativo").order("full_name"),
      supabase.from("goals").select("*, employees(full_name, position, department)").order("period_end", { ascending: false }),
    ]);
    setEmployees(e.data || []);
    setGoals(g.data || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = goals.filter(g => filterStatus === "todos" || g.status === filterStatus);

  const handleSave = async () => {
    if (!form.title || !form.employee_id) { toast.error("Preencha título e colaborador"); return; }
    const payload = {
      employee_id: form.employee_id, title: form.title, description: form.description || null,
      target_value: Number(form.target_value) || 0, current_value: Number(form.current_value) || 0,
      period_start: form.period_start || new Date().toISOString().slice(0, 10),
      period_end: form.period_end || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      bonus_on_80: Number(form.bonus_on_80) || 0, bonus_on_100: Number(form.bonus_on_100) || 0, bonus_on_120: Number(form.bonus_on_120) || 0,
      status: form.status || "em_andamento",
    };
    if (form.id) {
      await supabase.from("goals").update(payload).eq("id", form.id);
    } else {
      await supabase.from("goals").insert(payload);
    }
    toast.success("Meta salva"); setShowForm(false); setForm({}); load();
  };

  const pct = (g: any) => g.target_value > 0 ? Math.min(150, Math.round((g.current_value / g.target_value) * 100)) : 0;
  const bonusFor = (g: any) => {
    const p = pct(g);
    if (p >= 120) return g.bonus_on_120;
    if (p >= 100) return g.bonus_on_100;
    if (p >= 80) return g.bonus_on_80;
    return 0;
  };

  const rankingData = goals.filter(g => g.status === "em_andamento").reduce((acc: any[], g) => {
    const name = g.employees?.full_name?.split(" ")[0] || "?";
    const existing = acc.find(a => a.name === name);
    if (existing) { existing.progress = Math.max(existing.progress, pct(g)); }
    else { acc.push({ name, progress: pct(g) }); }
    return acc;
  }, []).sort((a, b) => b.progress - a.progress).slice(0, 10);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display">Metas & Bônus</h1></div>
        <Button size="sm" onClick={() => { setForm({}); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Nova Meta</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Metas Ativas</p><p className="text-2xl font-bold font-mono">{goals.filter(g => g.status === "em_andamento").length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Batidas</p><p className="text-2xl font-bold font-mono text-emerald-500">{goals.filter(g => pct(g) >= 100).length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Em Risco (&lt;50%)</p><p className="text-2xl font-bold font-mono text-red-500">{goals.filter(g => g.status === "em_andamento" && pct(g) < 50).length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bônus Previsto</p><p className="text-2xl font-bold font-mono">R$ {goals.reduce((s, g) => s + Number(bonusFor(g)), 0).toLocaleString("pt-BR")}</p></CardContent></Card>
      </div>

      {/* Ranking */}
      {rankingData.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />Ranking de Performance</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rankingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="progress" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead className="text-right">Atual / Alvo</TableHead>
                <TableHead className="text-right">Bônus</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(g => (
                <TableRow key={g.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setForm(g); setShowForm(true); }}>
                  <TableCell className="font-medium">{g.employees?.full_name}</TableCell>
                  <TableCell>{g.title}</TableCell>
                  <TableCell><div className="flex items-center gap-2 min-w-[120px]"><Progress value={Math.min(100, pct(g))} className="h-2 flex-1" /><span className="text-xs font-mono">{pct(g)}%</span></div></TableCell>
                  <TableCell className="text-right font-mono text-xs">{g.current_value} / {g.target_value}</TableCell>
                  <TableCell className="text-right font-mono text-xs">R$ {Number(bonusFor(g)).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{g.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} Meta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Colaborador</Label>
              <Select value={form.employee_id || ""} onValueChange={v => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Título da Meta</Label><Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Alvo</Label><Input type="number" value={form.target_value || ""} onChange={e => setForm({ ...form, target_value: e.target.value })} /></div>
              <div><Label>Valor Atual</Label><Input type="number" value={form.current_value || ""} onChange={e => setForm({ ...form, current_value: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><DatePartsInput value={form.period_start || ""} onChange={(iso) => setForm({ ...form, period_start: iso })} /></div>
              <div><Label>Fim</Label><DatePartsInput value={form.period_end || ""} onChange={(iso) => setForm({ ...form, period_end: iso })} /></div>
            </div>
            <p className="text-xs text-muted-foreground font-semibold">Bônus por Faixa</p>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">80%</Label><Input type="number" value={form.bonus_on_80 || ""} onChange={e => setForm({ ...form, bonus_on_80: e.target.value })} /></div>
              <div><Label className="text-xs">100%</Label><Input type="number" value={form.bonus_on_100 || ""} onChange={e => setForm({ ...form, bonus_on_100: e.target.value })} /></div>
              <div><Label className="text-xs">120%</Label><Input type="number" value={form.bonus_on_120 || ""} onChange={e => setForm({ ...form, bonus_on_120: e.target.value })} /></div>
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
