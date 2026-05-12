import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Viewer, Interaction, ClickEvent, generateInsights } from "@/lib/proposalAnalytics";

interface Props {
  viewers: Viewer[];
  interactions: Interaction[];
  clicks: ClickEvent[];
}

export default function AiInsightsCard({ viewers, interactions, clicks }: Props) {
  const insights = generateInsights(viewers, interactions, clicks);

  return (
    <Card className="p-4 space-y-3">
      <CardHeader className="p-0">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" /> Insights da Nath
          <span className="text-[9px] text-muted-foreground ml-auto font-normal">
            sugestões automáticas
          </span>
        </CardTitle>
      </CardHeader>
      <div className="space-y-2">
        {insights.map((i, idx) => {
          const Icon = i.tone === "success" ? CheckCircle2 : i.tone === "warning" ? AlertTriangle : Info;
          return (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-2 p-2.5 rounded-lg border",
                i.tone === "warning" && "border-amber-500/25 bg-amber-500/5",
                i.tone === "success" && "border-emerald-500/25 bg-emerald-500/5",
                i.tone === "info" && "border-border/40 bg-muted/30",
              )}
            >
              <Icon
                className={cn(
                  "w-3.5 h-3.5 flex-shrink-0 mt-0.5",
                  i.tone === "warning" && "text-amber-600",
                  i.tone === "success" && "text-emerald-600",
                  i.tone === "info" && "text-muted-foreground",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-foreground leading-tight">{i.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{i.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
