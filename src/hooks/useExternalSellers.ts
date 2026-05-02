import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExternalSeller = {
  id: string;
  name: string;
  email: string | null;
  notes: string | null;
  active: boolean;
  archived_at: string | null;
};

export function useExternalSellers() {
  const [sellers, setSellers] = useState<ExternalSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("external_sellers")
      .select("id, name, email, notes, active, archived_at")
      .order("name");
    if (!error) setSellers((data as ExternalSeller[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { sellers, reload, loading };
}
