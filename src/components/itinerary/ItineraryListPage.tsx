import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plane, Hotel, Users, Search, Loader2, Calendar, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SaleRow {
  id: string;
  name: string;
  status: string;
  departure_date: string | null;
  return_date: string | null;
  client_id: string | null;
  created_at: string;
  clientName?: string;
  segmentCount?: number;
  hotelCount?: number;
  paxCount?: number;
}
  created_at: string;
  clientName?: string;
  segmentCount?: number;
  hotelCount?: number;
  paxCount?: number;
}

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ItineraryListPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, name, status, departure_date, return_date, client_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!salesData?.length) { setSales([]); setLoading(false); return; }

      // Fetch related counts & client names in parallel
      const clientIds = [...new Set(salesData.filter(s => s.client_id).map(s => s.client_id!))];
      const saleIds = salesData.map(s => s.id);

      const [clientsRes, segmentsRes, costRes, paxRes] = await Promise.all([
        clientIds.length ? supabase.from("clients").select("id, display_name").in("id", clientIds) : { data: [] },
        supabase.from("flight_segments").select("id, sale_id").in("sale_id", saleIds),
        supabase.from("cost_items").select("id, sale_id, category, product_type").in("sale_id", saleIds),
        (supabase as any).from("sale_passengers").select("id, sale_id").in("sale_id", saleIds),
      ]);

      const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c.display_name]));
      const segCountMap = new Map<string, number>();
      (segmentsRes.data || []).forEach((s: any) => segCountMap.set(s.sale_id, (segCountMap.get(s.sale_id) || 0) + 1));
      const hotelCountMap = new Map<string, number>();
      (costRes.data || []).forEach((c: any) => {
        if (c.category === "hotel" || c.product_type === "hotel") {
          hotelCountMap.set(c.sale_id, (hotelCountMap.get(c.sale_id) || 0) + 1);
        }
      });
      const paxCountMap = new Map<string, number>();
      (paxRes.data || []).forEach((p: any) => paxCountMap.set(p.sale_id, (paxCountMap.get(p.sale_id) || 0) + 1));

      setSales(salesData.map(s => ({
        ...s,
        clientName: s.client_id ? clientMap.get(s.client_id) || "—" : "—",
        segmentCount: segCountMap.get(s.id) || 0,
        hotelCount: hotelCountMap.get(s.id) || 0,
        paxCount: paxCountMap.get(s.id) || 0,
      })));
      setLoading(false);
    })();
  }, []);

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.clientName?.toLowerCase().includes(q);
  });

  const statusColor = (s: string | null) => {
    switch (s) {
      case "confirmada": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "em_andamento": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "cancelada": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
  };

  const statusLabel = (s: string | null) => {
    switch (s) {
      case "confirmada": return "Confirmada";
      case "em_andamento": return "Em andamento";
      case "cancelada": return "Cancelada";
      case "orcamento": return "Orçamento";
      default: return s || "—";
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Itinerários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione uma venda para gerar ou visualizar o itinerário premium em PDF.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar viagem ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma venda encontrada.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(sale => (
            <button
              key={sale.id}
              onClick={() => navigate(`/itinerario?sale_id=${sale.id}`)}
              className="group w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 flex items-center gap-4"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground truncate">{sale.name || "Viagem sem nome"}</span>
                  <Badge variant="outline" className={statusColor(sale.status)}>
                    {statusLabel(sale.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sale.clientName}</span>
                  {sale.departure_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {fmtDate(sale.departure_date)}{sale.return_date ? ` — ${fmtDate(sale.return_date)}` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                {sale.segmentCount! > 0 && (
                  <span className="flex items-center gap-1"><Plane className="w-3.5 h-3.5" />{sale.segmentCount}</span>
                )}
                {sale.hotelCount! > 0 && (
                  <span className="flex items-center gap-1"><Hotel className="w-3.5 h-3.5" />{sale.hotelCount}</span>
                )}
                {sale.paxCount! > 0 && (
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{sale.paxCount}</span>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
