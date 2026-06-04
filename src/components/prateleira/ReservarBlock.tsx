import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface ReservarBlockProps {
  productId: string;
  productTitle: string;
  affiliateRef?: string | null;
  source?: "catalogo_publico" | "link_avulso";
  onBeforeRedirect?: () => void;
}

export default function ReservarBlock({
  productId, productTitle, affiliateRef, source = "catalogo_publico", onBeforeRedirect,
}: ReservarBlockProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleReservar = async () => {
    setLoading(true);
    try {
      onBeforeRedirect?.();
      const { data, error } = await supabase.functions.invoke("checkout-draft", {
        body: {
          action: "create",
          product_id: productId,
          affiliate_ref: affiliateRef ?? undefined,
          source,
        },
      });
      if (error) throw error;
      const orderId = (data as { order_id?: string })?.order_id;
      if (!orderId) throw new Error("Pedido não criado");
      navigate(`/checkout/${orderId}/resumo`);
    } catch (e: any) {
      toast.error("Não foi possível iniciar a reserva", {
        description: e?.message ?? "Tente novamente em instantes.",
      });
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <h3 className="font-serif text-base">Reservar agora</h3>
      </div>
      <p className="text-[12px] text-muted-foreground mb-4">
        Você confirma passageiros, dados e forma de pagamento nos próximos passos · sem compromisso até pagar.
      </p>

      <motion.button
        onClick={handleReservar}
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="relative overflow-hidden w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Abrindo reserva…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Reservar</>
        )}
      </motion.button>
      <div className="text-[10px] text-center text-muted-foreground mt-2 truncate">{productTitle}</div>
    </Card>
  );
}
