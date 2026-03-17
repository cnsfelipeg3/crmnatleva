import { Lightbulb, CheckCircle2, Search, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Task } from "./mockData";

interface Props {
  tasks: Task[];
}

export default function AITeamStatusCards({ tasks }: Props) {
  const detected = tasks.filter((t) => t.status === "detected").length;
  const analyzing = tasks.filter((t) => t.status === "analyzing").length;
  const suggested = tasks.filter((t) => t.status === "suggested").length;
  const pending = tasks.filter((t) => t.status === "pending").length;

  const cards = [
    { label: "Melhorias detectadas", value: tasks.length, icon: Lightbulb, color: "text-amber-500" },
    { label: "Sugestões prontas", value: suggested, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Em análise", value: analyzing + detected, icon: Search, color: "text-blue-500" },
    { label: "Aguardando decisão", value: pending, icon: Clock, color: "text-orange-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className={`p-2 rounded-lg bg-muted ${c.color}`}>
            <c.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
