import { motion } from "framer-motion";
import { Plane, MapPin } from "lucide-react";

const fmtShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

interface JourneyProgressProps {
  departureDate?: string | null;
  returnDate?: string | null;
  tone?: "auto" | "onDark";
}

export default function JourneyProgress({ departureDate, returnDate, tone = "auto" }: JourneyProgressProps) {
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

  const onDark = tone === "onDark";
  const labelColor = onDark ? "text-white/90" : "text-muted-foreground";
  const accentColor = onDark ? "text-white" : "text-accent";
  const trackBg = onDark ? "bg-white/20" : "bg-muted/50";
  const fillBg = onDark
    ? "bg-gradient-to-r from-white to-white/70"
    : "bg-gradient-to-r from-accent to-[hsl(160,80%,60%)]";
  const dotBorder = onDark ? "border-white" : "border-background";
  const dotBg = onDark ? "bg-white" : "bg-accent";

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 text-xs ${labelColor}`}>
          <Plane className={`h-3.5 w-3.5 ${accentColor}`} />
          <span className="font-medium">{fmtShort(departureDate)}</span>
        </div>
        {isActive && <span className={`font-bold text-sm ${accentColor}`}>Dia {current} de {days}</span>}
        {isPast && <span className={`text-xs font-medium ${labelColor}`}>Concluída</span>}
        <div className={`flex items-center gap-2 text-xs ${labelColor}`}>
          <span className="font-medium">{fmtShort(returnDate)}</span>
          <MapPin className={`h-3.5 w-3.5 ${accentColor}`} />
        </div>
      </div>
      <div className={`relative w-full h-1.5 rounded-full overflow-hidden ${trackBg}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${isPast ? 100 : pct}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
          className={`h-full rounded-full ${fillBg}`}
        />
        {isActive && (
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${pct}%` }}
            transition={{ duration: 2, ease: "easeOut" }}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-[3px] shadow-lg ${dotBg} ${dotBorder}`}
          />
        )}
      </div>
    </div>
  );
}
