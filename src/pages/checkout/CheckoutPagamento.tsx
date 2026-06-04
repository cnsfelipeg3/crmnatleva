import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ShieldCheck, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CheckoutCtx } from "@/components/checkout/CheckoutLayout";
import { formatMoneyBR } from "@/lib/prateleira/payment-plan";

const INTENT_LABEL: Record<string, string> = {
  pix: "Pix à vista",
  cartao: "Cartão de crédito",
  entrada: "Entrada agora · saldo combinado depois",
};

export default function CheckoutPagamento() {
  const { orderId, draft } = useOutletContext<CheckoutCtx>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const currency = draft.currency || "BRL";
  const amount = (draft.amount_cents || 0) / 100;
  const balance = (draft.balance_cents || 0) / 100;
  const passengers = Array.isArray(draft.passengers) ? draft.passengers : [];

  const goToPayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("infinitepay-create-link", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      const url = (data as { checkout_url?: string })?.checkout_url;
      if (!url) throw new Error("Link de pagamento não retornado");
      window.location.href = url;
    } catch (e: any) {
      toast.error("Não foi possível abrir o checkout", {
        description: e?.message ?? "Tente novamente em instantes.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-xl mb-1">Resumo final</h1>
        <p className="text-sm text-muted-foreground">
          Confira tudo antes de ir para o pagamento.
        </p>
      </div>

      <Card className="p-5 sm:p-6 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pacote</div>
          <div className="font-serif text-lg">{draft.product?.title}</div>
          <div className="text-sm text-muted-foreground">
            {[draft.product?.destination, draft.product?.destination_country].filter(Boolean).join(" · ")}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Passageiros</div>
          <div className="text-sm space-y-0.5">
            {passengers.length === 0 && <div className="text-muted-foreground">Nenhum informado</div>}
            {passengers.map((p: any, i: number) => (
              <div key={i}>{i + 1}. {p.full_name}</div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Forma de pagamento</div>
          <div className="text-sm">{INTENT_LABEL[draft.payment_intent ?? "cartao"] ?? draft.payment_intent}</div>
        </div>

        <div className="border-t border-border pt-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {draft.is_entry_only ? "Você vai pagar agora" : "Valor total"}
            </div>
            <div className="text-2xl font-bold tabular-nums">{formatMoneyBR(amount, currency)}</div>
            {draft.is_entry_only && balance > 0 && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Saldo a combinar: <span className="font-semibold text-foreground">{formatMoneyBR(balance, currency)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" /> Checkout seguro
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(`/checkout/${orderId}/termos`)} disabled={loading}>
          Voltar
        </Button>
        <Button onClick={goToPayment} disabled={loading} className="flex-1 h-12 font-semibold bg-emerald-600 hover:bg-emerald-700">
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Abrindo pagamento…</>
            : <><CreditCard className="w-4 h-4 mr-2" /> Ir para pagamento</>
          }
        </Button>
      </div>
      <p className="text-[10px] text-center text-muted-foreground">
        Você será redirecionado para a InfinitePay para concluir o pagamento com Pix ou cartão.
      </p>
    </div>
  );
}
