import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, X, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type DateField = "last_message_at" | "created_at";

export interface DateFilterValue {
  field: DateField;
  preset: "all" | "today" | "yesterday" | "7d" | "30d" | "custom";
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

const FIELD_LABEL: Record<DateField, string> = {
  last_message_at: "Última mensagem",
  created_at: "Criação da conversa",
};

const PRESETS: { k: DateFilterValue["preset"]; label: string }[] = [
  { k: "all", label: "Qualquer data" },
  { k: "today", label: "Hoje" },
  { k: "yesterday", label: "Ontem" },
  { k: "7d", label: "Últimos 7 dias" },
  { k: "30d", label: "Últimos 30 dias" },
  { k: "custom", label: "Personalizado" },
];

function parseLocalDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
function fmtLocalDate(d?: Date): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateFilterPopover({
  value,
  onChange,
}: {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateFilterValue>(value);

  useEffect(() => { setDraft(value); }, [value, open]);

  const isActive = value.preset !== "all";

  const summary = (() => {
    if (value.preset === "all") return "Filtrar por data";
    const fieldShort = value.field === "created_at" ? "Criação" : "Últ. msg";
    if (value.preset === "today") return `${fieldShort} · Hoje`;
    if (value.preset === "yesterday") return `${fieldShort} · Ontem`;
    if (value.preset === "7d") return `${fieldShort} · 7 dias`;
    if (value.preset === "30d") return `${fieldShort} · 30 dias`;
    if (value.preset === "custom") {
      const f = value.from ? format(parseLocalDate(value.from)!, "dd/MM/yy") : "?";
      const t = value.to ? format(parseLocalDate(value.to)!, "dd/MM/yy") : "?";
      return `${fieldShort} · ${f} → ${t}`;
    }
    return "Data";
  })();

  const apply = () => {
    if (draft.preset === "custom" && (!draft.from || !draft.to)) return;
    onChange(draft);
    setOpen(false);
  };
  const clear = () => {
    const cleared: DateFilterValue = { field: draft.field, preset: "all" };
    setDraft(cleared);
    onChange(cleared);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-2 md:py-1 rounded-md text-xs md:text-[10px] font-medium transition active:scale-95 border ${
            isActive
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
          }`}
        >
          <CalendarIcon className="h-3 w-3" />
          {summary}
          {isActive && (
            <X
              className="h-3 w-3 ml-1 hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); clear(); }}
            />
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3 space-y-3">
        {/* Campo */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Filtrar por</label>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(FIELD_LABEL) as DateField[]).map(f => (
              <button
                key={f}
                onClick={() => setDraft(d => ({ ...d, field: f }))}
                className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition ${
                  draft.field === f
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
                }`}
              >
                {FIELD_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Período</label>
          <div className="grid grid-cols-3 gap-1">
            {PRESETS.map(p => (
              <button
                key={p.k}
                onClick={() => setDraft(d => ({ ...d, preset: p.k }))}
                className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition ${
                  draft.preset === p.k
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs custom (data exata ou intervalo) */}
        {draft.preset === "custom" && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">De</label>
                <Input
                  type="date"
                  value={draft.from || ""}
                  onChange={e => setDraft(d => ({ ...d, from: e.target.value, to: d.to || e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Até</label>
                <Input
                  type="date"
                  value={draft.to || ""}
                  onChange={e => setDraft(d => ({ ...d, to: e.target.value, from: d.from || e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <Calendar
              mode="range"
              locale={ptBR}
              selected={{ from: parseLocalDate(draft.from), to: parseLocalDate(draft.to) }}
              onSelect={(range: any) => {
                setDraft(d => ({
                  ...d,
                  from: fmtLocalDate(range?.from) || undefined,
                  to: fmtLocalDate(range?.to || range?.from) || undefined,
                }));
              }}
              numberOfMonths={1}
              className="rounded-md border p-2 pointer-events-auto"
            />
            <div className="flex flex-wrap gap-1">
              {[
                { label: "Hoje", days: 0 },
                { label: "7d", days: 7 },
                { label: "15d", days: 15 },
                { label: "30d", days: 30 },
                { label: "90d", days: 90 },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => {
                    const to = new Date();
                    const from = new Date();
                    from.setDate(to.getDate() - s.days);
                    setDraft(d => ({ ...d, from: fmtLocalDate(from), to: fmtLocalDate(to) }));
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] border border-border/60 hover:bg-muted"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t">
          <Button variant="ghost" size="sm" onClick={clear} className="h-7 text-xs text-muted-foreground">
            Limpar
          </Button>
          <Button size="sm" onClick={apply} className="h-7 text-xs">
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
