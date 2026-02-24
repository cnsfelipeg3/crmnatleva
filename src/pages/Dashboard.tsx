import { useState, useEffect, useMemo } from "react";
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

  const [period, setPeriod] = useState("all");
  const [seller, setSeller] = useState("all");
  const [destination, setDestination] = useState("all");
  const [product, setProduct] = useState("all");

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

  const periodCutoff = useMemo(() => {
    if (period === "all") return null;
    const now = new Date();
    const months = period === "30d" ? 1 : period === "90d" ? 3 : 12;
    return new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  }, [period]);

  const filtered = useMemo(() => {
    let result = sales;
    if (periodCutoff) result = result.filter(s => new Date(s.created_at) >= periodCutoff);
    if (seller !== "all") {
      const sellerId = profiles.find(p => p.full_name === seller)?.id;
      if (sellerId) result = result.filter(s => s.seller_id === sellerId);
    }
    if (destination !== "all") result = result.filter(s => s.destination_iata === destination);
    if (product !== "all") result = result.filter(s => (s.products || []).includes(product));
    return result;
  }, [sales, periodCutoff, seller, destination, product, profiles]);

  const previous = useMemo(() => {
    if (!periodCutoff) return [];
    const months = period === "30d" ? 1 : period === "90d" ? 3 : 12;
    const prevCutoff = new Date(periodCutoff.getFullYear(), periodCutoff.getMonth() - months, periodCutoff.getDate());
    return sales.filter(s => {
      const d = new Date(s.created_at);
      return d >= prevCutoff && d < periodCutoff;
    });
  }, [sales, periodCutoff, period]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 md:h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] bg-grid-pattern" />

      <DashboardFilters
        period={period} setPeriod={setPeriod}
        seller={seller} setSeller={setSeller}
        destination={destination} setDestination={setDestination}
        product={product} setProduct={setProduct}
        sellers={sellersList} destinations={destinationsList}
      />

      <KpiCards filtered={filtered} previous={previous} />

      <div className="glow-line" />

      <FinancialSection filtered={filtered} sellerNames={sellerNames} />
      <CommercialSection filtered={filtered} segments={segments} sellerNames={sellerNames} />
      <OperationalSection checkinTasks={checkinTasks} lodgingTasks={lodgingTasks} />
      <ClientsSection clients={clients} filtered={filtered} periodStart={periodCutoff} />
      <GeographicSection filtered={filtered} />
      <MilesSection filtered={filtered} costItems={costItems} />
      <AlertsSection filtered={filtered} sellerNames={sellerNames} />
    </div>
  );
}
