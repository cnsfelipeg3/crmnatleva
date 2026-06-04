import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CheckoutDraft {
  order_id: string;
  status: string;
  checkout_step: string;
  product: any;
  pax: number | null;
  payment_intent: "pix" | "cartao" | "entrada" | null;
  amount_cents: number | null;
  unit_price_cents: number | null;
  is_entry_only: boolean | null;
  balance_cents: number | null;
  currency: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_address: any;
  passengers: any[] | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
}

export function useCheckoutDraft(orderId: string | undefined) {
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("checkout-draft", {
      body: { action: "get", order_id: orderId },
    });
    if (error) {
      setError(error.message || "Falha ao carregar pedido");
    } else {
      setDraft((data as any)?.draft ?? null);
      setRedirectTo((data as any)?.redirect ?? null);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { reload(); }, [reload]);

  const update = useCallback(async (patch: Record<string, unknown>) => {
    if (!orderId) throw new Error("Pedido inválido");
    const { data, error } = await supabase.functions.invoke("checkout-draft", {
      body: { action: "update", order_id: orderId, patch },
    });
    if (error) throw new Error(error.message || "Falha ao salvar");
    const next = (data as any)?.draft ?? null;
    if (next) setDraft(next);
    return next as CheckoutDraft | null;
  }, [orderId]);

  return { draft, loading, error, redirectTo, reload, update, setDraft };
}
