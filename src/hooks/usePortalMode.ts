import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMockTripsForDashboard } from "@/lib/portalMockTrips";
import { getTripStatus } from "@/components/travel-ui";

export type PortalMode = "in-trip" | "pre-trip" | "post-trip" | "empty";

export interface UsePortalModeResult {
  loading: boolean;
  mode: PortalMode;
  allTrips: any[];
  activeTrip: any | null;
  nextTrip: any | null;
  upcomingTrips: any[];
  activeTrips: any[];
  pastTrips: any[];
}

export function usePortalMode(): UsePortalModeResult {
  const [allTrips, setAllTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { data } = await supabase.functions.invoke("portal-api", { body: { action: "trips" } });
        const apiTrips = data?.trips || [];
        const mockTrips = getMockTripsForDashboard();
        const existingIds = new Set(apiTrips.map((t: any) => t.sale_id));
        const newMocks = mockTrips.filter((m) => !existingIds.has(m.sale_id));
        setAllTrips([...apiTrips, ...newMocks]);
      } catch {
        setAllTrips(getMockTripsForDashboard());
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  const { upcomingTrips, activeTrips, pastTrips } = useMemo(() => {
    const upcoming = allTrips.filter((t) => getTripStatus(t.sale || {}) === "upcoming");
    const active = allTrips.filter((t) => getTripStatus(t.sale || {}) === "active");
    const past = allTrips
      .filter((t) => getTripStatus(t.sale || {}) === "past")
      .sort((a, b) => {
        const da = a.sale?.return_date ? new Date(a.sale.return_date).getTime() : 0;
        const db = b.sale?.return_date ? new Date(b.sale.return_date).getTime() : 0;
        return db - da;
      });
    return { upcomingTrips: upcoming, activeTrips: active, pastTrips: past };
  }, [allTrips]);

  const activeTrip = activeTrips[0] || null;

  const nextTrip = useMemo(
    () => upcomingTrips[0] || activeTrips[0] || null,
    [upcomingTrips, activeTrips]
  );

  const mode: PortalMode = activeTrips.length > 0
    ? "in-trip"
    : upcomingTrips.length > 0
      ? "pre-trip"
      : pastTrips.length > 0
        ? "post-trip"
        : "empty";

  return { loading, mode, allTrips, activeTrip, nextTrip, upcomingTrips, activeTrips, pastTrips };
}
