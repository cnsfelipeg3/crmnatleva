import { useState, useEffect } from "react";
import { NODE_CATEGORIES, type NodeDefinition } from "./nodeTypes";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { icons, Search, ChevronDown, ChevronRight, GripVertical, Zap } from "lucide-react";

const CAT_ICONS: Record<string, React.ElementType> = {
  Zap: icons.Zap, MessageSquare: icons.MessageSquare, HelpCircle: icons.CircleHelp,
  GitBranch: icons.GitBranch, Cog: icons.Cog, Brain: icons.Brain,
  UserCog: icons.UserCog, Wrench: icons.Wrench, Network: icons.Network,
};

function darkenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function NodeIcon({ name, color, size = 18 }: { name: string; color: string; size?: number }) {
  const Icon = (icons as any)[name];
  const isDark = useIsDark();
  const displayColor = isDark ? color : darkenHex(color, 0.65);
  if (!Icon) return <Zap size={size} style={{ color: displayColor }} />;
  return <Icon size={size} style={{ color: displayColor }} />;
}

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
    <div className="w-[260px] border-r border-border bg-card/50 flex flex-col shrink-0">
      <div className="p-3 border-b border-border">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mb-2.5">
          Blocos Disponíveis
        </h3>
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
            const CatIcon = CAT_ICONS[cat.icon] || icons.Zap;
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggle(cat.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-secondary/50 text-xs font-bold text-foreground"
                >
                  <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-left">{cat.label}</span>
                  {expanded[cat.id] ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </button>
                {expanded[cat.id] && (
                  <div className="ml-1 space-y-0.5 mt-0.5">
                    {cat.nodes.map(node => (
                      <div
                        key={node.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/flownode", JSON.stringify(node));
                          e.dataTransfer.effectAllowed = "move";
                          onDragStart(node);
                        }}
                        className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl cursor-grab hover:bg-secondary/70 active:cursor-grabbing active:scale-[0.97] transition-all group border border-transparent hover:border-border/50"
                      >
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110 group-hover:shadow-md"
                          style={{
                            background: `linear-gradient(135deg, ${node.color}25, ${node.color}40)`,
                            border: `1.5px solid ${node.color}50`,
                            boxShadow: `0 2px 8px ${node.color}15`,
                          }}
                        >
                          <NodeIcon name={node.icon} color={node.color} size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{node.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{node.description}</p>
                        </div>
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0 transition-colors" />
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
