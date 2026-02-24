import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, AlertTriangle, Target, Award, MessageSquare, TrendingUp, Smile, Zap, Shield } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const COLORS = ["hsl(160,60%,45%)", "hsl(200,70%,50%)", "hsl(40,90%,50%)", "hsl(0,70%,55%)", "hsl(270,60%,55%)", "hsl(120,50%,45%)"];

export default function RHIndex() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [drillData, setDrillData] = useState<{ title: string; items: any[] } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [e, t, g, f, w, c] = await Promise.all([
        supabase.from("employees").select("*"),
        supabase.from("time_entries").select("*, employees(full_name)").gte("entry_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
        supabase.from("goals").select("*, employees(full_name)"),
        supabase.from("feedbacks").select("*, employees(full_name)"),
        supabase.from("warnings").select("*, employees(full_name)"),
        supabase.from("team_checkins").select("*, employees(full_name)").gte("checkin_date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
      ]);
      setEmployees(e.data || []);
      setTimeEntries(t.data || []);
      setGoals(g.data || []);
      setFeedbacks(f.data || []);
      setWarnings(w.data || []);
      setCheckins(c.data || []);
    };
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const activeEmps = employees.filter(e => e.status === "ativo");
  const experienceEmps = activeEmps.filter(e => {
    const hire = new Date(e.hire_date);
    return (Date.now() - hire.getTime()) < 90 * 86400000;
  });
  const todayEntries = timeEntries.filter(t => t.entry_date === today);
  const presentToday = todayEntries.filter(t => t.clock_in);
  const lateToday = todayEntries.filter(t => t.late_minutes > 0);
  const absencesMonth = (() => {
    const workDays = Array.from({ length: new Date().getDate() }, (_, i) => {
      const d = new Date(new Date().getFullYear(), new Date().getMonth(), i + 1);
      return d.getDay() > 0 && d.getDay() < 6 ? 1 : 0;
    }).reduce((a, b) => a + b, 0);
    const expectedEntries = workDays * activeEmps.length;
    return expectedEntries - timeEntries.filter(t => t.clock_in).length;
  })();
  const goalsHit = goals.filter(g => g.current_value >= g.target_value && g.status === "em_andamento");
  const pendingFeedbacks = feedbacks.filter(f => f.status === "aberto");
  const openWarnings = warnings.filter(w => w.status === "aberta");

  const avgMood = checkins.length > 0 ? (checkins.reduce((s, c) => s + c.mood_score, 0) / checkins.length).toFixed(1) : "—";

  const kpis = [
    { label: "Colaboradores Ativos", value: activeEmps.length, icon: Users, color: "text-emerald-500", items: activeEmps },
    { label: "Em Experiência", value: experienceEmps.length, icon: Shield, color: "text-blue-500", items: experienceEmps },
    { label: "Presença Hoje", value: `${activeEmps.length ? Math.round((presentToday.length / activeEmps.length) * 100) : 0}%`, icon: Clock, color: "text-green-500", items: presentToday },
    { label: "Atrasos Hoje", value: lateToday.length, icon: AlertTriangle, color: "text-amber-500", items: lateToday },
    { label: "Faltas no Mês", value: Math.max(0, absencesMonth), icon: AlertTriangle, color: "text-red-500", items: [] },
    { label: "Metas Batidas", value: goalsHit.length, icon: Target, color: "text-emerald-500", items: goalsHit },
    { label: "Feedbacks Pendentes", value: pendingFeedbacks.length, icon: MessageSquare, color: "text-purple-500", items: pendingFeedbacks },
    { label: "Advertências Abertas", value: openWarnings.length, icon: AlertTriangle, color: "text-red-500", items: openWarnings },
    { label: "Clima da Semana", value: avgMood, icon: Smile, color: "text-yellow-500", items: checkins },
  ];

  // Charts data
  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const deptBar = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEmps.forEach(e => { counts[e.department] = (counts[e.department] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeEmps]);

  const lateByEmp = useMemo(() => {
    const map: Record<string, number> = {};
    timeEntries.filter(t => t.late_minutes > 0).forEach(t => {
      const name = t.employees?.full_name || "?";
      map[name] = (map[name] || 0) + t.late_minutes;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, minutes]) => ({ name: name.split(" ")[0], minutes }));
  }, [timeEntries]);

  // Radar do time alerts
  const alerts = useMemo(() => {
    const list: { text: string; severity: string }[] = [];
    openWarnings.forEach(w => list.push({ text: `Advertência aberta: ${w.employees?.full_name}`, severity: "high" }));
    lateToday.forEach(t => list.push({ text: `Atraso hoje: ${t.employees?.full_name} (${t.late_minutes}min)`, severity: "medium" }));
    pendingFeedbacks.slice(0, 3).forEach(f => list.push({ text: `Feedback pendente: ${f.employees?.full_name}`, severity: "low" }));
    return list;
  }, [openWarnings, lateToday, pendingFeedbacks]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">RH — Gestão de Pessoas</h1>
          <p className="text-sm text-muted-foreground">Painel executivo de recursos humanos</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k, i) => (
          <Card key={i} className="cursor-pointer hover:shadow-lg transition-all border-border/50 hover:border-primary/30" onClick={() => k.items.length > 0 && setDrillData({ title: k.label, items: k.items })}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <k.icon className={`w-4 h-4 ${k.color}`} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className="text-2xl font-bold font-mono">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Radar do Time + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar Alerts */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Radar do Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-auto">
            {alerts.length === 0 && <p className="text-xs text-muted-foreground">Nenhum alerta no momento 🎉</p>}
            {alerts.map((a, i) => (
              <div key={i} className={`text-xs p-2 rounded border ${a.severity === "high" ? "border-red-500/30 bg-red-500/5" : a.severity === "medium" ? "border-amber-500/30 bg-amber-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                {a.text}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Status Pie */}
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Status do Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dept Bar */}
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Colaboradores por Área</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Late by employee */}
      {lateByEmp.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Atrasos por Colaborador (mês)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={lateByEmp} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="minutes" fill="hsl(40,90%,50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Drill-down Dialog */}
      <Dialog open={!!drillData} onOpenChange={() => setDrillData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>{drillData?.title}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drillData?.items.map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.full_name || item.employees?.full_name || item.title || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{item.status || item.severity || "—"}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.department || item.position || item.late_minutes ? `${item.late_minutes || 0}min atraso` : item.description || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
