import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPillProps {
  icon: any;
  label: string;
  value?: string | null;
  active?: boolean;
  onClear?: () => void;
  children: ReactNode;
}

export function FilterPill({ icon: Icon, label, value, active, onClear, children }: FilterPillProps) {
  return (
    <Popover>
      <div
        className={cn(
          "inline-flex items-stretch rounded-full border transition-all overflow-hidden",
          active
            ? "border-primary/40 bg-primary/5 shadow-sm"
            : "border-border bg-background hover:border-primary/30 hover:bg-accent/40"
        )}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 pl-3 pr-2.5 h-9 text-xs font-medium text-foreground"
          >
            <Icon className={cn("w-3.5 h-3.5", active ? "text-primary" : "text-muted-foreground")} />
            <span>{label}</span>
            {value ? (
              <span className="text-[11px] text-primary font-semibold ml-0.5 max-w-[140px] truncate">
                · {value}
              </span>
            ) : (
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
            )}
          </button>
        </PopoverTrigger>
        {active && onClear && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            aria-label={`Limpar filtro ${label}`}
            className="flex items-center justify-center w-7 border-l border-primary/20 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-auto p-0 overflow-hidden">
        {children}
      </PopoverContent>
    </Popover>
  );
}

interface MultiCheckListProps {
  options: Array<{ id: string; label: string }>;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  emptyText?: string;
}

export function MultiCheckList({ options, selected, setSelected, emptyText = "Sem opções" }: MultiCheckListProps) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="w-72">
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="max-h-64">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {q ? "Nada encontrado" : emptyText}
          </p>
        ) : (
          <ul className="py-1">
            {filtered.map((o) => {
              const checked = selected.has(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      {selected.size > 0 && (
        <>
          <Separator />
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] text-muted-foreground">
              {selected.size} selecionado{selected.size > 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Limpar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface RangeInputsProps {
  hint?: string;
  min: string;
  max: string;
  setMin: (v: string) => void;
  setMax: (v: string) => void;
}

export function RangeInputs({ hint, min, max, setMin, setMax }: RangeInputsProps) {
  return (
    <div className="w-72 p-3 space-y-3">
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Mínimo</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <Input
              inputMode="decimal"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="0"
              className="h-9 pl-8 text-sm tabular-nums"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Máximo</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <Input
              inputMode="decimal"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="sem limite"
              className="h-9 pl-8 text-sm tabular-nums"
            />
          </div>
        </div>
      </div>
      {(min || max) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setMin(""); setMax(""); }}
          className="h-7 px-2 text-xs w-full"
        >
          Limpar faixa
        </Button>
      )}
    </div>
  );
}
