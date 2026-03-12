import { useState } from "react";
import { NODE_CATEGORIES, type NodeDefinition } from "./nodeTypes";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import {
  Zap, MessageSquare, HelpCircle, GitBranch, Cog, Brain, UserCog, Wrench, Network,
} from "lucide-react";

const CAT_ICONS: Record<string, React.ElementType> = {
  Zap, MessageSquare, HelpCircle, GitBranch, Cog, Brain, UserCog, Wrench, Network,
};

interface Props {
  onDragStart: (def: NodeDefinition) => void;
}

export function FlowNodeLibrary({ onDragStart }: Props) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(NODE_CATEGORIES.map(c => [c.id, true]))
  );

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filtered = NODE_CATEGORIES.map(cat => ({
    ...cat,
    nodes: cat.nodes.filter(n =>
      !search || n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.nodes.length > 0);

  return (
    <div className="w-[240px] border-r border-border bg-card/50 flex flex-col shrink-0">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">Blocos</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar bloco..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filtered.map(cat => {
            const CatIcon = CAT_ICONS[cat.icon] || Zap;
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggle(cat.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-secondary/50 text-xs font-bold text-foreground"
                >
                  <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-left">{cat.label}</span>
                  {expanded[cat.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {expanded[cat.id] && (
                  <div className="ml-2 space-y-0.5 mt-0.5">
                    {cat.nodes.map(node => (
                      <div
                        key={node.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/flownode", JSON.stringify(node));
                          e.dataTransfer.effectAllowed = "move";
                          onDragStart(node);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-secondary/70 active:cursor-grabbing transition-colors group"
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
                        <div
                          className="h-5 w-5 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${node.color}20` }}
                        >
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
                        </div>
                        <span className="text-[11px] text-foreground truncate">{node.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
