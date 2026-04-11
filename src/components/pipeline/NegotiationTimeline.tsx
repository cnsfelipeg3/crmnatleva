import { useState } from "react";
import { NegotiationCard } from "./NegotiationCard";
import type { GroupedNegotiations } from "@/hooks/useNegotiationPriority";
import type { NegotiationItem } from "@/lib/negotiationNarrative";
import {
  MessageSquare, Search, ClipboardList, FileText,
  Send, CheckCircle2, Archive, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<string, typeof MessageSquare> = {
  em_atendimento: MessageSquare,
  extraindo: Search,
  aguardando_cotacao: ClipboardList,
  proposta_criada: FileText,
  enviada: Send,
  fechadas: CheckCircle2,
};

const GROUP_COLORS: Record<string, { dot: string; border: string; text: string }> = {
  em_atendimento: { dot: "bg-blue-500 animate-pulse", border: "border-l-blue-500", text: "text-blue-700" },
  extraindo: { dot: "bg-amber-500 animate-pulse", border: "border-l-amber-400", text: "text-amber-700" },
  aguardando_cotacao: { dot: "bg-orange-500", border: "border-l-orange-400", text: "text-orange-700" },
  proposta_criada: { dot: "bg-accent", border: "border-l-accent", text: "text-accent" },
  enviada: { dot: "bg-indigo-500", border: "border-l-indigo-400", text: "text-indigo-700" },
  fechadas: { dot: "bg-muted-foreground/40", border: "border-l-muted-foreground/20", text: "text-muted-foreground" },
};

// Default: first 3 groups open, rest collapsed
const DEFAULT_OPEN = new Set(["em_atendimento", "extraindo", "aguardando_cotacao"]);

interface Props {
  groups: GroupedNegotiations[];
  generating: string | null;
  onGenerate: (item: NegotiationItem) => void;
  onSelect: (item: NegotiationItem) => void;
}

export function NegotiationTimeline({ groups, generating, onGenerate, onSelect }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(DEFAULT_OPEN));

  const toggle = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground font-medium">Nenhuma negociação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.key] || Archive;
        const colors = GROUP_COLORS[group.key] || GROUP_COLORS.fechadas;
        const isOpen = openGroups.has(group.key);

        return (
          <div key={group.key}>
            {/* Group header — clickable */}
            <button
              onClick={() => toggle(group.key)}
              className="flex items-center gap-2 mb-2 w-full text-left group/header hover:opacity-80 transition-opacity"
            >
              <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colors.dot)} />
              <Icon className={cn("w-4 h-4 shrink-0", colors.text)} />
              <span className={cn("text-xs font-bold uppercase tracking-wider", colors.text)}>
                {group.label}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                — {group.items.length} negociaç{group.items.length === 1 ? "ão" : "ões"}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground ml-auto transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {/* Cards — collapsible */}
            {isOpen && (
              <div className={cn(
                "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pl-4 border-l-2 ml-1 animate-fade-in",
                colors.border
              )}>
                {group.items.map((item) => (
                  <NegotiationCard
                    key={item.id}
                    item={item}
                    generating={generating}
                    onGenerate={onGenerate}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
