import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users2, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";

const fmtBRL = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const statusLabels: Record<string, { label: string; tone: string }> = {
  click: { label: "Clique", tone: "bg-slate-500/10 text-slate-700" },
  lead: { label: "Novo", tone: "bg-sky-500/10 text-sky-700" },
  negotiating: { label: "Em negociação", tone: "bg-amber-500/10 text-amber-700" },
  converted: { label: "Fechado", tone: "bg-emerald-500/10 text-emerald-700" },
  lost: { label: "Perdido", tone: "bg-rose-500/10 text-rose-700" },
};

export default function VitrineIndicacoes() {
  const { data: affiliate } = useAffiliateProfile();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["affiliate-referrals", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_referrals")
        .select("id, ref_code, lead_name, lead_phone, lead_email, product_slug, status, estimated_commission, source_page, created_at, converted_at")
        .eq("affiliate_id", affiliate!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const counts: Record<string, number> = { click: 0, lead: 0, negotiating: 0, converted: 0, lost: 0 };
  for (const r of referrals || []) counts[r.status] = (counts[r.status] || 0) + 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl">Minhas indicações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cada lead que você enviou pra Nath aparece aqui com o status atualizado.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/vitrine/materiais">Gerar novo link <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(statusLabels).map(([k, s]) => (
          <Card key={k} className="border-border/60">
            <CardContent className="p-3 flex flex-col items-center text-center">
              <Badge variant="outline" className={`text-[10px] mb-1 ${s.tone} border-transparent`}>{s.label}</Badge>
              <span className="text-xl font-semibold">{counts[k] || 0}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline de indicações</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {isLoading ? (
            <div className="text-center py-16 text-sm text-muted-foreground">Carregando...</div>
          ) : (referrals && referrals.length > 0) ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Lead</th>
                    <th className="px-4 py-2 font-medium">Pacote</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Comissão estimada</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => {
                    const st = statusLabels[r.status] || { label: r.status, tone: "bg-muted text-foreground" };
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.lead_name || <span className="italic text-muted-foreground">Visitante anônimo</span>}</div>
                          {r.lead_phone && <div className="text-xs text-muted-foreground">{r.lead_phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.product_slug || "·"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] ${st.tone} border-transparent`}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          {r.estimated_commission ? fmtBRL(Number(r.estimated_commission)) : "·"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-sm text-muted-foreground border-t border-dashed">
              <Users2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground mb-1">Nenhuma indicação registrada ainda</p>
              <p className="max-w-md mx-auto text-xs leading-relaxed">
                Compartilhe seu link de afiliado e, assim que alguém clicar e iniciar uma conversa
                com a Nath, o lead aparece aqui em tempo real.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
