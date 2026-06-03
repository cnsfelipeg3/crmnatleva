import { motion } from "framer-motion";
import { Plane, Trophy, Wallet, Target, Sparkles, Radio } from "lucide-react";

export type FeedItem = {
  id: string;
  type: "sale" | "level" | "payout" | "goal" | "top";
  who: string;
  text: string;
  when: string;
};

const ICON: Record<FeedItem["type"], JSX.Element> = {
  sale: <Plane className="h-3.5 w-3.5" />,
  level: <Sparkles className="h-3.5 w-3.5" />,
  payout: <Wallet className="h-3.5 w-3.5" />,
  goal: <Target className="h-3.5 w-3.5" />,
  top: <Trophy className="h-3.5 w-3.5" />,
};

const TONE: Record<FeedItem["type"], string> = {
  sale: "bg-sky-500/15 text-sky-700",
  level: "bg-violet-500/15 text-violet-700",
  payout: "bg-emerald-500/15 text-emerald-700",
  goal: "bg-amber-500/15 text-amber-700",
  top: "bg-rose-500/15 text-rose-700",
};

export default function ClubFeed({ items }: { items: FeedItem[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Radio className="h-4 w-4 text-emerald-700" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <h3 className="font-semibold text-sm">Movimento do Clube</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">ao vivo</span>
      </div>

      <ul className="space-y-3 relative">
        <div className="absolute left-[15px] top-1 bottom-1 w-px bg-border" />
        {items.map((it, i) => (
          <motion.li
            key={it.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="relative flex items-start gap-3 pl-0"
          >
            <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ring-4 ring-background ${TONE[it.type]}`}>
              {ICON[it.type]}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-sm leading-snug">
                <strong className="font-semibold">{it.who}</strong>{" "}
                <span className="text-muted-foreground">{it.text}</span>
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">{it.when}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
