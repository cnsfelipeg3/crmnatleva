import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { iataToCityName } from "@/lib/iataUtils";
import { MapPin, TrendingUp, Users, Plane } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Treemap,
} from "recharts";

interface Sale {
  origin_iata: string | null;
  destination_iata: string | null;
  received_value: number;
  adults: number;
  children: number;
  seller_id: string | null;
}

interface Props {
  filtered: Sale[];
  sellerNames: Record<string, string>;
}

const COLORS = [
  "hsl(160, 60%, 42%)", "hsl(210, 80%, 52%)", "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 50%)", "hsl(0, 72%, 51%)", "hsl(158, 60%, 38%)",
  "hsl(190, 70%, 45%)", "hsl(320, 60%, 50%)", "hsl(45, 80%, 45%)",
  "hsl(130, 50%, 40%)",
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function OriginSection({ filtered, sellerNames }: Props) {
  // Top origins by volume
  const originData = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; pax: number }> = {};
    filtered.forEach(s => {
      if (!s.origin_iata) return;
      const k = s.origin_iata;
      if (!map[k]) map[k] = { count: 0, revenue: 0, pax: 0 };
      map[k].count++;
      map[k].revenue += s.received_value || 0;
      map[k].pax += (s.adults || 0) + (s.children || 0);
    });
    return Object.entries(map)
      .map(([iata, v]) => ({ iata, name: iataToCityName(iata), ...v }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Origin → Destination flow
  const flowData = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach(s => {
      if (!s.origin_iata || !s.destination_iata) return;
      const k = `${s.origin_iata}→${s.destination_iata}`;
      if (!map[k]) map[k] = { count: 0, revenue: 0 };
      map[k].count++;
      map[k].revenue += s.received_value || 0;
    });
    return Object.entries(map)
      .map(([route, v]) => {
        const [o, d] = route.split("→");
        return { route, origin: iataToCityName(o), dest: iataToCityName(d), originIata: o, destIata: d, ...v };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [filtered]);

  // Origin concentration (% of total)
  const originConcentration = useMemo(() => {
    const total = filtered.length || 1;
    return originData.slice(0, 8).map(o => ({
      ...o,
      pct: Math.round((o.count / total) * 100),
    }));
  }, [originData, filtered]);

  // Treemap data for origins by revenue
  const treemapData = useMemo(() => {
    return originData.slice(0, 15).map((o, i) => ({
      name: `${o.name} (${o.iata})`,
      size: o.revenue,
      count: o.count,
      fill: COLORS[i % COLORS.length],
    }));
  }, [originData]);

  // Revenue per pax by origin
  const revenuePerPax = useMemo(() => {
    return originData
      .filter(o => o.pax > 0)
      .map(o => ({ ...o, rpp: o.revenue / o.pax }))
      .sort((a, b) => b.rpp - a.rpp)
      .slice(0, 10);
  }, [originData]);

  const topOrigin = originData[0];
  const totalPax = originData.reduce((s, o) => s + o.pax, 0);
  const avgTicket = filtered.length > 0 
    ? filtered.reduce((s, f) => s + (f.received_value || 0), 0) / filtered.length 
    : 0;

  if (originData.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="section-title">
        <Plane className="w-5 h-5 text-primary" />
        Análise de Origens
      </h2>

      {/* KPI mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card scan-line">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Principal Origem</span>
          </div>
          <p className="text-lg font-bold text-foreground data-glow">{topOrigin?.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{topOrigin?.iata} · {topOrigin?.count} vendas</p>
        </Card>
        <Card className="p-4 glass-card scan-line">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Origens Distintas</span>
          </div>
          <p className="text-lg font-bold text-foreground data-glow">{originData.length}</p>
          <p className="text-xs text-muted-foreground">{totalPax} passageiros</p>
        </Card>
        <Card className="p-4 glass-card scan-line">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-chart-2" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Ticket Médio</span>
          </div>
          <p className="text-lg font-bold text-foreground data-glow">{fmt(avgTicket)}</p>
          <p className="text-xs text-muted-foreground">por venda</p>
        </Card>
        <Card className="p-4 glass-card scan-line">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-chart-3" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Concentração Top 3</span>
          </div>
          <p className="text-lg font-bold text-foreground data-glow">
            {originConcentration.slice(0, 3).reduce((s, o) => s + o.pct, 0)}%
          </p>
          <p className="text-xs text-muted-foreground">das vendas</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top origins bar chart */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Top Origens por Volume
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={originConcentration} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                width={75}
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [name === "count" ? `${v} vendas` : `${v}%`, name === "count" ? "Vendas" : "% do Total"]}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {originConcentration.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Origin concentration pie */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            Distribuição por Origem
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={originConcentration}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={2}
                label={({ name, pct }) => `${name} ${pct}%`}
                labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 0.5 }}
              >
                {originConcentration.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v} vendas`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top flows */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plane className="w-4 h-4 text-chart-3" />
            Top Fluxos Origem → Destino
          </h3>
          <div className="space-y-2.5">
            {flowData.map((f, i) => {
              const maxCount = flowData[0]?.count || 1;
              const pct = (f.count / maxCount) * 100;
              return (
                <div key={f.route} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground w-5">{i + 1}.</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5">{f.originIata}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5">{f.destIata}</Badge>
                      <span className="text-muted-foreground hidden sm:inline text-[10px]">{f.origin} → {f.dest}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold">{f.count}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{fmt(f.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Revenue per pax by origin */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-chart-2" />
            Receita por Passageiro (por Origem)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenuePerPax} layout="vertical" margin={{ left: 80 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => fmt(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                width={75}
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [fmt(v), "Receita/Pax"]}
              />
              <Bar dataKey="rpp" radius={[0, 6, 6, 0]}>
                {revenuePerPax.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
