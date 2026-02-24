import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAll";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import KpiCards from "@/components/dashboard/KpiCards";
import FinancialSection from "@/components/dashboard/FinancialSection";
import CommercialSection from "@/components/dashboard/CommercialSection";
import OperationalSection from "@/components/dashboard/OperationalSection";
import ClientsSection from "@/components/dashboard/ClientsSection";
import GeographicSection from "@/components/dashboard/GeographicSection";
import MilesSection from "@/components/dashboard/MilesSection";
import AlertsSection from "@/components/dashboard/AlertsSection";
import ValueRangeSection from "@/components/dashboard/ValueRangeSection";
import FunnelSection from "@/components/dashboard/FunnelSection";
import SeasonalitySection from "@/components/dashboard/SeasonalitySection";
import RegionSection from "@/components/dashboard/RegionSection";
import MarginAnalysisSection from "@/components/dashboard/MarginAnalysisSection";
import SellerRankingSection from "@/components/dashboard/SellerRankingSection";
import GoalProjectionSection from "@/components/dashboard/GoalProjectionSection";
import HeatmapSection from "@/components/dashboard/HeatmapSection";
import OriginSection from "@/components/dashboard/OriginSection";
import { Skeleton } from "@/components/ui/skeleton";

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
interface Client { id: string; display_name: string; created_at: string; }
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

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [checkinTasks, setCheckinTasks] = useState<CheckinTask[]>([]);
  const [lodgingTasks, setLodgingTasks] = useState<LodgingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [ceoMode, setCeoMode] = useState(false);

  // Filters
  const [period, setPeriod] = useState("all");
  const [seller, setSeller] = useState("all");
  const [destination, setDestination] = useState("all");
  const [product, setProduct] = useState("all");
  const [status, setStatus] = useState("all");
  const [valueRange, setValueRange] = useState("all");
  const [marginRange, setMarginRange] = useState("all");
  const [region, setRegion] = useState("all");

  useEffect(() => {
    Promise.all([
      fetchAllRows("sales", "*", { order: { column: "created_at", ascending: false } }),
      fetchAllRows("profiles", "id, full_name"),
      fetchAllRows("clients", "id, display_name, created_at"),
      fetchAllRows("flight_segments", "sale_id, origin_iata, destination_iata"),
      fetchAllRows("cost_items", "sale_id, category, miles_quantity, miles_price_per_thousand, miles_program, cash_value, total_item_cost"),
      fetchAllRows("checkin_tasks", "status, checkin_open_datetime_utc, completed_at, created_at"),
      fetchAllRows("lodging_confirmation_tasks", "status, milestone, scheduled_at_utc, issue_type"),
    ]).then(([salesData, profilesData, clientsData, segmentsData, costsData, checkinData, lodgingData]) => {
      setSales(salesData as Sale[]);
      setProfiles(profilesData as Profile[]);
      setClients(clientsData as Client[]);
      setSegments(segmentsData as Segment[]);
      setCostItems(costsData as CostItem[]);
      setCheckinTasks(checkinData as CheckinTask[]);
      setLodgingTasks(lodgingData as LodgingTask[]);
      setLoading(false);
    });
  }, []);

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

  // Region classifier
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

  const periodCutoff = useMemo(() => {
    if (period === "all") return null;
    const now = new Date();
    const daysMap: Record<string, number> = {
      "today": 0, "yesterday": 1, "7d": 7, "30d": 30, "90d": 90, "this_month": 0, "last_month": 0, "12m": 365,
    };
    if (period === "this_month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "last_month") return new Date(now.getFullYear(), now.getMonth() - 1, 1);
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
    if (periodCutoff) result = result.filter(s => new Date(s.created_at) >= periodCutoff);
    if (periodEnd) result = result.filter(s => new Date(s.created_at) <= periodEnd);
    if (seller !== "all") {
      const sellerId = profiles.find(p => p.full_name === seller)?.id;
      if (sellerId) result = result.filter(s => s.seller_id === sellerId);
    }
    if (destination !== "all") result = result.filter(s => s.destination_iata === destination);
    if (product !== "all") result = result.filter(s => (s.products || []).includes(product));
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
      const d = new Date(s.created_at);
      return d >= prevCutoff && d < periodCutoff;
    });
  }, [sales, periodCutoff]);

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

  if (loading) {
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

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6 animate-fade-in relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] bg-grid-pattern" />

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
        totalSales={sales.length}
        filteredCount={filtered.length}
        ceoMode={ceoMode}
        onToggleCeoMode={() => setCeoMode(!ceoMode)}
      />

      <KpiCards filtered={filtered} previous={previous} clients={clients} ceoMode={ceoMode} />

      {/* CEO Mode: Show only strategic sections */}
      {ceoMode ? (
        <>
          <GoalProjectionSection filtered={filtered} allSales={sales} />
          <div className="glow-line" />
          <FinancialSection filtered={filtered} sellerNames={sellerNames} />
          <div className="glow-line" />
          <SellerRankingSection filtered={filtered} sellerNames={sellerNames} />
          <div className="glow-line" />
          <AlertsSection filtered={filtered} sellerNames={sellerNames} clients={clients} />
        </>
      ) : (
        <>
          <div className="glow-line" />

          {/* Financeiro + Margem */}
          <FinancialSection filtered={filtered} sellerNames={sellerNames} />
          <MarginAnalysisSection filtered={filtered} sellerNames={sellerNames} getRegion={getRegion} />

          <div className="glow-line" />

          {/* Comercial + Funil */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <FunnelSection filtered={filtered} />
            <ValueRangeSection filtered={filtered} />
          </div>

          <CommercialSection filtered={filtered} segments={segments} sellerNames={sellerNames} />
          <RegionSection filtered={filtered} getRegion={getRegion} />

          <div className="glow-line" />

          {/* Origens */}
          <OriginSection filtered={filtered} sellerNames={sellerNames} />

          <div className="glow-line" />

          {/* Vendedores */}
          <SellerRankingSection filtered={filtered} sellerNames={sellerNames} />

          <div className="glow-line" />

          {/* Sazonalidade */}
          <SeasonalitySection filtered={filtered} allSales={sales} />

          <div className="glow-line" />

          {/* Projeção de Meta */}
          <GoalProjectionSection filtered={filtered} allSales={sales} />

          <div className="glow-line" />

          {/* Heatmaps */}
          <HeatmapSection filtered={filtered} />

          <div className="glow-line" />

          {/* Operacional + Clientes */}
          <OperationalSection checkinTasks={checkinTasks} lodgingTasks={lodgingTasks} />
          <ClientsSection clients={clients} filtered={filtered} periodStart={periodCutoff} />
          <GeographicSection filtered={filtered} />
          <MilesSection filtered={filtered} costItems={costItems} />

          <div className="glow-line" />

          <AlertsSection filtered={filtered} sellerNames={sellerNames} clients={clients} />
        </>
      )}
    </div>
  );
}
