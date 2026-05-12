import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { Viewer, geoBreakdown } from "@/lib/proposalAnalytics";

interface Props {
  viewers: Viewer[];
}

export default function GeographicCard({ viewers }: Props) {
  const geo = geoBreakdown(viewers).slice(0, 8);
  const max = geo[0]?.count || 1;

  return (
    <Card className="p-4 space-y-3">
      <CardHeader className="p-0">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> Localização dos visitantes
        </CardTitle>
      </CardHeader>

      {geo.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Sem dados de localização ainda.</p>
      ) : (
        <div className="space-y-2">
          {geo.map((g) => (
            <div key={g.key} className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-foreground truncate">
                  {g.city}{g.country ? `, ${g.country}` : ""}
                </span>
                <span className="text-muted-foreground tabular-nums">{g.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-accent/70"
                  style={{ width: `${Math.round((g.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
