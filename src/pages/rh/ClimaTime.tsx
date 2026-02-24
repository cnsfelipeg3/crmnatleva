import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Smile, Meh, Frown, Zap, Battery, BatteryLow } from "lucide-react";
import { toast } from "sonner";

const MOODS = [
  { value: 1, icon: Frown, label: "Ruim", color: "text-red-500" },
  { value: 2, icon: Frown, label: "Baixo", color: "text-orange-500" },
  { value: 3, icon: Meh, label: "Neutro", color: "text-amber-500" },
  { value: 4, icon: Smile, label: "Bom", color: "text-emerald-500" },
  { value: 5, icon: Smile, label: "Ótimo", color: "text-green-500" },
];

const ENERGIES = [
  { value: 1, icon: BatteryLow, label: "Esgotado", color: "text-red-500" },
  { value: 2, icon: BatteryLow, label: "Cansado", color: "text-orange-500" },
  { value: 3, icon: Battery, label: "Normal", color: "text-amber-500" },
  { value: 4, icon: Zap, label: "Energizado", color: "text-emerald-500" },
  { value: 5, icon: Zap, label: "On Fire!", color: "text-green-500" },
];

export default function ClimaTime() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [empId, setEmpId] = useState("");
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [comment, setComment] = useState("");

  const load = async () => {
    const [e, c] = await Promise.all([
      supabase.from("employees").select("*").eq("status", "ativo").order("full_name"),
      supabase.from("team_checkins").select("*, employees(full_name)").order("checkin_date", { ascending: false }).limit(100),
    ]);
    setEmployees(e.data || []);
    setCheckins(c.data || []);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!empId) { toast.error("Selecione o colaborador"); return; }
    await supabase.from("team_checkins").insert({ employee_id: empId, mood_score: mood, energy_score: energy, comment: comment || null });
    toast.success("Check-in registrado! 🎉"); setComment(""); load();
  };

  const avgMood = checkins.length > 0 ? (checkins.reduce((s, c) => s + c.mood_score, 0) / checkins.length).toFixed(1) : "—";
  const avgEnergy = checkins.length > 0 ? (checkins.reduce((s, c) => s + c.energy_score, 0) / checkins.length).toFixed(1) : "—";

  return (
    <div className="space-y-6 p-6">
      <div><h1 className="text-2xl font-bold font-display">Clima do Time</h1><p className="text-sm text-muted-foreground">Check-in semanal de humor e energia</p></div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Humor Médio</p><p className="text-3xl font-bold font-mono">{avgMood}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Energia Média</p><p className="text-3xl font-bold font-mono">{avgEnergy}</p></CardContent></Card>
      </div>

      {/* Check-in form */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 space-y-4">
          <p className="font-semibold text-sm">Como você está hoje?</p>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue placeholder="Selecione seu nome..." /></SelectTrigger>
            <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
          </Select>
          <div>
            <Label className="text-xs">Humor</Label>
            <div className="flex gap-2 mt-1">
              {MOODS.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.value} onClick={() => setMood(m.value)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${mood === m.value ? "border-primary bg-primary/10 scale-110" : "border-border hover:bg-muted/30"}`}>
                    <Icon className={`w-6 h-6 ${m.color}`} />
                    <span className="text-[10px]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs">Energia</Label>
            <div className="flex gap-2 mt-1">
              {ENERGIES.map(e => {
                const Icon = e.icon;
                return (
                  <button key={e.value} onClick={() => setEnergy(e.value)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${energy === e.value ? "border-primary bg-primary/10 scale-110" : "border-border hover:bg-muted/30"}`}>
                    <Icon className={`w-6 h-6 ${e.color}`} />
                    <span className="text-[10px]">{e.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div><Label className="text-xs">Comentário (opcional)</Label><Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Algo que queira compartilhar..." /></div>
          <Button onClick={handleSubmit} className="w-full">Registrar Check-in</Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Histórico de Check-ins</p>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {checkins.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 text-xs">
                <span className="font-mono text-muted-foreground w-20">{c.checkin_date}</span>
                <span className="font-medium w-32 truncate">{c.employees?.full_name}</span>
                <span>{MOODS.find(m => m.value === c.mood_score)?.label || "?"}</span>
                <span>{ENERGIES.find(e => e.value === c.energy_score)?.label || "?"}</span>
                {c.comment && <span className="text-muted-foreground truncate">{c.comment}</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
