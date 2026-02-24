import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Clock, Target, DollarSign, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function RelatoriosRH() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const load = async () => {
      const [e, t, g, p, s] = await Promise.all([
        supabase.from("employees").select("*"),
        supabase.from("time_entries").select("*, employees(full_name)").gte("entry_date", `${month}-01`).lte("entry_date", `${month}-31`),
        supabase.from("goals").select("*, employees(full_name)"),
        supabase.from("payroll").select("*, employees(full_name)").gte("reference_month", `${month}-01`).lte("reference_month", `${month}-31`),
        supabase.from("performance_scores").select("*, employees(full_name, department)").gte("period_month", `${month}-01`).lte("period_month", `${month}-31`),
      ]);
      setEmployees(e.data || []);
      setTimeEntries(t.data || []);
      setGoals(g.data || []);
      setPayroll(p.data || []);
      setScores(s.data || []);
    };
    load();
  }, [month]);

  const lateByEmp = useMemo(() => {
    const map: Record<string, { name: string; late: number; days: number }> = {};
    timeEntries.forEach(t => {
      const name = t.employees?.full_name || "?";
      if (!map[name]) map[name] = { name, late: 0, days: 0 };
      map[name].days++;
      map[name].late += t.late_minutes || 0;
    });
    return Object.values(map).sort((a, b) => b.late - a.late);
  }, [timeEntries]);

  const perfByDept = useMemo(() => {
    const map: Record<string, { scores: number[]; dept: string }> = {};
    scores.forEach(s => {
      const dept = s.employees?.department || "?";
      if (!map[dept]) map[dept] = { scores: [], dept };
      map[dept].scores.push(s.overall_score || 0);
    });
    return Object.values(map).map(d => ({ name: d.dept, score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) }));
  }, [scores]);

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== "object").join(",") + "\n";
    const rows = data.map(r => Object.entries(r).filter(([_, v]) => typeof v !== "object").map(([_, v]) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${filename}.csv`; a.click();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-display">Relatórios RH</h1></div>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-[160px]" />
      </div>

      <Tabs defaultValue="presenca">
        <TabsList>
          <TabsTrigger value="presenca"><Clock className="w-4 h-4 mr-1" />Presença</TabsTrigger>
          <TabsTrigger value="performance"><Target className="w-4 h-4 mr-1" />Performance</TabsTrigger>
          <TabsTrigger value="pagamentos"><DollarSign className="w-4 h-4 mr-1" />Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="presenca" className="space-y-4">
          <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => exportCSV(lateByEmp, `presenca-${month}`)}><Download className="w-4 h-4 mr-1" />CSV</Button></div>
          {lateByEmp.length > 0 && (
            <Card className="border-border/50"><CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lateByEmp.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="late" fill="hsl(40,90%,50%)" name="Atraso (min)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="days" fill="hsl(160,60%,45%)" name="Dias" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          )}
          <Card className="border-border/50"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Dias</TableHead><TableHead>Atraso Total</TableHead><TableHead>Média/dia</TableHead></TableRow></TableHeader>
              <TableBody>
                {lateByEmp.map(e => (
                  <TableRow key={e.name}><TableCell className="font-medium">{e.name}</TableCell><TableCell>{e.days}</TableCell><TableCell className="font-mono">{e.late}min</TableCell><TableCell className="font-mono">{e.days > 0 ? Math.round(e.late / e.days) : 0}min</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {perfByDept.length > 0 && (
            <Card className="border-border/50"><CardContent className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={perfByDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="hsl(200,70%,50%)" name="Score Médio" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          )}
          <Card className="border-border/50"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Área</TableHead><TableHead className="text-center">Score</TableHead></TableRow></TableHeader>
              <TableBody>
                {scores.map(s => (
                  <TableRow key={s.id}><TableCell className="font-medium">{s.employees?.full_name}</TableCell><TableCell>{s.employees?.department}</TableCell><TableCell className="text-center font-bold font-mono">{s.overall_score}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="space-y-4">
          <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => exportCSV(payroll, `pagamentos-${month}`)}><Download className="w-4 h-4 mr-1" />CSV</Button></div>
          <Card className="border-border/50"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead className="text-right">Salário</TableHead><TableHead className="text-right">Comissão</TableHead><TableHead className="text-right">Bônus</TableHead><TableHead className="text-right">Descontos</TableHead><TableHead className="text-right">Líquido</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {payroll.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employees?.full_name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">R$ {Number(p.base_salary).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono text-xs">R$ {Number(p.commission_value).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono text-xs">R$ {Number(p.bonus_value).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono text-xs">R$ {Number(p.deductions).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono font-bold">R$ {Number(p.net_total).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
