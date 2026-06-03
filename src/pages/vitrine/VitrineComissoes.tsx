import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock, TrendingUp, Download, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";
import { toast } from "sonner";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-700" },
  available: { label: "Disponível", cls: "bg-emerald-500/10 text-emerald-700" },
  paid: { label: "Pago", cls: "bg-sky-500/10 text-sky-700" },
  canceled: { label: "Cancelado", cls: "bg-rose-500/10 text-rose-700" },
};

export default function VitrineComissoes() {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl">Comissões</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe o que você já recebeu e o que está pra cair no seu PIX.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <SaldoCard
          icon={<Wallet className="h-4 w-4" />}
          label="Saldo disponível"
          value={fmtBRL(disponivel)}
          tone="emerald"
          cta={
            <Button
              size="sm"
              disabled={disponivel <= 0 || !affiliate?.pix_key}
              className="w-full"
              onClick={() => toast.info("Solicitação enviada · a Nath confirma o PIX em até 1 dia útil.")}
            >
              {!affiliate?.pix_key ? "Cadastre seu PIX antes" : "Solicitar saque"}
            </Button>
          }
        />
        <SaldoCard
          icon={<Clock className="h-4 w-4" />}
          label="A receber (pendente)"
          value={fmtBRL(pendente)}
          tone="amber"
          cta={<p className="text-[11px] text-muted-foreground">Liberado após o embarque do passageiro.</p>}
        />
        <SaldoCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total recebido (lifetime)"
          value={fmtBRL(total)}
          tone="sky"
          cta={
            <Button variant="outline" size="sm" disabled className="w-full gap-1.5">
              <Download className="h-3.5 w-3.5" /> Exportar extrato
            </Button>
          }
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extrato detalhado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-16 text-sm text-muted-foreground">Carregando...</div>
          ) : (items && items.length > 0) ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium text-right">Valor da venda</th>
                    <th className="px-4 py-2 font-medium text-right">% Comissão</th>
                    <th className="px-4 py-2 font-medium text-right">Comissão</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const st = statusBadge[c.status] || { label: c.status, cls: "bg-muted" };
                    return (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
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
                Quando alguém fechar uma viagem usando seu link, o valor aparece aqui com data,
                cliente, pacote e status do pagamento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-emerald-950/5 border-emerald-900/15">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-4 w-4 text-emerald-800 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Como funciona o pagamento:</strong> a comissão é
            confirmada quando o cliente paga a viagem e liberada para saque após o embarque. O
            PIX cai em até 1 dia útil depois da solicitação.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SaldoCard({ icon, label, value, tone, cta }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "amber" | "sky"; cta: React.ReactNode; }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    sky: "bg-sky-500/10 text-sky-700",
  };
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-md grid place-items-center ${tones[tone]}`}>{icon}</div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {cta}
      </CardContent>
    </Card>
  );
}
