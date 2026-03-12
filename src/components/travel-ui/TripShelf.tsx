import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TripCard from "./TripCard";

interface TripShelfProps {
  title: string;
  emoji: string;
  trips: any[];
  onOpen: (id: string) => void;
}

export default function TripShelf({ title, emoji, trips, onOpen }: TripShelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const check = () => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 10);
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    check();
    const el = ref.current;
    el?.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => { el?.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [trips]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <span className="text-lg">{emoji}</span> {title}
        </h3>
        <div className="hidden sm:flex items-center gap-1.5">
          <button onClick={() => ref.current?.scrollBy({ left: -380, behavior: "smooth" })} disabled={!canL}
            className="w-9 h-9 rounded-full bg-card/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-20 transition-all backdrop-blur-sm">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => ref.current?.scrollBy({ left: 380, behavior: "smooth" })} disabled={!canR}
            className="w-9 h-9 rounded-full bg-card/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-20 transition-all backdrop-blur-sm">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {canL && <div className="absolute left-0 top-14 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />}
      {canR && <div className="absolute right-0 top-14 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />}

      <div
        ref={ref}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {trips.map((trip, i) => (
          <TripCard key={trip.id || i} trip={trip} onOpen={onOpen} index={i} />
        ))}
      </div>
    </motion.section>
  );
}
