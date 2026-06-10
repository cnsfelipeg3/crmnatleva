import { motion } from "framer-motion";
import { MapPin, Plane, Star } from "lucide-react";
import { getTripStatus } from "@/components/travel-ui";

export default function TravelStats({ trips }: { trips: any[] }) {
  const destinations = new Set(trips.map(t => t.sale?.destination_iata).filter(Boolean));
  const totalFlights = trips.reduce((sum, t) => sum + (t.segments_count || 0), 0);
  const completedTrips = trips.filter(t => getTripStatus(t.sale || {}) === "past").length;

  if (destinations.size === 0 && completedTrips === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="grid grid-cols-3 gap-3 mb-8"
    >
      {[
        { value: destinations.size, label: "Destinos", icon: MapPin },
        { value: completedTrips, label: "Viagens", icon: Plane },
        { value: totalFlights || trips.length, label: "Jornadas", icon: Star },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.06 }}
          className="flex flex-col items-center gap-1 py-4 rounded-2xl bg-card/40 border border-border/20 backdrop-blur-sm"
        >
          <stat.icon className="h-4 w-4 text-accent/60 mb-0.5" />
          <p className="text-2xl font-black text-foreground tabular-nums">{stat.value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">{stat.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
