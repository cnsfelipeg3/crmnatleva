import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock, TrendingUp, Download, Info, Calendar, ArrowDownToLine, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";
import { useAffiliateMonthlyCommissions } from "@/components/vitrine/useAffiliateTimeSeries";
import CountUp from "@/components/vitrine/CountUp";
import { toast } from "sonner";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const fmtBRLshort = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-700" },
  available: { label: "Disponível", cls: "bg-emerald-500/10 text-emerald-700" },
  paid: { label: "Pago", cls: "bg-sky-500/10 text-sky-700" },
  canceled: { label: "Cancelado", cls: "bg-rose-500/10 text-rose-700" },
};

export default function VitrineComissoes() {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);
  const { data: series = [] } = useAffiliateMonthlyCommissions(affiliate?.id, 6);

  const { data: items, isLoading } = useQuery({
    queryKey: ["affiliate-commissions-list", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("id, sale_value, commission_percent, commission_value, status, created_at, paid_at, available_at, payment_reference")
        .eq("affiliate_id", affiliate!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const disponivel = stats?.availablePayout ?? 0;
  const pendente = stats?.pendingPayout ?? 0;
  const total = stats?.totalEarned ?? 0;

  const insights = useMemo(() => {
    const arr = items || [];
    const maxComm = arr.reduce((max, c) => Math.max(max, Number(c.commission_value || 0)), 0);
    const nextPayout = arr
      .filter((c) => c.status === "available" || c.status === "pending")
      .reduce((s, c) => s + Number(c.commission_value || 0), 0);
    const avgMonth = series.length
      ? series.reduce((s, p) => s + p.value, 0) / Math.max(1, series.filter((p) => p.value > 0).length || 1)
      : 0;
    return { maxComm, nextPayout, avgMonth };
  }, [items, series]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">Carteira</span>
        <h1 className="font-serif text-3xl sm:text-4xl">Comissões</h1>
        <p className="text-sm text-muted-foreground mt-1">
          O quanto você já transformou em renda real com a NatLeva.
        </p>
      </header>

      {/* Hero do saldo */}
      <section
        className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, #1a5a3f 0%, #0d3a28 45%, #051f15 100%)",
        }}
      >
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <p className="text-xs text-white/60">Saldo disponível</p>
            <div className="font-serif text-5xl tracking-tight mt-2">
              <CountUp value={disponivel} prefix="R$ " decimals={2} />
            </div>
            <Button
              disabled={disponivel <= 0 || !affiliate?.pix_key}
              onClick={() => toast.success("Solicitação enviada · PIX em até 1 dia útil.")}
              className="mt-5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-semibold rounded-full h-11 px-6 gap-2"
            >
              <ArrowDownToLine className="h-4 w-4" />
              {!affiliate?.pix_key ? "Cadastrar PIX" : "Receber via PIX"}
            </Button>
          </div>
          <div className="lg:col-span-2 grid grid-cols-3 gap-4">
            <StatPill label="Próximo pagamento" value={fmtBRLshort(insights.nextPayout)} hint="aprovado + em análise" />
            <StatPill label="Maior comissão" value={fmtBRLshort(insights.maxComm)} hint="histórico" icon={<Trophy className="h-3 w-3" />} />
            <StatPill label="Média mensal" value={fmtBRLshort(insights.avgMonth)} hint="últimos 6 meses" />
          </div>
        </div>
      </section>

      {/* KPIs secundários */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiMini icon={<Clock className="h-4 w-4" />} label="A receber" value={pendente} tone="amber" hint="liberado após embarque" />
        <KpiMini icon={<TrendingUp className="h-4 w-4" />} label="Lifetime recebido" value={total} tone="sky" hint="total já pago" />
        <KpiMini icon={<Calendar className="h-4 w-4" />} label="Este mês" value={stats?.monthCommission ?? 0} tone="emerald" hint={`${stats?.closedThisMonth ?? 0} vendas`} />
      </section>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Evolução · últimos 6 meses</CardTitle>
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="commBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} className="capitalize" />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [fmtBRLshort(v), "Comissão"]}
                />
                <Bar dataKey="value" fill="url(#commBar)" radius={[8, 8, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Extrato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extrato detalhado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-16 text-sm text-muted-foreground">Carregando...</div>
          ) : items && items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium text-right">Valor da venda</th>
                    <th className="px-4 py-2 font-medium text-right">%</th>
                    <th className="px-4 py-2 font-medium text-right">Comissão</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const st = statusBadge[c.status] || { label: c.status, cls: "bg-muted" };
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right">{fmtBRL(Number(c.sale_value || 0))}</td>
                        <td className="px-4 py-3 text-right text-xs">{Number(c.commission_percent || 0)}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtBRL(Number(c.commission_value || 0))}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${st.cls} border-transparent`}>{st.label}</Badge></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{c.paid_at ? new Date(c.paid_at).toLocaleDateString("pt-BR") : "·"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-sm text-muted-foreground border-t border-dashed">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground mb-1">Nenhuma comissão por aqui ainda</p>
              <p className="max-w-md mx-auto text-xs leading-relaxed">
                Quando alguém fechar uma viagem usando seu link, o valor aparece aqui com data, cliente e status do pagamento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-emerald-950/5 border-emerald-900/15">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-4 w-4 text-emerald-800 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Como funciona:</strong> a comissão é confirmada quando o cliente paga e liberada para saque após o embarque. PIX em até 1 dia útil depois da solicitação.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatPill({ label, value, hint, icon }: { label: string; value: string; hint: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-sm p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/55 flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="text-xl sm:text-2xl font-semibold mt-1.5">{value}</p>
      <p className="text-[10px] text-white/45 mt-0.5">{hint}</p>
    </div>
  );
}

function KpiMini({ icon, label, value, tone, hint }: { icon: React.ReactNode; label: string; value: number; tone: "emerald" | "amber" | "sky"; hint: string }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    sky: "bg-sky-500/10 text-sky-700",
  };
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-md grid place-items-center ${tones[tone]}`}>{icon}</div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-semibold mt-2">
          <CountUp value={value} prefix="R$ " decimals={0} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
      </CardContent>
    </Card>
  );
}
