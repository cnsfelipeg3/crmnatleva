import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { Viewer, sectionFunnel } from "@/lib/proposalAnalytics";

interface Props {
  viewers: Viewer[];
}

export default function SectionFunnelCard({ viewers }: Props) {
  const funnel = sectionFunnel(viewers).filter((s) => s.count > 0);

  return (
    <Card className="p-4 space-y-3">
      <CardHeader className="p-0">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Funil de seções
        </CardTitle>
      </CardHeader>

      {funnel.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Aguardando primeiros visitantes para mapear a jornada.</p>
      ) : (
        <div className="space-y-1.5">
          {funnel.map((step, idx) => (
            <div key={step.section} className="space-y-0.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-foreground font-medium">
                  {idx + 1}. {step.label}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {step.count} {step.count === 1 ? "pessoa" : "pessoas"} · {step.pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent/60 to-accent transition-all"
                  style={{ width: `${step.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
