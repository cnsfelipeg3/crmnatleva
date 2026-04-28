import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Plane, User, MapPin, Hash, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fetchAllRows } from "@/lib/fetchAll";
import { iataToCityName } from "@/lib/iataUtils";

interface SaleResult {
  id: string; display_id: string; name: string;
  destination_iata: string | null; origin_iata: string | null;
  received_value: number; locators: string[]; status: string;
}

interface ClientResult {
  id: string; display_name: string; email: string | null; phone: string | null;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sales, setSales] = useState<SaleResult[]>([]);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Load data on first open
  useEffect(() => {
    if (open && !loaded) {
      Promise.all([
        fetchAllRows("sales", "id, display_id, name, destination_iata, origin_iata, received_value, locators, status"),
        fetchAllRows("clients", "id, display_name, email, phone"),
      ])
        .then(([s, c]) => {
          setSales(s as SaleResult[]);
          setClients(c as ClientResult[]);
          setLoaded(true);
        })
        .catch((err) => {
          console.error("GlobalSearch fetch error:", err);
          setLoaded(true);
        });
    }
  }, [open, loaded]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return { sales: [], clients: [] };
    const q = query.toLowerCase().trim();

    const matchedSales = sales.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.display_id?.toLowerCase().includes(q) ||
      s.destination_iata?.toLowerCase().includes(q) ||
      s.origin_iata?.toLowerCase().includes(q) ||
      iataToCityName(s.destination_iata)?.toLowerCase().includes(q) ||
      (s.locators || []).some(l => l.toLowerCase().includes(q)) ||
      String(s.received_value).includes(q)
    ).slice(0, 8);

    const matchedClients = clients.filter(c =>
      c.display_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ).slice(0, 5);

    return { sales: matchedSales, clients: matchedClients };
  }, [query, sales, clients]);

  const goTo = useCallback((path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  }, [navigate]);

  const hasResults = results.sales.length > 0 || results.clients.length > 0;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs text-muted-foreground w-full max-w-[240px]"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left truncate">Buscar...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-lg gap-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl">
          <DialogTitle className="sr-only">Busca global</DialogTitle>
          <DialogDescription className="sr-only">Busque por clientes, destinos, localizadores ou valores.</DialogDescription>
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 border-b border-border/40">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar cliente, destino, localizador, valor..."
              className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
            {query && (
              <button onClick={() => setQuery("")} className="p-1 hover:bg-muted/50 rounded">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!query.trim() && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Digite para buscar em vendas, clientes, destinos e localizadores
              </p>
            )}

            {query.trim() && !hasResults && loaded && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhum resultado para "{query}"
              </p>
            )}

            {results.clients.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1 font-medium">Clientes</p>
                {results.clients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => goTo(`/clients/${c.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="p-1.5 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <User className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.display_name}</p>
                      {c.email && <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.sales.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1 font-medium">Vendas</p>
                {results.sales.map(s => (
                  <button
                    key={s.id}
                    onClick={() => goTo(`/sales/${s.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="p-1.5 rounded-md bg-info/10 group-hover:bg-info/20 transition-colors">
                      <Plane className="w-3.5 h-3.5 text-info" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{s.display_id}</span>
                        {s.destination_iata && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {iataToCityName(s.destination_iata)}
                          </span>
                        )}
                        {(s.locators || []).length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Hash className="w-2.5 h-2.5" />
                            {s.locators[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-success shrink-0">{fmt(s.received_value || 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
