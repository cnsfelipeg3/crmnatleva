import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  display_name: string;
  client_type: string;
  phone: string | null;
  email: string | null;
  city: string | null;
}

interface Props {
  value: string | null;
  displayValue?: string;
  onChange: (clientId: string | null, client: Client | null) => void;
  onCreateNew?: (name: string) => void;
}

export default function ClientAutocomplete({ value, displayValue, onChange, onCreateNew }: Props) {
  const [query, setQuery] = useState(displayValue || "");
  const [results, setResults] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(displayValue || "");
  }, [displayValue]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, display_name, client_type, phone, email, city")
        .ilike("display_name", `%${query}%`)
        .limit(8);
      setResults((data || []) as Client[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange(null, null);
          }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Buscar cliente..."
          className="pl-8"
        />
      </div>
      {open && (query.length >= 2) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
          {loading && <div className="p-3 text-xs text-muted-foreground">Buscando...</div>}
          {!loading && results.length === 0 && (
            <div className="p-2">
              <p className="text-xs text-muted-foreground p-1">Nenhum cliente encontrado</p>
              {onCreateNew && (
                <button
                  onClick={() => { onCreateNew(query); setOpen(false); }}
                  className="flex items-center gap-2 w-full p-2 text-xs text-primary hover:bg-muted rounded"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar "{query}"
                </button>
              )}
            </div>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onChange(c.id, c);
                setQuery(c.display_name);
                setOpen(false);
              }}
              className={cn(
                "flex items-start gap-2 w-full p-2.5 text-left hover:bg-muted transition-colors text-xs",
                value === c.id && "bg-primary/5"
              )}
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">{c.display_name}</p>
                <p className="text-muted-foreground">
                  {[c.client_type === "pessoa_fisica" ? "PF" : c.client_type === "familia" ? "Família" : "Empresa", c.city].filter(Boolean).join(" · ")}
                </p>
              </div>
            </button>
          ))}
          {!loading && results.length > 0 && onCreateNew && (
            <button
              onClick={() => { onCreateNew(query); setOpen(false); }}
              className="flex items-center gap-2 w-full p-2 text-xs text-primary hover:bg-muted border-t border-border"
            >
              <Plus className="w-3.5 h-3.5" /> Criar novo cliente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
