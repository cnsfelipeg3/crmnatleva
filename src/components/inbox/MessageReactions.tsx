import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import type { MessageReaction } from "./useMessageReactions";

export const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

interface PickerProps {
  onPick: (emoji: string) => void;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

/** Smile-plus button that opens a quick emoji popover (WhatsApp style). */
export function ReactionPickerButton({ onPick, side = "top", align = "center" }: PickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center transition-colors"
          title="Reagir"
          aria-label="Reagir à mensagem"
        >
          <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        className="p-1.5 w-auto rounded-full border border-border bg-popover/95 backdrop-blur shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-0.5">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onPick(emoji); setOpen(false); }}
              className="h-9 w-9 rounded-full flex items-center justify-center text-xl hover:bg-muted active:scale-90 transition-all"
              title={`Reagir com ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ChipProps {
  reactions: MessageReaction[];
  myReactorId: string | null;
  align: "start" | "end";
  onToggle: (emoji: string) => void;
}

/** Compact chip strip displayed under the bubble (groups equal emojis). */
export function MessageReactionsChip({ reactions, myReactorId, align, onToggle }: ChipProps) {
  if (!reactions || reactions.length === 0) return null;

  // Group by emoji
  const groups = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const g = groups.get(r.emoji) || { count: 0, mine: false };
    g.count += 1;
    if (r.reactor_type === "atendente" && r.reactor_id === myReactorId) g.mine = true;
    groups.set(r.emoji, g);
  }

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${align === "end" ? "justify-end" : "justify-start"}`}>
      {Array.from(groups.entries()).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(emoji); }}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs leading-none transition-all active:scale-95 ${
            mine
              ? "bg-primary/15 border-primary/40 text-foreground"
              : "bg-background/90 border-border hover:bg-muted"
          }`}
          title={mine ? "Remover sua reação" : `Reagir com ${emoji}`}
        >
          <span className="text-sm">{emoji}</span>
          {count > 1 && <span className="text-[10px] font-semibold opacity-80">{count}</span>}
        </button>
      ))}
    </div>
  );
}
