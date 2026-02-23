import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["hsl(152, 38%, 16%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)", "hsl(152, 60%, 40%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)"];

interface Sale {
  destination_iata: string | null;
  products: string[];
  seller_id: string | null;
  received_value: number;
  created_at: string;
}

interface Segment {
  sale_id: string;
  origin_iata: string;
  destination_iata: string;
}

interface Props {
  filtered: Sale[];
  segments: Segment[];
  sellerNames: Record<string, string>;
}

export default function CommercialSection({ filtered, segments, sellerNames }: Props) {
  const destData = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach(s => { if (s.destination_iata) c[s.destination_iata] = (c[s.destination_iata] || 0) + 1; });
    return Object.entries(c).map(([name, vendas]) => ({ name, vendas })).sort((a, b) => b.vendas - a.vendas).slice(0, 10);
  }, [filtered]);

  const productData = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach(s => (s.products || []).forEach(p => (c[p] = (c[p] || 0) + 1)));
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Itinerary type distribution using segments
  const itineraryData = useMemo(() => {
    const saleSegments: Record<string, Segment[]> = {};
    segments.forEach(seg => {
      if (!saleSegments[seg.sale_id]) saleSegments[seg.sale_id] = [];
      saleSegments[seg.sale_id].push(seg);
    });

    let roundTrip = 0, multiCity = 0, oneWay = 0;
    const saleIds = new Set(filtered.map(s => (s as any).id));
    Object.entries(saleSegments).forEach(([saleId, segs]) => {
      if (!saleIds.has(saleId)) return;
      if (segs.length === 1) oneWay++;
      else if (segs.length === 2 && segs[0].origin_iata === segs[1].destination_iata) roundTrip++;
      else multiCity++;
    });

    return [
      { name: "Ida/Volta", value: roundTrip },
      { name: "Multi-City", value: multiCity },
      { name: "Só ida", value: oneWay },
    ].filter(d => d.value > 0);
  }, [filtered, segments]);

  const sellerRanking = useMemo(() => {
    const map: Record<string, { name: string; vendas: number; receita: number }> = {};
    filtered.forEach(s => {
      const sid = s.seller_id || "sem";
      const name = sellerNames[sid] || "Sem vendedor";
      if (!map[sid]) map[sid] = { name, vendas: 0, receita: 0 };
      map[sid].vendas++;
      map[sid].receita += s.received_value || 0;
    });
    return Object.values(map).sort((a, b) => b.vendas - a.vendas).slice(0, 8);
  }, [filtered, sellerNames]);

  const NoData = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-foreground">Comercial</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Destinos</h3>
          {destData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={destData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
                <Tooltip />
                <Bar dataKey="vendas" fill="hsl(152, 38%, 16%)" radius={[0, 4, 4, 0]} name="Vendas" />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Mix de Produtos</h3>
          {productData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {productData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tipo de Itinerário</h3>
          {itineraryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={itineraryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} label>
                  {itineraryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>
      </div>

      {sellerRanking.length > 0 && (
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Vendas por Vendedor</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sellerRanking}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="vendas" fill="hsl(152, 60%, 40%)" radius={[4, 4, 0, 0]} name="Vendas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
