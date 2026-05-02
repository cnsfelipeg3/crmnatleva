import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { formatDateBR } from "@/lib/dateFormat";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAll";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Eye, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { routeCode } from "@/lib/cityExtract";
import { SmartFilters, useSmartFilters } from "@/components/smart-filters";
import type { SmartFilterConfig } from "@/components/smart-filters";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProductTypes, getProductMeta, normalizeProductsToSlugs, hasProduct } from "@/lib/productTypes";
import DeleteSaleButton from "@/components/DeleteSaleButton";
import { ListPageSkeleton, ProgressOverlay } from "@/components/skeletons/PageSkeletons";
import { useExternalSellers, type ExternalSeller } from "@/hooks/useExternalSellers";
import { ExternalSellersDialog } from "@/components/sales/ExternalSellersDialog";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusColor: Record<string, string> = {
  Fechado: "bg-success/15 text-success border-success/20",
  "Em andamento": "bg-warning/15 text-warning-foreground border-warning/20",
  Pendente: "bg-muted text-muted-foreground border-border",
  Rascunho: "bg-info/10 text-info border-info/20",
  Emitido: "bg-primary/10 text-primary border-primary/20",
};

const leadColor: Record<string, string> = {
  organico: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
  agencia: "bg-muted text-muted-foreground border-border",
};

const MONTH_SHORT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function fmtShortDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y.slice(2)}`;
}

interface SaleRow {
  id: string; display_id: string; name: string; close_date: string | null;
  status: string; origin_iata: string | null; destination_iata: string | null;
  origin_city: string | null; destination_city: string | null;
  departure_date: string | null; return_date: string | null;
  adults: number; children: number;
  products: string[]; received_value: number; total_cost: number; profit: number; margin: number; score: number;
  airline: string | null; locators: string[]; seller_id: string | null;
  external_seller_id: string | null;
  created_at: string; client_id: string | null; lead_type: string;
  hotel_name: string | null;
}

const SALES_FILTER_CONFIG: SmartFilterConfig = {
  sortOptions: [
    { key: "departure_date", label: "Data embarque", type: "date" },
    { key: "created_at", label: "Mais recentes", type: "date" },
    { key: "received_value", label: "Valor", type: "number" },
    { key: "name", label: "Nome A-Z", type: "string" },
  ],
  defaultSortKey: "departure_date",
  defaultSortDirection: "asc",
  dateField: "departure_date",
  dateFieldOptions: [
    { key: "departure_date", label: "Data embarque" },
    { key: "close_date", label: "Data fechamento" },
  ],
  searchPlaceholder: "Buscar nome, ID, destino, localizador, hotel...",
  searchFields: ["name", "display_id", "origin_city", "destination_city", "destination_iata", "airline", "locators", "hotel_name"],
  selectFilters: [
    { key: "status", label: "Status", options: [] },
    { key: "airline", label: "Cia aérea", options: [] },
  ],
  pillPresets: ["today", "tomorrow", "next_7_days", "next_30_days", "this_month", "last_30_days", "all"],
};

// Memoized row — re-renders only when sale data actually changes (not on sort/filter reorder)
type SellerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

interface SaleRowProps {
  sale: SaleRow;
  seller: SellerProfile | null;
  externalSeller: ExternalSeller | null;
  productCatalog: ReturnType<typeof useProductTypes>["catalog"];
  onNavigate: (id: string) => void;
  onNavigateClient: (clientId: string) => void;
  onDeleted: (id: string) => void;
}

const SaleRowComponent = memo(function SaleRowComponent({ sale, seller, externalSeller, productCatalog, onNavigate, onNavigateClient, onDeleted }: SaleRowProps) {
  const o = routeCode(sale.origin_city, sale.origin_iata);
  const d = routeCode(sale.destination_city, sale.destination_iata);
  const routeEmpty = !o && !d;
  const pax = (sale.adults || 0) + (sale.children || 0);
  const slugs = normalizeProductsToSlugs(sale.products);

  const sellerInitials = seller
    ? (seller.full_name || seller.email || "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "";
  const sellerFirstName = seller
    ? (seller.full_name?.split(" ")[0] || seller.email?.split("@")[0] || "—")
    : null;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onNavigate(sale.id)}>
      <td className="px-3 py-3">
        <p className="font-medium text-foreground truncate">{sale.name}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <span className="truncate">{sale.display_id} · {formatDateBR(sale.close_date)}</span>
          {sale.client_id && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigateClient(sale.client_id!); }}
              className="text-primary hover:underline font-medium flex-shrink-0"
            >
              👤
            </button>
          )}
        </div>
      </td>
      <td className="px-2 py-3 text-left"><span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateBR(sale.close_date)}</span></td>
      <td className="px-2 py-3"><span className="text-xs font-mono whitespace-nowrap">{fmtShortDate(sale.departure_date) || <span className="text-muted-foreground/40">—</span>}</span></td>
      <td className="px-2 py-3"><span className="text-xs font-mono whitespace-nowrap">{fmtShortDate(sale.return_date) || <span className="text-muted-foreground/40 italic text-[11px]">Somente ida</span>}</span></td>
      <td className="px-2 py-3">
        <span className={cn("font-mono text-xs", routeEmpty && "text-muted-foreground/40 italic")}>
          {o && d ? `${o} → ${d}` : o ? `${o} → N/D` : d ? `N/D → ${d}` : "—"}
        </span>
      </td>
      <td className="px-1 py-3 text-center">{pax}</td>
      <td className="px-1 py-3">
        <div className="flex gap-1 items-center flex-wrap">
          {slugs.map((slug) => {
            const meta = getProductMeta(slug, productCatalog);
            const Icon = meta.icon;
            const tooltipLabel = slug === "hospedagem" && sale.hotel_name ? sale.hotel_name : meta.label;
            return (
              <Tooltip key={slug}>
                <TooltipTrigger asChild><span><Icon className={cn("w-3.5 h-3.5", meta.className)} /></span></TooltipTrigger>
                <TooltipContent>{tooltipLabel}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </td>
      <td className="px-2 py-3 text-right font-medium whitespace-nowrap">{fmt(sale.received_value || 0)}</td>
      <td className="px-2 py-3 text-right text-muted-foreground whitespace-nowrap">{fmt(sale.total_cost || 0)}</td>
      <td className="px-2 py-3 text-right">
        <span className={cn("font-medium whitespace-nowrap", (sale.profit || 0) > 0 ? "text-success" : (sale.profit || 0) < 0 ? "text-destructive" : "text-foreground")}>
          {fmt(sale.profit || 0)}
        </span>
      </td>
      <td className="px-1 py-3 text-right">
        <span className={cn("whitespace-nowrap", (sale.margin || 0) > 25 ? "text-success font-semibold" : "text-foreground")}>
          {(sale.margin || 0).toFixed(1)}%
        </span>
      </td>
      <td className="px-1 py-3 text-center">
        {sale.lead_type === "organico"
          ? <Badge variant="outline" className={cn("text-[10px]", leadColor.organico)}>Orgânico</Badge>
          : <Badge variant="outline" className={cn("text-[10px]", leadColor.agencia)}>Agência</Badge>}
      </td>
      <td className="px-2 py-3 text-xs">
        {seller ? (
          <span className="inline-flex items-center gap-1.5" title={seller.email || seller.full_name || ""}>
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                alt={seller.full_name || ""}
                className="w-5 h-5 rounded-full object-cover shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[9px] font-semibold shrink-0">
                {sellerInitials}
              </div>
            )}
            <span className="truncate max-w-[100px]">{sellerFirstName}</span>
          </span>
        ) : externalSeller ? (
          (() => {
            const initials = externalSeller.name
              .split(/\s+/).filter(Boolean).slice(0, 2)
              .map((w) => w[0]?.toUpperCase()).join("");
            const firstName = externalSeller.name.split(" ")[0];
            return (
              <span
                className="inline-flex items-center gap-1.5"
                title={`${externalSeller.name}${externalSeller.active ? "" : " (inativo)"}`}
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[9px] font-semibold shrink-0">
                  {initials}
                </div>
                <span className="truncate max-w-[100px] italic text-amber-700 dark:text-amber-400">{firstName}</span>
              </span>
            );
          })()
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <div className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center text-[9px]">—</div>
            <span className="text-[11px]">Sem vendedor</span>
          </span>
        )}
      </td>
      <td className="px-2 py-3">
        <Badge variant="outline" className={cn("text-[10px] whitespace-nowrap", statusColor[sale.status] || "")}>{sale.status}</Badge>
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onNavigate(sale.id)} title="Ver detalhes"><Eye className="w-4 h-4" /></Button>
          <DeleteSaleButton saleId={sale.id} saleLabel={`${sale.display_id} — ${sale.name}`} onDeleted={onDeleted} />
        </div>
      </td>
    </tr>
  );
});

export default function Sales() {
  const { user, isLoading: authLoading } = useAuth();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [sellersMap, setSellersMap] = useState<Map<string, SellerProfile>>(new Map());
  const [filterSeller, setFilterSeller] = useState<string>("all");
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const navigate = useNavigate();
  const { catalog: productCatalog } = useProductTypes();
  const { sellers: externalSellers, reload: reloadExternal } = useExternalSellers();
  const externalMap = useMemo(() => {
    const m = new Map<string, ExternalSeller>();
    for (const s of externalSellers) m.set(s.id, s);
    return m;
  }, [externalSellers]);

  // Fetch sellers (profiles) once on mount · small dataset, O(1) lookup via Map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url");
      if (cancelled || error || !data) return;
      const map = new Map<string, SellerProfile>();
      for (const p of data) map.set(p.id, p as SellerProfile);
      setSellersMap(map);
    })();
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    if (authLoading) return;
    fetchAllRows("sales", "id, display_id, name, close_date, status, origin_iata, destination_iata, origin_city, destination_city, departure_date, return_date, adults, children, products, received_value, total_cost, profit, margin, score, airline, locators, seller_id, external_seller_id, created_at, client_id, lead_type, hotel_name", { order: { column: "created_at", ascending: false } }).then((data) => {
      setSales(data as SaleRow[]);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [authLoading]);

  const statuses = useMemo(() => {
    const ALWAYS_SHOW = ["Aguardando Emissão"];
    const fromData = sales.map(s => s.status).filter(Boolean);
    return [...new Set([...fromData, ...ALWAYS_SHOW])].sort();
  }, [sales]);
  const airlines = useMemo(() => [...new Set(sales.map(s => s.airline).filter(Boolean))].sort() as string[], [sales]);

  const { filtered: smartFiltered, state: filterState, setState: setFilterState, activeFilterCount, clearAll: clearFilters } = useSmartFilters(sales, SALES_FILTER_CONFIG);

  // Local table column sorting
  type ColSortKey = "name" | "close_date" | "departure_date" | "return_date" | "received_value" | "total_cost" | "profit" | "margin" | "status" | "seller";
  // Default: ordena por Data da Venda (close_date) decrescente — mais recentes primeiro
  const [colSort, setColSort] = useState<{ key: ColSortKey; dir: "asc" | "desc" } | null>({ key: "close_date", dir: "desc" });

  const toggleColSort = (key: ColSortKey) => {
    setColSort(prev => {
      if (prev?.key === key) {
        if (prev.dir === "asc") return { key, dir: "desc" };
        return null; // third click clears
      }
      return { key, dir: "asc" };
    });
  };

  const filtered = useMemo(() => {
    let base = smartFiltered;
    if (filterSeller !== "all") {
      if (filterSeller === "none") {
        base = base.filter(s => !s.seller_id && !s.external_seller_id);
      } else if (filterSeller.startsWith("ext:")) {
        const extId = filterSeller.slice(4);
        base = base.filter(s => s.external_seller_id === extId);
      } else {
        base = base.filter(s => s.seller_id === filterSeller);
      }
    }

    if (!colSort) return base;
    const { key, dir } = colSort;
    return [...base].sort((a, b) => {
      // Sort especial por vendedor (resolve nome via Map)
      if (key === "seller") {
        const aName = a.seller_id ? sellersMap.get(a.seller_id)?.full_name || "" : "";
        const bName = b.seller_id ? sellersMap.get(b.seller_id)?.full_name || "" : "";
        if (!aName && !bName) return 0;
        if (!aName) return 1;
        if (!bName) return -1;
        return dir === "asc" ? aName.localeCompare(bName, "pt-BR") : bName.localeCompare(aName, "pt-BR");
      }
      const av = (a as any)[key];
      const bv = (b as any)[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [smartFiltered, colSort, filterSeller, sellersMap]);

  const totals = useMemo(() => {
    const t = (list: SaleRow[]) => {
      const commission = list.reduce((s, r) => {
        const lucro = (r.profit || 0);
        const pct = r.lead_type === "organico" ? 0.40 : 0.15;
        return s + (lucro > 0 ? lucro * pct : 0);
      }, 0);
      return {
        count: list.length,
        pax: list.reduce((s, r) => s + (r.adults || 0) + (r.children || 0), 0),
        revenue: list.reduce((s, r) => s + (r.received_value || 0), 0),
        cost: list.reduce((s, r) => s + (r.total_cost || 0), 0),
        profit: list.reduce((s, r) => s + (r.profit || 0), 0),
        margin: list.length ? list.reduce((s, r) => s + (r.margin || 0), 0) / list.length : 0,
        commission,
      };
    };
    return { all: t(sales), filtered: t(filtered) };
  }, [sales, filtered]);

  const handleNavigateSale = useCallback((id: string) => navigate(`/sales/${id}`), [navigate]);
  const handleNavigateClient = useCallback((id: string) => navigate(`/clients/${id}`), [navigate]);
  const handleDeleted = useCallback((id: string) => setSales((prev) => prev.filter((s) => s.id !== id)), []);

  const handleExport = async () => {
    setExportProgress(0);
    // Pequenas etapas para a barra dar feedback mesmo em volumes pequenos
    const headers = ["ID", "Nome", "Status", "Origem", "Destino", "PAX", "Receita", "Custo", "Lucro", "Margem%", "Lead", "Data Ida", "Data Volta"];
    const total = filtered.length || 1;
    const rows: string[][] = [];
    for (let i = 0; i < filtered.length; i++) {
      const s = filtered[i];
      rows.push([
        s.display_id, s.name, s.status, s.origin_iata || "", s.destination_iata || "",
        String((s.adults || 0) + (s.children || 0)), String(s.received_value || 0), String(s.total_cost || 0), String(s.profit || 0),
        (s.margin || 0).toFixed(1), s.lead_type || "",
        s.departure_date || "", s.return_date || "",
      ]);
      if (i % 50 === 0) {
        setExportProgress(Math.round((i / total) * 90));
        await new Promise((r) => setTimeout(r, 0)); // libera o frame
      }
    }
    setExportProgress(95);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vendas-natleva-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setExportProgress(100);
    setTimeout(() => setExportProgress(null), 400);
  };

  const renderDates = (sale: SaleRow) => {
    const dep = fmtShortDate(sale.departure_date);
    const ret = fmtShortDate(sale.return_date);
    if (!dep && !ret) return <span className="text-muted-foreground/40 italic text-xs">—</span>;
    if (dep && ret) return <span className="text-xs font-mono">{dep} → {ret}</span>;
    return <span className="text-xs font-mono">{dep || ret}</span>;
  };

  const renderLeadBadge = (leadType: string) => {
    if (leadType === "organico") return <Badge variant="outline" className={cn("text-[10px]", leadColor.organico)}>Orgânico</Badge>;
    return <Badge variant="outline" className={cn("text-[10px]", leadColor.agencia)}>Agência</Badge>;
  };

  const renderRoute = (sale: SaleRow) => {
    const o = routeCode(sale.origin_city, sale.origin_iata);
    const d = routeCode(sale.destination_city, sale.destination_iata);
    const empty = !o && !d;
    return (
      <span className={cn("font-mono text-xs", empty && "text-muted-foreground/40 italic")}>
        {o && d ? `${o} → ${d}` : o ? `${o} → N/D` : d ? `N/D → ${d}` : "—"}
      </span>
    );
  };

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-4 md:space-y-5 animate-fade-in relative">
        {exportProgress !== null && (
          <ProgressOverlay label="Exportando vendas..." progress={exportProgress} fullscreen />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif text-foreground">Vendas</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} de {sales.length} vendas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs"><Download className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Exportar</span></Button>
            <Button size="sm" onClick={() => navigate("/sales/new")} className="text-xs"><Plus className="w-4 h-4 mr-1" /> Nova Venda</Button>
          </div>
        </div>

        <SmartFilters
          config={SALES_FILTER_CONFIG}
          state={filterState}
          setState={setFilterState}
          activeFilterCount={activeFilterCount}
          clearAll={clearFilters}
          dynamicOptions={{ status: statuses, airline: airlines }}
        />

        {sellersMap.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Vendedor:</span>
            <Select value={filterSeller} onValueChange={(v) => {
              if (v === "__manage__") { setExternalDialogOpen(true); return; }
              setFilterSeller(v);
            }}>
              <SelectTrigger className="w-[220px] h-9 text-xs">
                <SelectValue placeholder="Todos vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vendedores</SelectItem>
                <SelectItem value="none">Sem vendedor</SelectItem>
                <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Equipe atual
                </div>
                {Array.from(sellersMap.values())
                  .sort((a, b) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "", "pt-BR"))
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name || s.email}
                    </SelectItem>
                  ))}
                {externalSellers.length > 0 && (
                  <>
                    <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Externos / Histórico
                    </div>
                    {externalSellers.map(s => (
                      <SelectItem key={`ext:${s.id}`} value={`ext:${s.id}`}>
                        <span className="text-amber-700 dark:text-amber-400">
                          {s.name}{!s.active && " (inativo)"}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
                <div className="border-t border-border/20 mt-1 pt-1">
                  <SelectItem value="__manage__" className="text-muted-foreground italic">
                    + Gerenciar externos
                  </SelectItem>
                </div>
              </SelectContent>
            </Select>
            {filterSeller !== "all" && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilterSeller("all")}>
                <X className="w-3 h-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
        )}

        <ExternalSellersDialog
          open={externalDialogOpen}
          onOpenChange={setExternalDialogOpen}
          onChanged={reloadExternal}
        />

        {loading ? (
          <ListPageSkeleton rows={8} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeFilterCount > 0 ? "Nenhuma venda encontrada com os filtros aplicados." : "Nenhuma venda ainda. Crie a primeira!"}
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="sm:hidden space-y-3">
              {filtered.map((sale) => (
                <Card key={sale.id} className="p-4 glass-card cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/sales/${sale.id}`)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{sale.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sale.display_id} · {formatDateBR(sale.close_date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn("text-[10px] shrink-0", statusColor[sale.status] || "")}>{sale.status}</Badge>
                      {renderLeadBadge(sale.lead_type)}
                      <DeleteSaleButton saleId={sale.id} saleLabel={`${sale.display_id} — ${sale.name}`} onDeleted={handleDeleted} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {renderDates(sale)}
                    <span className="mx-1">·</span>
                    {renderRoute(sale)}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{(sale.adults || 0) + (sale.children || 0)} pax</span>
                      <div className="flex gap-1 items-center flex-wrap">
                        {normalizeProductsToSlugs(sale.products).map((slug) => {
                          const meta = getProductMeta(slug, productCatalog);
                          const Icon = meta.icon;
                          const tooltipLabel = slug === "hospedagem" && sale.hotel_name ? sale.hotel_name : meta.label;
                          return (
                            <Tooltip key={slug}>
                              <TooltipTrigger asChild><span><Icon className={cn("w-3.5 h-3.5", meta.className)} /></span></TooltipTrigger>
                              <TooltipContent>{tooltipLabel}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmt(sale.received_value || 0)}</p>
                      <p className={cn("text-[10px]", (sale.profit || 0) > 0 ? "text-success" : "text-destructive")}>
                        Lucro {fmt(sale.profit || 0)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop table view */}
            <Card className="glass-card overflow-hidden hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1280px]">
                  <colgroup>
                    <col style={{ minWidth: "200px" }} />
                    <col style={{ minWidth: "100px" }} />
                    <col style={{ minWidth: "85px" }} />
                    <col style={{ minWidth: "85px" }} />
                    <col style={{ minWidth: "110px" }} />
                    <col style={{ minWidth: "50px" }} />
                    <col style={{ minWidth: "80px" }} />
                    <col style={{ minWidth: "110px" }} />
                    <col style={{ minWidth: "110px" }} />
                    <col style={{ minWidth: "110px" }} />
                    <col style={{ minWidth: "70px" }} />
                    <col style={{ minWidth: "85px" }} />
                    <col style={{ minWidth: "130px" }} />
                    <col style={{ minWidth: "100px" }} />
                    <col style={{ minWidth: "90px" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {([
                        { key: "name", label: "Venda", align: "text-left", px: "px-3" },
                        { key: "close_date", label: "Data da Venda", align: "text-left", px: "px-2" },
                        { key: "departure_date", label: "Ida", align: "text-left", px: "px-2" },
                        { key: "return_date", label: "Volta", align: "text-left", px: "px-2" },
                        { key: null, label: "Rota", align: "text-left", px: "px-2" },
                        { key: null, label: "PAX", align: "text-center", px: "px-1" },
                        { key: null, label: "Produtos", align: "text-left", px: "px-1" },
                        { key: "received_value", label: "Valor", align: "text-right", px: "px-2" },
                        { key: "total_cost", label: "Custo", align: "text-right", px: "px-2" },
                        { key: "profit", label: "Lucro", align: "text-right", px: "px-2" },
                        { key: "margin", label: "Margem", align: "text-right", px: "px-1" },
                        { key: null, label: "Lead", align: "text-center", px: "px-1" },
                        { key: "seller", label: "Vendedor", align: "text-left", px: "px-2" },
                        { key: "status", label: "Status", align: "text-left", px: "px-1" },
                      ] as { key: ColSortKey | null; label: string; align: string; px: string }[]).map((col) => (
                        <th
                          key={col.label}
                          className={cn(
                            col.align, col.px, "py-3 font-semibold text-muted-foreground text-xs",
                            col.key && "cursor-pointer select-none hover:text-foreground transition-colors"
                          )}
                          onClick={col.key ? () => toggleColSort(col.key!) : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {col.key && (
                              colSort?.key === col.key
                                ? colSort.dir === "asc"
                                  ? <ArrowUp className="w-3 h-3" />
                                  : <ArrowDown className="w-3 h-3" />
                                : <ArrowUpDown className="w-3 h-3 opacity-30" />
                            )}
                          </span>
                        </th>
                      ))}
                      <th className="px-2 py-3 text-center font-semibold text-muted-foreground text-xs">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((sale) => (
                      <SaleRowComponent
                        key={sale.id}
                        sale={sale}
                        seller={sale.seller_id ? sellersMap.get(sale.seller_id) || null : null}
                        productCatalog={productCatalog}
                        onNavigate={handleNavigateSale}
                        onNavigateClient={handleNavigateClient}
                        onDeleted={handleDeleted}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            {/* Summary footer */}
            <Card className="glass-card p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Vendas {activeFilterCount > 0 ? "(filtradas)" : ""}</p>
                  <p className="text-lg font-bold text-foreground">{totals.filtered.count}</p>
                  {activeFilterCount > 0 && <p className="text-[10px] text-muted-foreground">de {totals.all.count} total</p>}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">PAX Total</p>
                  <p className="text-lg font-bold text-foreground">{totals.filtered.pax}</p>
                  {activeFilterCount > 0 && <p className="text-[10px] text-muted-foreground">de {totals.all.pax} total</p>}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Faturamento</p>
                  <p className="text-lg font-bold text-foreground">{fmt(totals.filtered.revenue)}</p>
                  {activeFilterCount > 0 && <p className="text-[10px] text-muted-foreground">de {fmt(totals.all.revenue)} total</p>}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Custo Total</p>
                  <p className="text-lg font-bold text-foreground">{fmt(totals.filtered.cost)}</p>
                  {activeFilterCount > 0 && <p className="text-[10px] text-muted-foreground">de {fmt(totals.all.cost)} total</p>}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Lucro</p>
                  <p className={cn("text-lg font-bold", totals.filtered.profit > 0 ? "text-success" : "text-destructive")}>{fmt(totals.filtered.profit)}</p>
                  {activeFilterCount > 0 && <p className="text-[10px] text-muted-foreground">de {fmt(totals.all.profit)} total</p>}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Margem Média</p>
                  <p className={cn("text-lg font-bold", totals.filtered.margin > 25 ? "text-success" : "text-foreground")}>{totals.filtered.margin.toFixed(1)}%</p>
                  {activeFilterCount > 0 && <p className="text-[10px] text-muted-foreground">geral: {totals.all.margin.toFixed(1)}%</p>}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Comissões Est.</p>
                  <p className="text-lg font-bold text-accent">{fmt(totals.filtered.commission)}</p>
                  {activeFilterCount > 0 && <p className="text-[10px] text-muted-foreground">de {fmt(totals.all.commission)} total</p>}
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
