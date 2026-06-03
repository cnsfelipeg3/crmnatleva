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
import WithdrawDialog from "@/components/vitrine/WithdrawDialog";
import { useNavigate } from "react-router-dom";
import { smartCapitalizeName } from "@/lib/nameUtils";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Package, User2, Search } from "lucide-react";

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
  const navigate = useNavigate();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);
  const { data: series = [] } = useAffiliateMonthlyCommissions(affiliate?.id, 6);

  const { data: items, isLoading } = useQuery({
    queryKey: ["affiliate-commissions-list", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select(`
          id, sale_value, commission_percent, commission_value, status, created_at, paid_at, available_at, payment_reference,
          product:experience_products!affiliate_commissions_product_id_fkey(id, title, slug),
          referral:affiliate_referrals!affiliate_commissions_referral_id_fkey(id, lead_name, lead_email, lead_phone)
        `)
        .eq("affiliate_id", affiliate!.id)
        .order("created_at", { ascending: false });
      if (error) {
        // Fallback sem joins se a FK não estiver explícita
        const fb = await supabase
          .from("affiliate_commissions")
          .select("id, sale_value, commission_percent, commission_value, status, created_at, paid_at, available_at, payment_reference, product_id, referral_id")
          .eq("affiliate_id", affiliate!.id)
          .order("created_at", { ascending: false });
        if (fb.error) throw fb.error;
        const ids = Array.from(new Set((fb.data || []).map((r: any) => r.product_id).filter(Boolean)));
        const refIds = Array.from(new Set((fb.data || []).map((r: any) => r.referral_id).filter(Boolean)));
        const [{ data: prods }, { data: refs }] = await Promise.all([
          ids.length ? supabase.from("experience_products").select("id, title, slug").in("id", ids) : Promise.resolve({ data: [] as any[] }),
          refIds.length ? supabase.from("affiliate_referrals").select("id, lead_name, lead_email, lead_phone").in("id", refIds) : Promise.resolve({ data: [] as any[] }),
        ]);
        const pMap = new Map((prods || []).map((p: any) => [p.id, p]));
        const rMap = new Map((refs || []).map((r: any) => [r.id, r]));
        return (fb.data || []).map((r: any) => ({ ...r, product: pMap.get(r.product_id), referral: rMap.get(r.referral_id) }));
      }
      return data || [];
    },
  });

  const [search, setSearch] = useState("");
  const filtered = (items || []).filter((c: any) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (c.product?.title || "").toLowerCase().includes(s) ||
      (c.referral?.lead_name || "").toLowerCase().includes(s)
    );
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
              disabled={!affiliate?.pix_key ? false : disponivel <= 0}
              onClick={() => {
                if (!affiliate?.pix_key) {
                  navigate("/vitrine/perfil");
                  return;
                }
                setWithdrawOpen(true);
              }}
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
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Relatório detalhado de vendas</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Pacote vendido · cliente · valor da venda · sua comissão
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar pacote ou cliente..."
                  className="h-9 pl-8 w-full sm:w-64 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const rows = filtered.map((c: any) => ({
                    data: new Date(c.created_at).toLocaleDateString("pt-BR"),
                    pacote: c.product?.title || "—",
                    cliente: smartCapitalizeName(c.referral?.lead_name) || "—",
                    contato: c.referral?.lead_email || c.referral?.lead_phone || "—",
                    valor_venda: Number(c.sale_value || 0).toFixed(2),
                    percentual: Number(c.commission_percent || 0),
                    comissao: Number(c.commission_value || 0).toFixed(2),
                    status: statusBadge[c.status]?.label || c.status,
                    pago_em: c.paid_at ? new Date(c.paid_at).toLocaleDateString("pt-BR") : "",
                  }));
                  const header = Object.keys(rows[0] || { data: "" }).join(";");
                  const body = rows
                    .map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
                    .join("\n");
                  const csv = `${header}\n${body}`;
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `comissoes_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={!filtered.length}
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-16 text-sm text-muted-foreground">Carregando...</div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                    <th className="px-4 py-2.5 font-medium">Data</th>
                    <th className="px-4 py-2.5 font-medium">Pacote vendido</th>
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium text-right">Valor da venda</th>
                    <th className="px-4 py-2.5 font-medium text-right">%</th>
                    <th className="px-4 py-2.5 font-medium text-right">Sua comissão</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any) => {
                    const st = statusBadge[c.status] || { label: c.status, cls: "bg-muted" };
                    const clientName = smartCapitalizeName(c.referral?.lead_name);
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 shrink-0 rounded-md bg-emerald-500/10 grid place-items-center">
                              <Package className="h-3.5 w-3.5 text-emerald-700" />
                            </div>
                            <span className="font-medium truncate max-w-[260px]" title={c.product?.title || ""}>
                              {c.product?.title || <span className="text-muted-foreground italic">Pacote removido</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {clientName ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 shrink-0 rounded-full bg-sky-500/10 grid place-items-center text-[10px] font-bold text-sky-700">
                                {clientName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{clientName}</p>
                                {c.referral?.lead_email && (
                                  <p className="text-[10px] text-muted-foreground truncate">{c.referral.lead_email}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              <User2 className="h-3 w-3" /> Cliente não identificado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{fmtBRL(Number(c.sale_value || 0))}</td>
                        <td className="px-4 py-3 text-right text-xs">{Number(c.commission_percent || 0)}%</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">{fmtBRL(Number(c.commission_value || 0))}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] ${st.cls} border-transparent`}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {c.paid_at ? new Date(c.paid_at).toLocaleDateString("pt-BR") : "·"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/20">
                  <tr className="text-xs font-medium">
                    <td className="px-4 py-2.5" colSpan={3}>
                      {filtered.length} venda{filtered.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {fmtBRL(filtered.reduce((s: number, c: any) => s + Number(c.sale_value || 0), 0))}
                    </td>
                    <td />
                    <td className="px-4 py-2.5 text-right text-emerald-700">
                      {fmtBRL(filtered.reduce((s: number, c: any) => s + Number(c.commission_value || 0), 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-sm text-muted-foreground border-t border-dashed">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground mb-1">
                {search ? "Nenhum resultado pra essa busca" : "Nenhuma comissão por aqui ainda"}
              </p>
              <p className="max-w-md mx-auto text-xs leading-relaxed">
                {search
                  ? "Tenta um nome de pacote ou cliente diferente."
                  : "Quando alguém fechar uma viagem usando seu link, o valor aparece aqui com data, cliente e status do pagamento."}
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
