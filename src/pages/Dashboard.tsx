import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { fetchAllRows } from "@/lib/fetchAll";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import KpiCards from "@/components/dashboard/KpiCards";
import DeferredRender from "@/components/DeferredRender";
import { Skeleton } from "@/components/ui/skeleton";
import { hasProduct } from "@/lib/productTypes";

const FinancialSection = lazy(() => import("@/components/dashboard/FinancialSection"));
const CommercialSection = lazy(() => import("@/components/dashboard/CommercialSection"));
const OperationalSection = lazy(() => import("@/components/dashboard/OperationalSection"));
const ClientsSection = lazy(() => import("@/components/dashboard/ClientsSection"));
const GeographicSection = lazy(() => import("@/components/dashboard/GeographicSection"));
const MilesSection = lazy(() => import("@/components/dashboard/MilesSection"));
const AlertsSection = lazy(() => import("@/components/dashboard/AlertsSection"));
const ValueRangeSection = lazy(() => import("@/components/dashboard/ValueRangeSection"));
const FunnelSection = lazy(() => import("@/components/dashboard/FunnelSection"));
const SeasonalitySection = lazy(() => import("@/components/dashboard/SeasonalitySection"));
const RegionSection = lazy(() => import("@/components/dashboard/RegionSection"));
const MarginAnalysisSection = lazy(() => import("@/components/dashboard/MarginAnalysisSection"));
const SellerRankingSection = lazy(() => import("@/components/dashboard/SellerRankingSection"));
const GoalProjectionSection = lazy(() => import("@/components/dashboard/GoalProjectionSection"));
const HeatmapSection = lazy(() => import("@/components/dashboard/HeatmapSection"));
const OriginSection = lazy(() => import("@/components/dashboard/OriginSection"));

interface Sale {
  id: string; name: string; display_id: string; status: string;
  origin_iata: string | null; destination_iata: string | null;
  departure_date: string | null; return_date: string | null;
  adults: number; children: number; products: string[];
  received_value: number; total_cost: number; profit: number; margin: number;
  airline: string | null; locators: string[];
  created_at: string; close_date: string | null;
  emission_status: string | null; hotel_name: string | null;
  is_international: boolean | null; miles_program: string | null;
  seller_id: string | null; client_id: string | null;
}

interface Profile { id: string; full_name: string; }
interface Client { id: string; display_name: string; created_at: string; customer_since: string | null; }
interface Segment { sale_id: string; origin_iata: string; destination_iata: string; }
interface CostItem {
  sale_id: string; category: string; miles_quantity: number | null;
  miles_price_per_thousand: number | null; miles_program: string | null;
  cash_value: number | null; total_item_cost: number | null;
}
interface CheckinTask {
  status: string; checkin_open_datetime_utc: string | null;
  completed_at: string | null; created_at: string;
}
interface LodgingTask {
  status: string; milestone: string;
  scheduled_at_utc: string | null; issue_type: string | null;
}

type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function SectionSkeleton({ tall = false }: { tall?: boolean }) {
  return <Skeleton className={tall ? "h-80 rounded-xl" : "h-72 rounded-xl"} />;
}

function DeferredDashboardSection({
  children,
  delayMs = 0,
  tall = false,
}: {
  children: React.ReactNode;
  delayMs?: number;
  tall?: boolean;
}) {
  return (
    <DeferredRender delayMs={delayMs} fallback={<SectionSkeleton tall={tall} />}>
      <Suspense fallback={<SectionSkeleton tall={tall} />}>
        {children}
      </Suspense>
    </DeferredRender>
  );
}

// Map UI period to RPC period param
function toRpcPeriod(p: string): string {
  if (p === "yesterday") return "all"; // RPC doesn't support yesterday — fallback
  return p;
}

export default function Dashboard() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const isPresidentNathalia = (profile?.email || user?.email || "").toLowerCase() === "nathalia@natleva.com";

  // Filters
  const [period, setPeriod] = useState("all");
  const [seller, setSeller] = useState("all");
  const [destination, setDestination] = useState("all");
  const [product, setProduct] = useState("all");
  const [status, setStatus] = useState("all");
  const [valueRange, setValueRange] = useState("all");
  const [marginRange, setMarginRange] = useState("all");
  const [region, setRegion] = useState("all");
  const [ceoMode, setCeoMode] = useState(false);

  // ── FAST PATH: Server-side aggregated KPIs ──
  const rpcSellerId = seller !== "all" ? seller : null; // will be resolved below
  const rpcDestination = destination !== "all" ? destination : null;
  const rpcStatus = status !== "all" ? status : null;

  // We need profiles to resolve seller name → id for RPC
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [passengersCount, setPassengersCount] = useState<number>(0);

  // Live count of registered passengers (real source of truth for "Clientes Totais")
  useEffect(() => {
    let alive = true;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("passengers")
        .select("id", { count: "exact", head: true });
      if (alive && typeof count === "number") setPassengersCount(count);
    };
    fetchCount();
    const channel = supabase
      .channel("dashboard-passengers-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "passengers" }, fetchCount)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);


  // Resolve seller name to id for RPC filter
  const sellerIdForRpc = useMemo(() => {
    if (seller === "all") return null;
    return profiles.find(p => p.full_name === seller)?.id ?? null;
  }, [seller, profiles]);

  const { data: kpiData, loading: kpiLoading } = useDashboardKpis(
    toRpcPeriod(period),
    sellerIdForRpc,
    rpcDestination,
    rpcStatus,
  );

  // ── DEFERRED PATH: Raw data for chart sections ──
  const [sales, setSales] = useState<Sale[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [checkinTasks, setCheckinTasks] = useState<CheckinTask[]>([]);
  const [lodgingTasks, setLodgingTasks] = useState<LodgingTask[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setDetailLoading(false);
      return;
    }
    let alive = true;
    setDetailLoading(true);
    let idleId: number | undefined;
    let phase2Timer: number | undefined;
    const browser = typeof window !== "undefined" ? (window as IdleCapableWindow) : undefined;

    // Phase 1: lightweight metadata (profiles, clients)
    Promise.all([
      fetchAllRows("profiles", "id, full_name", { cacheMs: 60000 }),
      fetchAllRows("clients", "id, display_name, created_at, customer_since", { maxRows: 15000, cacheMs: 30000 }),
    ]).then(([p, c]) => {
      if (!alive) return;
      setProfiles(p as Profile[]);
      setClients(c as Client[]);
    });

    // Phase 2: sales + auxiliary tables (deferred, non-blocking for KPIs)
    const loadDetailData = () => {
      Promise.all([
        fetchAllRows("sales", "id, name, display_id, status, origin_iata, destination_iata, departure_date, return_date, adults, children, products, received_value, total_cost, profit, margin, airline, locators, created_at, close_date, emission_status, hotel_name, is_international, miles_program, seller_id, client_id", { order: { column: "close_date", ascending: false }, maxRows: 5000 }),
        fetchAllRows("flight_segments", "sale_id, origin_iata, destination_iata", { maxRows: 10000, cacheMs: 30000 }),
        fetchAllRows("cost_items", "sale_id, category, miles_quantity, miles_price_per_thousand, miles_program, cash_value, total_item_cost", { maxRows: 10000, cacheMs: 30000 }),
        fetchAllRows("checkin_tasks", "status, checkin_open_datetime_utc, completed_at, created_at", { maxRows: 5000, cacheMs: 30000 }),
        fetchAllRows("lodging_confirmation_tasks", "status, milestone, scheduled_at_utc, issue_type", { maxRows: 5000, cacheMs: 30000 }),
      ]).then(([s, seg, ci, ct, lt]) => {
        if (!alive) return;
        setSales(s as Sale[]);
        setSegments(seg as Segment[]);
        setCostItems(ci as CostItem[]);
        setCheckinTasks(ct as CheckinTask[]);
        setLodgingTasks(lt as LodgingTask[]);
        setDetailLoading(false);
      }).catch(() => { if (alive) setDetailLoading(false); });
    };

    if (typeof browser?.requestIdleCallback === "function") {
      idleId = browser.requestIdleCallback(loadDetailData, { timeout: 1500 });
    } else if (typeof window !== "undefined") {
      phase2Timer = window.setTimeout(loadDetailData, 250);
    } else {
      loadDetailData();
    }

    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        if (idleId && typeof browser?.cancelIdleCallback === "function") browser.cancelIdleCallback(idleId);
        if (phase2Timer) window.clearTimeout(phase2Timer);
      }
    };
  }, [authLoading]);

  const sellerNames = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach(p => { map[p.id] = p.full_name; });
    return map;
  }, [profiles]);

  const sellersList = useMemo(() =>
    profiles.map(p => p.full_name).filter(Boolean).sort(),
  [profiles]);

  const destinationsList = useMemo(() => {
    const s = new Set<string>();
    sales.forEach(sale => { if (sale.destination_iata) s.add(sale.destination_iata); });
    return Array.from(s).sort();
  }, [sales]);

  const statusList = useMemo(() => {
    const s = new Set<string>();
    sales.forEach(sale => { if (sale.status) s.add(sale.status); });
    return Array.from(s).sort();
  }, [sales]);

  const getRegion = useCallback((iata: string | null) => {
    if (!iata) return "Desconhecido";
    const europeAirports = ["LIS","CDG","FCO","BCN","MAD","LHR","AMS","FRA","MUC","ZRH","VIE","PRG","DUB","CPH","OSL","ARN","HEL","WAW","BUD","ATH","IST","MXP","NAP","VCE","GVA","BRU","LUX","EDI"];
    const naAirports = ["JFK","MIA","MCO","LAX","SFO","EWR","BOS","ATL","ORD","DFW","IAH","SEA","YYZ","YVR","YUL","LAS","PHX","DEN","IAD","DCA"];
    const saAirports = ["GRU","GIG","BSB","CNF","SSA","REC","FOR","POA","CWB","BEL","MAO","FLN","VCP","SDU","CGH","NAT","MCZ","AJU","SLZ","THE","CGB","GYN","VIX","JPA","PMW","PVH","BPS","IOS","ILZ","LDB","MGF","UDI","PPB","RAO","SJP","MDE","BOG","SCL","EZE","LIM","MVD","UIO","CCS","ASU","GYE"];
    const meAirports = ["DXB","DOH","AUH","JED","RUH","AMM","TLV","CAI","BAH","KWI","MCT"];
    const asiaAirports = ["NRT","HND","ICN","PEK","PVG","HKG","SIN","BKK","KUL","DEL","BOM","TPE","MNL","CGK","DPS"];
    const caribAirports = ["CUN","PUJ","SXM","AUA","CUR","NAS","MBJ","HAV","SJU","BGI","UVF"];
    const africaAirports = ["JNB","CPT","NBO","CMN","CAI","LOS","ADD","DAR","MPM"];
    if (europeAirports.includes(iata)) return "Europa";
    if (naAirports.includes(iata)) return "América do Norte";
    if (saAirports.includes(iata)) return "América do Sul";
    if (meAirports.includes(iata)) return "Oriente Médio";
    if (asiaAirports.includes(iata)) return "Ásia";
    if (caribAirports.includes(iata)) return "Caribe";
    if (africaAirports.includes(iata)) return "África";
    return "Outros";
  }, []);

  // Client-side filtering for chart sections (raw data)
  const periodCutoff = useMemo(() => {
    if (period === "all") return null;
    const now = new Date();
    if (period === "this_month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "last_month") return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const daysMap: Record<string, number> = { "today": 0, "yesterday": 1, "7d": 7, "30d": 30, "90d": 90, "12m": 365 };
    const days = daysMap[period] ?? 30;
    return new Date(now.getTime() - days * 86400000);
  }, [period]);

  const periodEnd = useMemo(() => {
    if (period === "last_month") {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    }
    if (period === "yesterday") {
      const y = new Date(); y.setDate(y.getDate() - 1);
      return new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
    }
    return null;
  }, [period]);

  const filtered = useMemo(() => {
    let result = sales;
    if (periodCutoff) result = result.filter(s => s.close_date && new Date(s.close_date) >= periodCutoff);
    if (periodEnd) result = result.filter(s => s.close_date && new Date(s.close_date) <= periodEnd);
    if (seller !== "all") {
      const sid = profiles.find(p => p.full_name === seller)?.id;
      if (sid) result = result.filter(s => s.seller_id === sid);
    }
    if (destination !== "all") result = result.filter(s => s.destination_iata === destination);
    if (product !== "all") result = result.filter(s => hasProduct(s.products, product));
    if (status !== "all") result = result.filter(s => s.status === status);
    if (region !== "all") result = result.filter(s => getRegion(s.destination_iata) === region);
    if (valueRange !== "all") {
      const ranges: Record<string, [number, number]> = {
        "0-5k": [0, 5000], "5k-10k": [5000, 10000], "10k-20k": [10000, 20000],
        "20k-35k": [20000, 35000], "35k-60k": [35000, 60000], "60k+": [60000, Infinity],
      };
      const [min, max] = ranges[valueRange] || [0, Infinity];
      result = result.filter(s => (s.received_value || 0) >= min && (s.received_value || 0) < max);
    }
    if (marginRange !== "all") {
      const ranges: Record<string, [number, number]> = {
        "neg": [-Infinity, 0], "0-10": [0, 10], "10-20": [10, 20], "20-30": [20, 30], "30+": [30, Infinity],
      };
      const [min, max] = ranges[marginRange] || [-Infinity, Infinity];
      result = result.filter(s => (s.margin || 0) >= min && (s.margin || 0) < max);
    }
    return result;
  }, [sales, periodCutoff, periodEnd, seller, destination, product, profiles, status, region, valueRange, marginRange, getRegion]);

  const previous = useMemo(() => {
    if (!periodCutoff) return [];
    const diff = Date.now() - periodCutoff.getTime();
    const prevCutoff = new Date(periodCutoff.getTime() - diff);
    return sales.filter(s => {
      if (!s.close_date) return false;
      const d = new Date(s.close_date);
      return d >= prevCutoff && d < periodCutoff;
    });
  }, [sales, periodCutoff]);

  // Pre-sort client creation timestamps ONCE per clients array change.
  // Subsequent period changes use O(log n) binary search instead of O(n) scans.
  const clientTimestamps = useMemo(() => {
    const arr: number[] = [];
    for (const c of clients) {
      if (!c.created_at) continue;
      const t = new Date(c.created_at).getTime();
      if (!Number.isNaN(t)) arr.push(t);
    }
    arr.sort((a, b) => a - b);
    return arr;
  }, [clients]);

  // Clients growth: regras específicas por período (todas usam busca binária O(log n)).
  // - "today": hoje vs ontem
  // - "yesterday": ontem vs anteontem
  // - "this_month": mês corrente (parcial) vs mesmo intervalo do mês anterior
  // - "last_month": mês anterior completo vs mês retrasado
  // - "7d/30d/90d/12m": janela atual vs janela anterior de mesmo tamanho
  // - "all": últimos 30d vs 30d anteriores (referência de tendência recente)
  const clientsGrowth = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    const addDays = (ts: number, days: number) => ts + days * 86400000;

    let currentStart: number;
    let currentEnd: number;
    let previousStart: number;
    let previousEnd: number;
    let comparisonLabel: string;

    if (period === "today") {
      currentStart = startOfDay(now);
      currentEnd = endOfDay(now);
      const yest = new Date(now); yest.setDate(yest.getDate() - 1);
      previousStart = startOfDay(yest);
      previousEnd = endOfDay(yest);
      comparisonLabel = "vs ontem";
    } else if (period === "yesterday") {
      const yest = new Date(now); yest.setDate(yest.getDate() - 1);
      currentStart = startOfDay(yest);
      currentEnd = endOfDay(yest);
      const day2 = new Date(now); day2.setDate(day2.getDate() - 2);
      previousStart = startOfDay(day2);
      previousEnd = endOfDay(day2);
      comparisonLabel = "vs anteontem";
    } else if (period === "this_month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentStart = monthStart.getTime();
      currentEnd = now.getTime();
      const elapsedMs = currentEnd - currentStart;
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      previousStart = prevMonthStart;
      previousEnd = prevMonthStart + elapsedMs;
      comparisonLabel = "vs mesmo intervalo do mês anterior";
    } else if (period === "last_month") {
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
      const prev2Start = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
      const prev2End = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999).getTime();
      currentStart = prevMonthStart; currentEnd = prevMonthEnd;
      previousStart = prev2Start; previousEnd = prev2End;
      comparisonLabel = "vs mês retrasado";
    } else if (period === "all") {
      currentEnd = now.getTime();
      currentStart = addDays(currentEnd, -30);
      previousEnd = currentStart;
      previousStart = addDays(previousEnd, -30);
      comparisonLabel = "últimos 30d vs 30d anteriores";
    } else {
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };
      const days = daysMap[period] ?? 30;
      currentEnd = now.getTime();
      currentStart = addDays(currentEnd, -days);
      previousEnd = currentStart;
      previousStart = addDays(previousEnd, -days);
      comparisonLabel = `vs ${days}d anteriores`;
    }

    const lowerBound = (target: number) => {
      let lo = 0, hi = clientTimestamps.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (clientTimestamps[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    const upperBound = (target: number) => {
      let lo = 0, hi = clientTimestamps.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (clientTimestamps[mid] <= target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    const newCurrent = upperBound(currentEnd) - lowerBound(currentStart);
    const newPrevious = upperBound(previousEnd) - lowerBound(previousStart);
    const totalAtPreviousEnd = upperBound(previousEnd);

    return {
      current: clients.length,
      previousTotal: totalAtPreviousEnd,
      newCurrent,
      newPrevious,
      comparisonLabel,
    };
  }, [clientTimestamps, clients.length, period]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (period !== "all") c++;
    if (seller !== "all") c++;
    if (destination !== "all") c++;
    if (product !== "all") c++;
    if (status !== "all") c++;
    if (valueRange !== "all") c++;
    if (marginRange !== "all") c++;
    if (region !== "all") c++;
    return c;
  }, [period, seller, destination, product, status, valueRange, marginRange, region]);

  const clearAllFilters = useCallback(() => {
    setPeriod("all"); setSeller("all"); setDestination("all"); setProduct("all");
    setStatus("all"); setValueRange("all"); setMarginRange("all"); setRegion("all");
  }, []);

  // Show skeleton only while KPIs are loading (fast path)
  if (kpiLoading && !kpiData) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  // Use RPC data for KPI cards when simple filters are active, fall back when complex client-side filters are used
  const hasClientOnlyFilters = product !== "all" || valueRange !== "all" || marginRange !== "all" || region !== "all" || period === "yesterday";
  const useRpcForKpis = !hasClientOnlyFilters && kpiData;

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6 animate-fade-in relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] bg-grid-pattern" />

      {isPresidentNathalia && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 md:px-6 md:py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-3xl" aria-hidden>👑</span>
            <div>
              <h2 className="text-lg md:text-xl font-serif text-foreground">
                Bem-vinda, Presidente! Como está seu dia hoje?
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Aqui está o panorama geral da NatLeva agora mesmo.
              </p>
            </div>
          </div>
        </div>
      )}

      <DashboardFilters
        period={period} setPeriod={setPeriod}
        seller={seller} setSeller={setSeller}
        destination={destination} setDestination={setDestination}
        product={product} setProduct={setProduct}
        status={status} setStatus={setStatus}
        valueRange={valueRange} setValueRange={setValueRange}
        marginRange={marginRange} setMarginRange={setMarginRange}
        region={region} setRegion={setRegion}
        sellers={sellersList} destinations={destinationsList} statuses={statusList}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAllFilters}
        totalSales={kpiData?.total_sales ?? sales.length}
        filteredCount={useRpcForKpis ? (kpiData?.total_sales ?? 0) : filtered.length}
        ceoMode={ceoMode}
        onToggleCeoMode={() => setCeoMode(!ceoMode)}
      />

      <KpiCards
        kpiData={useRpcForKpis ? kpiData : undefined}
        filtered={filtered}
        previous={previous}
        clients={clients}
        clientsGrowth={clientsGrowth}
        passengersCount={passengersCount}
        ceoMode={ceoMode}
      />

      {/* Detail sections: show skeleton while raw data loads */}
      {detailLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <>
          {ceoMode ? (
            <>
              <DeferredDashboardSection>
                <GoalProjectionSection filtered={filtered} allSales={sales} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={120}>
                <FinancialSection filtered={filtered} sellerNames={sellerNames} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={240}>
                <SellerRankingSection filtered={filtered} sellerNames={sellerNames} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={360}>
                <AlertsSection filtered={filtered} sellerNames={sellerNames} clients={clients} />
              </DeferredDashboardSection>
            </>
          ) : (
            <>
              <div className="glow-line" />
              <DeferredDashboardSection>
                <FinancialSection filtered={filtered} sellerNames={sellerNames} />
              </DeferredDashboardSection>
              <DeferredDashboardSection delayMs={100}>
                <MarginAnalysisSection filtered={filtered} sellerNames={sellerNames} getRegion={getRegion} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DeferredDashboardSection delayMs={180}>
                  <FunnelSection filtered={filtered} />
                </DeferredDashboardSection>
                <DeferredDashboardSection delayMs={220}>
                  <ValueRangeSection filtered={filtered} />
                </DeferredDashboardSection>
              </div>
              <DeferredDashboardSection delayMs={300}>
                <CommercialSection filtered={filtered} segments={segments} sellerNames={sellerNames} />
              </DeferredDashboardSection>
              <DeferredDashboardSection delayMs={380}>
                <RegionSection filtered={filtered} getRegion={getRegion} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={460}>
                <OriginSection filtered={filtered} sellerNames={sellerNames} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={540}>
                <SellerRankingSection filtered={filtered} sellerNames={sellerNames} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={620}>
                <SeasonalitySection filtered={filtered} allSales={sales} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={700}>
                <GoalProjectionSection filtered={filtered} allSales={sales} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={780}>
                <HeatmapSection filtered={filtered} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={860}>
                <OperationalSection checkinTasks={checkinTasks} lodgingTasks={lodgingTasks} />
              </DeferredDashboardSection>
              <DeferredDashboardSection delayMs={940}>
                <ClientsSection clients={clients} filtered={filtered} periodStart={periodCutoff} />
              </DeferredDashboardSection>
              <DeferredDashboardSection delayMs={1020}>
                <GeographicSection filtered={filtered} />
              </DeferredDashboardSection>
              <DeferredDashboardSection delayMs={1100}>
                <MilesSection filtered={filtered} costItems={costItems} />
              </DeferredDashboardSection>
              <div className="glow-line" />
              <DeferredDashboardSection delayMs={1180}>
                <AlertsSection filtered={filtered} sellerNames={sellerNames} clients={clients} />
              </DeferredDashboardSection>
            </>
          )}
        </>
      )}
    </div>
  );
}
