import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import { Interaction, hourlyActivity } from "@/lib/proposalAnalytics";

interface Props {
  interactions: Interaction[];
}

export default function HourlyActivityChart({ interactions }: Props) {
  const data = hourlyActivity(interactions, 7);
  const total = data.reduce((s, d) => s + d.views, 0);

  return (
    <Card className="p-4 space-y-3">
      <CardHeader className="p-0">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> Linha do tempo · últimos 7 dias
          <span className="text-[9px] text-muted-foreground ml-auto font-normal">{total} eventos</span>
        </CardTitle>
      </CardHeader>

      {data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Sem atividade nos últimos 7 dias.</p>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="proposalActivityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="hsl(var(--muted-foreground))"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--accent))", strokeDasharray: "3 3" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#proposalActivityGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
