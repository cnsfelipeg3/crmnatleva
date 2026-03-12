import { motion } from "framer-motion";
import { Plane, MapPin } from "lucide-react";

const fmtShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

interface JourneyProgressProps {
  departureDate?: string | null;
  returnDate?: string | null;
}

export default function JourneyProgress({ departureDate, returnDate }: JourneyProgressProps) {
  const dep = departureDate ? new Date(departureDate + "T00:00:00") : null;
  const ret = returnDate ? new Date(returnDate + "T23:59:59") : null;
  const now = new Date();
  if (!dep || !ret) return null;
  const total = ret.getTime() - dep.getTime();
  const elapsed = now.getTime() - dep.getTime();
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const isActive = dep <= now && ret >= now;
  const isPast = ret < now;
  const days = Math.ceil(total / 86400000);
  const current = isActive ? Math.min(Math.ceil(elapsed / 86400000), days) : isPast ? days : 0;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Plane className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium">{fmtShort(departureDate)}</span>
        </div>
        {isActive && <span className="text-accent font-bold text-sm">Dia {current} de {days}</span>}
        {isPast && <span className="text-muted-foreground text-xs font-medium">Concluída</span>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{fmtShort(returnDate)}</span>
          <MapPin className="h-3.5 w-3.5 text-accent" />
        </div>
      </div>
      <div className="relative w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${isPast ? 100 : pct}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-accent to-[hsl(160,80%,60%)]"
        />
        {isActive && (
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${pct}%` }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-accent border-[3px] border-background shadow-lg shadow-accent/50"
          />
        )}
      </div>
    </div>
  );
}
