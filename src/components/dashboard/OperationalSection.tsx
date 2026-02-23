import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, Hotel, Plane } from "lucide-react";

interface CheckinTask {
  status: string;
  checkin_open_datetime_utc: string | null;
  completed_at: string | null;
  created_at: string;
}

interface LodgingTask {
  status: string;
  milestone: string;
  scheduled_at_utc: string | null;
  issue_type: string | null;
}

interface Props {
  checkinTasks: CheckinTask[];
  lodgingTasks: LodgingTask[];
}

export default function OperationalSection({ checkinTasks, lodgingTasks }: Props) {
  const pendingCheckins = checkinTasks.filter(t => t.status === "PENDENTE").length;
  const criticalCheckins = checkinTasks.filter(t => {
    if (t.status !== "PENDENTE" || !t.checkin_open_datetime_utc) return false;
    const diff = new Date(t.checkin_open_datetime_utc).getTime() - Date.now();
    return diff > 0 && diff < 6 * 60 * 60 * 1000;
  }).length;
  const completedCheckins = checkinTasks.filter(t => t.status === "CONCLUIDO").length;

  const pendingLodging = lodgingTasks.filter(t => t.status === "PENDENTE").length;
  const d14 = lodgingTasks.filter(t => t.milestone === "D14" && t.status === "PENDENTE").length;
  const d7 = lodgingTasks.filter(t => t.milestone === "D7" && t.status === "PENDENTE").length;
  const h24 = lodgingTasks.filter(t => t.milestone === "H24" && t.status === "PENDENTE").length;
  const withIssues = lodgingTasks.filter(t => t.issue_type).length;

  // Avg completion time for check-ins (hours)
  const avgCheckinTime = (() => {
    const completed = checkinTasks.filter(t => t.completed_at && t.checkin_open_datetime_utc);
    if (completed.length === 0) return null;
    const total = completed.reduce((sum, t) => {
      return sum + (new Date(t.completed_at!).getTime() - new Date(t.checkin_open_datetime_utc!).getTime());
    }, 0);
    return (total / completed.length / (1000 * 60 * 60)).toFixed(1);
  })();

  const stats = [
    { label: "Check-ins Pendentes", value: pendingCheckins, icon: Plane, color: "text-warning" },
    { label: "Check-ins Críticos (<6h)", value: criticalCheckins, icon: AlertTriangle, color: "text-destructive" },
    { label: "Check-ins Concluídos", value: completedCheckins, icon: CheckCircle, color: "text-success" },
    { label: "Hospedagens Pendentes", value: pendingLodging, icon: Hotel, color: "text-warning" },
    { label: "Com Problemas", value: withIssues, icon: AlertTriangle, color: "text-destructive" },
    { label: "Tempo Médio Check-in", value: avgCheckinTime ? `${avgCheckinTime}h` : "—", icon: Clock, color: "text-info" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-foreground">Operacional</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="p-3.5 glass-card">
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>
      {(d14 > 0 || d7 > 0 || h24 > 0) && (
        <Card className="p-4 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">Confirmações por Milestone</h3>
          <div className="flex gap-3">
            <Badge variant="outline" className="text-xs py-1 px-3">D-14: {d14} pendente(s)</Badge>
            <Badge variant="outline" className="text-xs py-1 px-3 border-warning/50 text-warning">D-7: {d7} pendente(s)</Badge>
            <Badge variant="outline" className="text-xs py-1 px-3 border-destructive/50 text-destructive">H-24: {h24} pendente(s)</Badge>
          </div>
        </Card>
      )}
    </div>
  );
}
