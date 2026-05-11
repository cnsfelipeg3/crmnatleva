import { useState } from "react";
import { Plus, X, Pin, PinOff, Copy } from "lucide-react";
import { useTabManager, MAX_TABS } from "@/contexts/TabManagerContext";
import { TAB_QUICK_LINKS } from "@/lib/tabTitles";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

export default function TabBar() {
  const { tabs, activeId, open, close, closeOthers, activate, togglePin, reorder } = useTabManager();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const location = useLocation();

  if (tabs.length === 0) return null;

  const handleNew = (path: string) => {
    if (tabs.length >= MAX_TABS) {
      toast.warning(`Limite de ${MAX_TABS} abas atingido. Feche alguma para abrir uma nova.`);
      return;
    }
    open(path, { activate: true, focusIfExists: true });
  };

  return (
    <div
      className="hidden md:flex items-stretch gap-0.5 px-2 h-9 border-b border-border/30 bg-muted/30 shrink-0 z-30 select-none overflow-x-auto"
      role="tablist"
      aria-label="Abas do sistema"
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeId;
        return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger asChild>
              <div
                role="tab"
                aria-selected={isActive}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx) reorder(dragIdx, idx);
                  setDragIdx(null);
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    close(tab.id);
                  }
                }}
                onClick={() => activate(tab.id)}
                className={cn(
                  "group relative flex items-center gap-2 px-3 h-full max-w-[200px] min-w-[110px] cursor-pointer text-xs border-r border-border/30 transition-colors",
                  isActive
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                )}
                title={tab.path}
              >
                {tab.pinned && <Pin className="w-3 h-3 shrink-0 text-primary/70" />}
                <span className="truncate flex-1">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    close(tab.id);
                  }}
                  className={cn(
                    "shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity",
                    isActive && "opacity-60",
                  )}
                  aria-label={`Fechar aba ${tab.title}`}
                >
                  <X className="w-3 h-3" />
                </button>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" aria-hidden />
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => togglePin(tab.id)}>
                {tab.pinned ? (
                  <><PinOff className="w-3.5 h-3.5 mr-2" /> Desafixar aba</>
                ) : (
                  <><Pin className="w-3.5 h-3.5 mr-2" /> Fixar aba</>
                )}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleNew(tab.path)}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => closeOthers(tab.id)}>
                Fechar outras
              </ContextMenuItem>
              <ContextMenuItem onClick={() => close(tab.id)} disabled={tab.pinned}>
                <X className="w-3.5 h-3.5 mr-2" /> Fechar
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center px-2 h-full text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            aria-label="Nova aba"
            title="Nova aba"
          >
            <Plus className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Abrir em nova aba
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {TAB_QUICK_LINKS.map((q) => (
            <DropdownMenuItem key={q.path} onClick={() => handleNew(q.path)} className="text-xs">
              {q.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleNew(location.pathname + location.search)}
            className="text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar página atual
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="ml-auto self-center text-[10px] text-muted-foreground/60 font-mono pr-2">
        {tabs.length}/{MAX_TABS}
      </span>
    </div>
  );
}
