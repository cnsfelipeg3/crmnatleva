import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, Smartphone, Monitor } from "lucide-react";
import { Viewer, isOnline, formatTime } from "@/lib/proposalAnalytics";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  viewers: Viewer[];
}

export default function LiveVisitorsCard({ viewers }: Props) {
  const onlineNow = viewers.filter(isOnline);

  return (
    <Card className="p-4 space-y-3">
      <CardHeader className="p-0">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Wifi className={`w-3.5 h-3.5 ${onlineNow.length > 0 ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
          Visitantes ao vivo
          <Badge variant="neutral" className="text-[9px] ml-auto">
            {onlineNow.length} agora
          </Badge>
        </CardTitle>
      </CardHeader>

      {onlineNow.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          Ninguém visualizando neste momento. Aparecem aqui em tempo real quando abrirem.
        </p>
      ) : (
        <div className="space-y-2">
          {onlineNow.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
            >
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {v.name || v.email}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {(v.sections_viewed && v.sections_viewed.length > 0)
                    ? `vendo ${v.sections_viewed[v.sections_viewed.length - 1]} · ${formatTime(v.active_seconds || 0)} de leitura`
                    : `acabou de abrir · ${formatDistanceToNow(new Date(v.last_active_at), { locale: ptBR, addSuffix: true })}`
                  }
                </p>
              </div>
              {v.device_type === "mobile" ? (
                <Smartphone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <Monitor className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
